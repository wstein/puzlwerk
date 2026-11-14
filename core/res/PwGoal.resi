// Goal predicates over a validated state (data model, "Goals and symmetry"). A goal is data: a closed
// tree of nodes plus the set of global frames under which the whole tree may be matched. Evaluation is a
// pure, deterministic function of definition, state and goal. Symmetry changes only what a goal accepts,
// never a state or a legal move.

// Quarter turns about the declared sticker normal: C1 = {0}, C2 = {0,2}, C4 = {0,1,2,3}. C1 is exact
// (full turn only, modulo 360 degrees), never "any orientation".
type symmetry = C1 | C2 | C4

type rec node =
  | All(array<node>)
  | Any(array<node>)
  // Identity and destination only.
  | PieceAt(PwId.t, PwShell.slot)
  // Destination and O = target.h for some h in the piece-local subgroup. The exact pose is [identity].
  | PiecePose(PwId.t, PwShell.slot, PwOrientation.t, array<PwOrientation.t>)
  // Sticker ID, destination of its owner, target world normal and up, symmetry about the target normal.
  | StickerAt(PwId.t, PwShell.slot, PwShell.vec, PwShell.vec, symmetry)

type goal
type error =
  | BadFrames
  | UnknownPiece
  | UnknownSticker
  | BadSlot
  | BadVector
  | BadSubgroup
  | BadSymmetry

// makeGoal(definition, appearance, frames, root). The appearance entries declare the design symmetry
// of stickers (appearance-v1); a sticker without an entry is C1 and no goal may claim more than it
// declares. The frames are the allowed global rotations: a subgroup of the 24 proper rotations, given as
// a list that contains the identity and is closed under composition; [identity] means the fixed frame.
// Every piece subgroup is such a group and maps the stickers of its piece onto themselves (normal, up and
// color). All checks run before any state is looked at.
let makeGoal: (
  PwCodec.definition,
  array<(PwId.t, symmetry)>,
  array<PwOrientation.t>,
  node,
) => result<goal, error>

// Empty All is true, empty Any is false. One common global rotation from the frames of the goal must
// transform the complete target into a match; nodes never choose their frames separately.
let evaluate: (PwCodec.definition, PwCodec.state, goal) => bool
