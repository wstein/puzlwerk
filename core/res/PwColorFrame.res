// SPDX-License-Identifier: AGPL-3.0-or-later
// Face directions and rotation use the canonical Core coordinate frame.
let directions: array<PwShell.vec> = [
  {x: 0, y: 1, z: 0},
  {x: 1, y: 0, z: 0},
  {x: 0, y: 0, z: 1},
  {x: 0, y: -1, z: 0},
  {x: -1, y: 0, z: 0},
  {x: 0, y: 0, z: -1},
]
let advance = (frame: array<string>, move: PwMove.t) => {
  let n = PwShell.sizeToInt(PwMove.size(move))
  let layers = PwMove.layers(move)
  if layers->Array.length != n && !(mod(n, 2) == 1 && layers->Array.includes(n / 2)) {
    Array.copy(frame)
  } else if frame->Array.length != 6 {
    Array.copy(frame)
  } else {
    let inverse = PwOrientation.transpose(PwMove.rotation(move))
    directions->Array.map(target => {
      let source = PwOrientation.apply(inverse, target)
      let index = directions->Array.findIndex(v => v == source)
      if index < 0 {
        panic("PwColorFrame: non-axis rotation")
      } else {
        frame->Array.getUnsafe(index)
      }
    })
  }
}
