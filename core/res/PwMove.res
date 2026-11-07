type axis = X | Y | Z
type error = NoLayers | LayerOutOfRange | NotSortedUnique | BadTurns

type t = {
  size: PwShell.size,
  axis: axis,
  layers: array<int>,
  turns: int,
}

let make = (size, axis, layers, turns) => {
  let n = PwShell.sizeToInt(size)
  if layers->Array.length == 0 {
    Error(NoLayers)
  } else if layers->Array.some(i => i < 0 || i >= n) {
    Error(LayerOutOfRange)
  } else if (
    layers->Array.everyWithIndex((layer, idx) =>
      idx == 0 || layers->Array.getUnsafe(idx - 1) < layer
    ) == false
  ) {
    Error(NotSortedUnique)
  } else if turns != -1 && turns != 1 && turns != 2 {
    Error(BadTurns)
  } else {
    Ok({size, axis, layers: Array.copy(layers), turns})
  }
}

let size = m => m.size
let axis = m => m.axis
let layers = m => Array.copy(m.layers)
let turns = m => m.turns

let inverse = m => {...m, turns: m.turns == 2 ? 2 : -m.turns}

// Right-hand quarter turns about the positive axes, row-major, column j = image of e_j.
let quarter = axis =>
  switch axis {
  | X => [1, 0, 0, 0, 0, -1, 0, 1, 0]
  | Y => [0, 0, 1, 0, 1, 0, -1, 0, 0]
  | Z => [0, -1, 0, 1, 0, 0, 0, 0, 1]
  }

let orientationOf = a =>
  switch PwOrientation.make(a) {
  | Ok(o) => o
  | Error(_) => panic("PwMove: quarter turn table is not a rotation")
  }

let rotation = m => {
  let q = orientationOf(quarter(m.axis))
  switch m.turns {
  | 1 => q
  | 2 => PwOrientation.compose(q, q)
  | _ => PwOrientation.transpose(q)
  }
}

let component = (axis, v: PwShell.vec) =>
  switch axis {
  | X => v.x
  | Y => v.y
  | Z => v.z
  }

let layerOf = (m, slot) =>
  (component(m.axis, PwShell.toVec(slot)) + PwShell.sizeToInt(m.size) - 1) / 2

let selects = (m, slot) => m.layers->Array.includes(layerOf(m, slot))

let applyToPose = (m, pose) => {
  let p = PwPose.position(pose)
  if selects(m, p) {
    let r = rotation(m)
    let moved = switch PwShell.makeSlot(m.size, PwOrientation.apply(r, PwShell.toVec(p))) {
    | Ok(s) => s
    | Error(_) => panic("PwMove: a rotation left the shell")
    }
    PwPose.make(PwPose.pieceId(pose), moved, PwOrientation.compose(r, PwPose.orientation(pose)))
  } else {
    pose
  }
}
