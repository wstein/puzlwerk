// Canonical move AST (data model, "Moves"): axis, sorted unique nonempty layer indices 0..N-1 and
// signed quarter turns -1, 1 or 2 about the positive axis (right-hand). Layer i has coordinate
// 2i-(N-1). The AST represents every layer selection; which selections a caller accepts is policy
// (Q2: outer faces and wide moves for text notation) and lives outside this module.
type axis = X | Y | Z
type t
type error = NoLayers | LayerOutOfRange | NotSortedUnique | BadTurns
let make: (PwShell.size, axis, array<int>, int) => result<t, error>
let size: t => PwShell.size
let axis: t => axis
let layers: t => array<int>
let turns: t => int
let inverse: t => t
// The rotation matrix R applied to the selected poses.
let rotation: t => PwOrientation.t
// Whether the move selects a piece at this slot (by pre-move position).
let selects: (t, PwShell.slot) => bool
// Selected poses become (Rp, RO); all others are unchanged.
let applyToPose: (t, PwPose.t) => PwPose.t
