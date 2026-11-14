type symmetry = C1 | C2 | C4

type rec node =
  | All(array<node>)
  | Any(array<node>)
  | PieceAt(PwId.t, PwShell.slot)
  | PiecePose(PwId.t, PwShell.slot, PwOrientation.t, array<PwOrientation.t>)
  | StickerAt(PwId.t, PwShell.slot, PwShell.vec, PwShell.vec, symmetry)
  | FaceColors(array<(PwShell.slot, PwShell.vec, PwId.t)>)

type goal = {root: node, frames: array<PwOrientation.t>}
type error =
  | BadFrames
  | UnknownPiece
  | UnknownSticker
  | BadSlot
  | BadVector
  | BadSubgroup
  | BadSymmetry
  | BadSample
  | MissingColor

exception Invalid(error)
let invalid = e => throw(Invalid(e))

let quarterTurns = s =>
  switch s {
  | C1 => [0]
  | C2 => [0, 2]
  | C4 => [0, 1, 2, 3]
  }

let rank = s =>
  switch s {
  | C1 => 1
  | C2 => 2
  | C4 => 4
  }

let cross = (a: PwShell.vec, b: PwShell.vec): PwShell.vec => {
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
}
let dot = (a: PwShell.vec, b: PwShell.vec) => a.x * b.x + a.y * b.y + a.z * b.z
let isUnitAxis = (v: PwShell.vec) => abs(v.x) + abs(v.y) + abs(v.z) == 1

// ---- validation ---------------------------------------------------------------------------------

let isGroup = (members: array<PwOrientation.t>) =>
  members->Array.length > 0 &&
  members->Array.some(m => PwOrientation.equal(m, PwOrientation.identity)) &&
  members->Array.every(a =>
    members->Array.every(b => {
      let product = PwOrientation.compose(a, b)
      members->Array.some(m => PwOrientation.equal(m, product))
    })
  )

let findPiece = (pieces: array<PwCodec.piece>, pieceId) =>
  pieces->Array.find(p => PwId.equal(p.id, pieceId))

let findSticker = (pieces: array<PwCodec.piece>, stickerId) =>
  pieces->Array.findMap(p =>
    p.stickers
    ->Array.find(s => PwId.equal(s.id, stickerId))
    ->Option.map(s => (p, s))
  )

let sameColor = (a: option<PwId.t>, b: option<PwId.t>) =>
  switch (a, b) {
  | (None, None) => true
  | (Some(x), Some(y)) => PwId.equal(x, y)
  | _ => false
  }

// Every member of the subgroup maps the sticker set of the piece onto itself: same normal, up and color.
let preservesStickers = (piece: PwCodec.piece, h) =>
  piece.stickers->Array.every(s => {
    let n = PwOrientation.apply(h, s.normal)
    let u = PwOrientation.apply(h, s.up)
    piece.stickers->Array.some(t => t.normal == n && t.up == u && sameColor(t.color, s.color))
  })

let checkSlot = (definition, slot) =>
  if PwShell.makeSlot(PwCodec.size(definition), PwShell.toVec(slot))->Result.isError {
    invalid(BadSlot)
  }

let declaredSymmetry = (appearance: array<(PwId.t, symmetry)>, stickerId) =>
  switch appearance->Array.find(((s, _)) => PwId.equal(s, stickerId)) {
  | Some((_, sym)) => sym
  | None => C1
  }

let rec checkNode = (definition, pieces, appearance, node) =>
  switch node {
  | All(nodes) | Any(nodes) =>
    nodes->Array.forEach(n => checkNode(definition, pieces, appearance, n))
  | PieceAt(pieceId, slot) =>
    if findPiece(pieces, pieceId) == None {
      invalid(UnknownPiece)
    }
    checkSlot(definition, slot)
  | PiecePose(pieceId, slot, _, subgroup) =>
    let piece = switch findPiece(pieces, pieceId) {
    | Some(p) => p
    | None => invalid(UnknownPiece)
    }
    checkSlot(definition, slot)
    if !isGroup(subgroup) || !(subgroup->Array.every(h => preservesStickers(piece, h))) {
      invalid(BadSubgroup)
    }
  | StickerAt(stickerId, slot, normal, up, symmetry) =>
    if findSticker(pieces, stickerId) == None {
      invalid(UnknownSticker)
    }
    checkSlot(definition, slot)
    if !isUnitAxis(normal) || !isUnitAxis(up) || dot(normal, up) != 0 {
      invalid(BadVector)
    }
    if rank(symmetry) > rank(declaredSymmetry(appearance, stickerId)) {
      invalid(BadSymmetry)
    }
  | FaceColors(samples) =>
    let n = PwShell.sizeToInt(PwCodec.size(definition))
    let seen = Map.make()
    samples->Array.forEach(((slot, normal, _)) => {
      checkSlot(definition, slot)
      if !isUnitAxis(normal) {
        invalid(BadVector)
      }

      // Outward: the slot lies on the face the normal points to.
      if dot(PwShell.toVec(slot), normal) != n - 1 {
        invalid(BadSample)
      }
      let key = JSON.stringifyAny((PwShell.toVec(slot), normal))->Option.getOr("")
      if seen->Map.has(key) {
        invalid(BadSample)
      }
      seen->Map.set(key, true)
    })
  }

