// SPDX-License-Identifier: EUPL-1.2 OR AGPL-3.0-or-later
type t = {
  pieceId: PwId.t,
  position: PwShell.slot,
  orientation: PwOrientation.t,
}

let make = (pieceId, position, orientation) => {pieceId, position, orientation}
let pieceId = p => p.pieceId
let position = p => p.position
let orientation = p => p.orientation

let positionMatchesHome = (p, home) =>
  PwOrientation.apply(p.orientation, PwShell.toVec(home)) == PwShell.toVec(p.position)
