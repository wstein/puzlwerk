// A piece pose: stable piece ID, current shell slot p and orientation O (ADR 0008).
type t
let make: (PwId.t, PwShell.slot, PwOrientation.t) => t
let pieceId: t => PwId.t
let position: t => PwShell.slot
let orientation: t => PwOrientation.t
// ADR 0008, position rule: p = O.h for the piece's home slot h.
let positionMatchesHome: (t, PwShell.slot) => bool
