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
  // Color tokens at outward face slots: (slot, outward normal, color). Identity, sticker up and every
  // slot not listed are ignored; a partial goal lists only its samples.
  | FaceColors(array<(PwShell.slot, PwShell.vec, PwId.t)>)

type goal
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

// The two legacy solved conventions (spec AC03) are separate, explicitly selected profiles; an adapter
// never guesses which one a legacy consumer meant.
// - FixedFrameSolved: every outward sticker shows its home color in the fixed puzzle frame.
// - SolvedUpToRotation: the same, after one common global rotation of the 24 (all faces together).
type profile = FixedFrameSolved | SolvedUpToRotation

// The full classical solved goal: one color sample per outward sticker (6N^2), colors from the home
// state of the definition. Every sticker needs a color, else MissingColor.
let solvedGoal: (PwCodec.definition, profile) => result<goal, error>

// Number of color samples in the goal (FaceColors nodes, summed).
let sampleCount: goal => int

// Empty All is true, empty Any is false. One common global rotation from the frames of the goal must
// transform the complete target into a match; nodes never choose their frames separately.
let evaluate: (PwCodec.definition, PwCodec.state, goal) => bool
