type rec node =
  | All(array<node>)
  | Any(array<node>)
  | PieceAt(PwId.t, PwShell.slot)
  | PiecePose(PwId.t, PwShell.slot, PwOrientation.t)

let poseOf = (state, pieceId) =>
  PwCodec.poses(state)->Array.find(p => PwId.equal(PwPose.pieceId(p), pieceId))

let sameSlot = (a, b) => PwShell.toVec(a) == PwShell.toVec(b)

let rec evaluate = (state, node) =>
  switch node {
  | All(nodes) => nodes->Array.every(n => evaluate(state, n))
  | Any(nodes) => nodes->Array.some(n => evaluate(state, n))
  | PieceAt(pieceId, slot) =>
    switch poseOf(state, pieceId) {
    | Some(p) => sameSlot(PwPose.position(p), slot)
    | None => false
    }
  | PiecePose(pieceId, slot, orientation) =>
    switch poseOf(state, pieceId) {
    | Some(p) =>
      sameSlot(PwPose.position(p), slot) && PwOrientation.equal(PwPose.orientation(p), orientation)
    | None => false
    }
  }
