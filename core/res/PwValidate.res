type profile = FaceTurns

type invariant = {name: string, holds: bool}

type unknownReason =
  | StructurallyInvalid
  | NoMethod
  | CertificateIllegalMove
  | CertificateMismatch
  | ProfileOutsidePolicy
  | CertificateOutsideProfile

type reachability =
  | VerifiedByReplay(array<PwMove.t>)
  | VerifiedComplete(string)
  | Disproved(string)
  | Unknown(unknownReason)

type report = {
  structural: result<unit, PwCodec.error>,
  profile: option<profile>,
  invariants: array<invariant>,
  reachability: reachability,
}

let completeMethod = "face-turn-invariants-v1"

// ---- piece geometry -----------------------------------------------------------------------------

let sign = x =>
  if x > 0 {
    1
  } else if x < 0 {
    -1
  } else {
    0
  }

let unit = (axis, s): PwShell.vec =>
  switch axis {
  | 0 => {x: s, y: 0, z: 0}
  | 1 => {x: 0, y: s, z: 0}
  | _ => {x: 0, y: 0, z: s}
  }

let component = (v: PwShell.vec, axis) =>
  switch axis {
  | 0 => v.x
  | 1 => v.y
  | _ => v.z
  }

// The axis (0 = x, 1 = y, 2 = z) of a signed unit vector.
let axisOf = (v: PwShell.vec) =>
  if v.x != 0 {
    0
  } else if v.y != 0 {
    1
  } else {
    2
  }

let cross = (a: PwShell.vec, b: PwShell.vec): PwShell.vec => {
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
}

type entry = {home: PwShell.vec, position: PwShell.vec, orientation: PwOrientation.t}

// Exposed faces of the home slot: corner 3, edge 2, center 1.
let exposedCount = (n, v: PwShell.vec) => {
  let top = n - 1
  [v.x, v.y, v.z]->Array.filter(c => abs(c) == top)->Array.length
}

let entries = (definition, state) => {
  let n = PwShell.sizeToInt(PwCodec.size(definition))
  let homes = Map.make()
  PwCodec.pieces(definition)->Array.forEach(p => homes->Map.set(PwId.toString(p.id), p.home))
  let all = PwCodec.poses(state)->Array.map(pose => {
    let home = switch homes->Map.get(PwId.toString(PwPose.pieceId(pose))) {
    | Some(h) => PwShell.toVec(h)
    | None => panic("PwValidate: state piece outside the definition")
    }
    {
      home,
      position: PwShell.toVec(PwPose.position(pose)),
      orientation: PwPose.orientation(pose),
    }
  })
  (n, all)
}

// Corner twist in 0..2: the position of the world axis of the home U/D sticker in the counterclockwise
// order (seen from outside) of the three axes of the slot, starting from y.
let cornerTwist = e => {
  let sticker = unit(1, sign(e.home.y))
  let a = axisOf(PwOrientation.apply(e.orientation, sticker))
  let chirality = sign(e.position.x) * sign(e.position.y) * sign(e.position.z)
  let order = chirality > 0 ? [1, 2, 0] : [1, 0, 2]
  order->Array.findIndex(axis => axis == a)
}

// Edge flip 0 or 1: the primary sticker (the U/D sticker, else the F/B sticker) is good when its world
// axis is the primary axis of the slot.
let edgeFlip = e => {
  let primary = h => h.PwShell.y != 0 ? 1 : 2
  let axis = primary(e.home)
  let sticker = unit(axis, sign(component(e.home, axis)))
  let a = axisOf(PwOrientation.apply(e.orientation, sticker))
  a == primary(e.position) ? 0 : 1
}

// Face-up table (data model): (outward normal, up) per face.
let faceUp = (normal: PwShell.vec): PwShell.vec =>
  if normal.y == 1 {
    {x: 0, y: 0, z: -1}
  } else if normal.y == -1 {
    {x: 0, y: 0, z: 1}
  } else {
    {x: 0, y: 1, z: 0}
  }

let unitOf = (v: PwShell.vec): PwShell.vec => {x: sign(v.x), y: sign(v.y), z: sign(v.z)}

// Center twist in 0..3 (ADR 0008, item 5): clockwise quarter turns, seen from outside, from the
// reference up of the center's current face to the image of the home reference.
let centerTwist = e => {
  let normal = unitOf(e.position)
  let reference = faceUp(normal)
  let target = PwOrientation.apply(e.orientation, faceUp(unitOf(e.home)))
  let current = ref(reference)
  let k = ref(0)
  while current.contents != target && k.contents < 4 {
    current := cross(current.contents, normal)
    k := k.contents + 1
  }
  k.contents
}

// Parity (0 or 1) of the permutation that sends the home slot of each piece to its current slot.
let parity = (es: array<entry>) => {
  let homes = es->Array.map(e => e.home)->Array.toSorted((a, b) => (compare(a, b) :> float))
  let indexOf = v => homes->Array.findIndex(h => h == v)
  let image = es->Array.map(e => (indexOf(e.home), indexOf(e.position)))
  let perm = Array.make(~length=homes->Array.length, 0)
  image->Array.forEach(((from, to)) => perm->Array.setUnsafe(from, to))
  let seen = Array.make(~length=perm->Array.length, false)
  let cycles = ref(0)
  perm->Array.forEachWithIndex((_, start) =>
    if !(seen->Array.getUnsafe(start)) {
      cycles := cycles.contents + 1
      let i = ref(start)
      while !(seen->Array.getUnsafe(i.contents)) {
        seen->Array.setUnsafe(i.contents, true)
        i := perm->Array.getUnsafe(i.contents)
      }
    }
  )
  mod(perm->Array.length - cycles.contents, 2)
}

