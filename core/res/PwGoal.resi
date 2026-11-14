// Goal predicates over a validated state (data model, "Goals and symmetry"). Goals are data; every
// evaluation is a pure, deterministic function of the state. A node naming a piece that the state does
// not contain is false.
type rec node =
  | All(array<node>)
  | Any(array<node>)
  // Identity and destination only.
  | PieceAt(PwId.t, PwShell.slot)
  // Destination and the exact orientation O = target.
  | PiecePose(PwId.t, PwShell.slot, PwOrientation.t)

// Empty All is true, empty Any is false.
let evaluate: (PwCodec.state, node) => bool