type profile = FixedFrameSolved | SolvedUpToRotation

let makeGoal = (definition, appearance, frames, root) =>
  try {
    let pieces = PwCodec.pieces(definition)
    appearance->Array.forEach(((stickerId, _)) =>
      if findSticker(pieces, stickerId) == None {
        invalid(UnknownSticker)
      }
    )
    if !isGroup(frames) {
      invalid(BadFrames)
    }
    checkNode(definition, pieces, appearance, root)
    Ok({root, frames: Array.copy(frames)})
  } catch {
  | Invalid(e) => Error(e)
  }

// ---- evaluation ---------------------------------------------------------------------------------

let poseOf = (state, pieceId) =>
  PwCodec.poses(state)->Array.find(p => PwId.equal(PwPose.pieceId(p), pieceId))

let atSlot = (g, pose, slot) =>
  PwShell.toVec(PwPose.position(pose)) == PwOrientation.apply(g, PwShell.toVec(slot))

// Evaluation under one global rotation g: target positions, orientations, normals and ups are all
// rotated by g.
let rec evalNode = (pieces, state, g, node) =>
  switch node {
  | All(nodes) => nodes->Array.every(n => evalNode(pieces, state, g, n))
  | Any(nodes) => nodes->Array.some(n => evalNode(pieces, state, g, n))
  | PieceAt(pieceId, slot) =>
    switch poseOf(state, pieceId) {
    | Some(p) => atSlot(g, p, slot)
    | None => false
    }
  | PiecePose(pieceId, slot, target, subgroup) =>
    switch poseOf(state, pieceId) {
    | Some(p) =>
      atSlot(g, p, slot) &&
      subgroup->Array.some(h =>
        PwOrientation.equal(
          PwPose.orientation(p),
          PwOrientation.compose(g, PwOrientation.compose(target, h)),
        )
      )
    | None => false
    }
  | FaceColors(samples) =>
    samples->Array.every(((slot, normal, color)) => {
      let targetNormal = PwOrientation.apply(g, normal)
      PwCodec.poses(state)->Array.some(p =>
        atSlot(g, p, slot) &&
        switch findPiece(pieces, PwPose.pieceId(p)) {
        | None => false
        | Some(piece) =>
          piece.stickers->Array.some(
            s =>
              PwOrientation.apply(PwPose.orientation(p), s.normal) == targetNormal &&
                sameColor(s.color, Some(color)),
          )
        }
      )
    })
  | StickerAt(stickerId, slot, normal, up, symmetry) =>
    switch findSticker(pieces, stickerId) {
    | None => false
    | Some((piece, sticker)) =>
      switch poseOf(state, piece.id) {
      | None => false
      | Some(p) =>
        let o = PwPose.orientation(p)
        let targetNormal = PwOrientation.apply(g, normal)
        atSlot(g, p, slot) &&
        PwOrientation.apply(o, sticker.normal) == targetNormal &&
        quarterTurns(symmetry)->Array.some(k => {
          let rotated = ref(up)
          for _ in 1 to k {
            rotated := cross(normal, rotated.contents)
          }
          PwOrientation.apply(o, sticker.up) == PwOrientation.apply(g, rotated.contents)
        })
      }
    }
  }

let evaluate = (definition, state, goal) => {
  let pieces = PwCodec.pieces(definition)
  goal.frames->Array.some(g => evalNode(pieces, state, g, goal.root))
}

// ---- legacy solved profiles ---------------------------------------------------------------------

let solvedGoal = (definition, profile) =>
  try {
    let samples = PwCodec.pieces(definition)->Array.flatMap(piece =>
      piece.stickers->Array.map(s =>
        switch s.color {
        | Some(color) => (piece.home, s.normal, color)
        | None => invalid(MissingColor)
        }
      )
    )
    let frames = switch profile {
    | FixedFrameSolved => [PwOrientation.identity]
    | SolvedUpToRotation => PwOrientation.all()
    }
    Ok({root: FaceColors(samples), frames})
  } catch {
  | Invalid(e) => Error(e)
  }

let rec countSamples = node =>
  switch node {
  | All(nodes) | Any(nodes) => nodes->Array.reduce(0, (sum, n) => sum + countSamples(n))
  | FaceColors(samples) => samples->Array.length
  | PieceAt(_) | PiecePose(_) | StickerAt(_) => 0
  }

let sampleCount = goal => countSamples(goal.root)