let sum = (es, f) => es->Array.reduce(0, (acc, e) => acc + f(e))

let invariantsOf = (n, es: array<entry>, profile) => {
  let ofKind = k => es->Array.filter(e => exposedCount(n, e.home) == k)
  let corners = ofKind(3)
  let base = [{name: "corner-twist-sum", holds: mod(sum(corners, cornerTwist), 3) == 0}]
  switch profile {
  | Some(FaceTurns) if n == 3 =>
    let edges = ofKind(2)
    let centers = ofKind(1)
    let cornerParity = parity(corners)
    Array.concat(
      base,
      [
        {name: "edge-flip-sum", holds: mod(sum(edges, edgeFlip), 2) == 0},
        {name: "corner-edge-parity", holds: cornerParity == parity(edges)},
        {
          name: "center-twist-parity",
          holds: mod(sum(centers, centerTwist), 2) == cornerParity,
        },
        {name: "center-positions-fixed", holds: centers->Array.every(e => e.position == e.home)},
      ],
    )
  | _ => base
  }
}

// ---- replay certificates --------------------------------------------------------------------------

let legalMove = (definition, m) => {
  let n = PwShell.sizeToInt(PwCodec.size(definition))
  if PwShell.sizeToInt(PwMove.size(m)) != n {
    false
  } else {
    switch PwCodec.movePolicy(definition) {
    | Any => true
    | OuterWide =>
      let layers = PwMove.layers(m)
      let w = layers->Array.length
      let first = layers->Array.getUnsafe(0)
      let contiguous = layers->Array.everyWithIndex((l, i) => l == first + i)
      (w == 1 && (first == 0 || first == n - 1)) ||
        (w >= 2 && w <= n - 1 && contiguous && (first == 0 || first + w == n))
    }
  }
}

type replay = Matches | Illegal | Mismatch

let replay = (definition, state, certificate) =>
  if !(certificate->Array.every(m => legalMove(definition, m))) {
    Illegal
  } else {
    let poses =
      certificate->Array.reduce(PwCodec.poses(PwCodec.homeState(definition)), (acc, m) =>
        acc->Array.map(p => PwMove.applyToPose(m, p))
      )
    switch PwCodec.stateOfPoses(definition, poses) {
    | Ok(s) if PwCodec.encodeState(s) == PwCodec.encodeState(state) => Matches
    | _ => Mismatch
    }
  }

// ---- assessment -----------------------------------------------------------------------------------

// The profile is within the policy when every move the definition permits belongs to the profile's move
// set. FaceTurns is the six outer face turns: the policy outer-wide at N=2 permits exactly those (up to the
// whole-cube rotation that turning the opposite face adds); at N>=3 it permits wide moves too, and the
// policy any permits every selection (at N=2 the policy any is outside the profile although the whole-cube
// rotation there is R L'; this stays conservative: unknown).
let profileWithinPolicy = (definition, profile) =>
  switch profile {
  | None => true
  | Some(FaceTurns) =>
    PwShell.sizeToInt(PwCodec.size(definition)) == 2 && PwCodec.movePolicy(definition) == OuterWide
  }

// A move of the profile FaceTurns: one outer layer.
let inProfile = (n, m) => {
  let layers = PwMove.layers(m)
  layers->Array.length == 1 &&
    (layers->Array.getUnsafe(0) == 0 || layers->Array.getUnsafe(0) == n - 1)
}

let assessWith = (definition, state, profile, certificate, checkPolicy) =>
  switch PwCodec.decodeState(definition, PwCodec.encodeState(state)) {
  | Error(e) => {
      structural: Error(e),
      profile,
      invariants: [],
      reachability: Unknown(StructurallyInvalid),
    }
  | Ok(_) =>
    let (n, es) = entries(definition, state)
    // Profile invariants apply only when the profile covers every permitted move; the corner twist sum
    // holds for every layer selection and always applies.
    let applies = !checkPolicy || profileWithinPolicy(definition, profile)
    let invariants = invariantsOf(n, es, applies ? profile : None)
    let byInvariants = switch invariants->Array.find(i => !i.holds) {
    | Some(i) => Some(Disproved(i.name))
    | None =>
      switch profile {
      | Some(FaceTurns) if applies && (n == 2 || n == 3) => Some(VerifiedComplete(completeMethod))
      | _ => None
      }
    }
    let outside = switch (profile, certificate) {
    | (Some(FaceTurns), Some(moves)) if applies => !(moves->Array.every(m => inProfile(n, m)))
    | _ => false
    }
    let reachability = switch certificate {
    // The certificate leaves the profile: the claimed profile does not describe the sequence.
    | _ if outside => Unknown(CertificateOutsideProfile)
    // The profile does not cover the policy: a valid replay under the policy still proves reachability;
    // the profile invariants are suppressed.
    | Some(moves) if !applies =>
      switch replay(definition, state, moves) {
      | Matches => VerifiedByReplay(moves)
      | _ => byInvariants->Option.getOr(Unknown(ProfileOutsidePolicy))
      }
    | _ if !applies => byInvariants->Option.getOr(Unknown(ProfileOutsidePolicy))
    | Some(moves) =>
      switch replay(definition, state, moves) {
      | Matches => VerifiedByReplay(moves)
      | Illegal => byInvariants->Option.getOr(Unknown(CertificateIllegalMove))
      | Mismatch => byInvariants->Option.getOr(Unknown(CertificateMismatch))
      }
    | None => byInvariants->Option.getOr(Unknown(NoMethod))
    }
    {structural: Ok(), profile, invariants, reachability}
  }

let assess = (definition, state, profile, certificate) =>
  assessWith(definition, state, profile, certificate, true)

let assessAssuming = (definition, state, profile, certificate) =>
  assessWith(definition, state, profile, certificate, false)
