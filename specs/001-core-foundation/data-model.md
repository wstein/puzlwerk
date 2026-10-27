# Proposed domain model

Status: Proposed. Normative language describes the candidate design, not an accepted or implemented API. See ADRs [0002](../../docs/adr/0002-coordinates-and-moves.md) and [0003](../../docs/adr/0003-identity-and-goal-symmetry.md).

## Frames and integer coordinates

Use a right-handed puzzle frame: +X right (R), +Y up (U), +Z front (F). A viewer camera is not this frame. Coordinates are integer triples. For size N define D={−(N−1),−(N−3),…,N−1}. Shell slots are D³ with at least one component of magnitude N−1: N³−(N−2)³ slots, including fixed face centers where applicable. N=2 has eight slots. This avoids half-integers for even sizes.

For face-local coordinates, outward normal n and up u define right r=u×n, so r×u=n. Proposed defaults: F(n=+Z,u=+Y), B(−Z,+Y), R(+X,+Y), L(−X,+Y), U(+Y,−Z), D(−Y,+Z). Record this table in every legacy adapter; never infer it from image orientation. Face centers on odd cubes are modeled physical pieces, not discarded reference markers.

A global rotation is a member of the 24 proper signed permutation matrices. It transforms positions, poses and puzzle-frame goal vectors together when changing the reference frame. A camera motion transforms none of them. A physical whole-cube rotation changes the state only if explicitly permitted as a move. Goal acceptance up to a global rotation is a third, independent operation.

## Definition

`PuzzleDefinition`: schema revision, opaque definition ID, size, coordinate convention ID, immutable piece catalog, legal move policy and declared goal/appearance metadata. IDs are nonempty case-sensitive ASCII identifiers, unique within their namespace; portable examples use `[A-Za-z0-9._:-]+`. Display text is separate Unicode data. Definitions are immutable: changed printing or mechanics creates a new definition ID.

Each `PieceDefinition` has a stable piece ID, home shell slot and immutable stickers. A sticker has a stable sticker ID, owner piece ID, local unit normal and perpendicular local up vector, plus optional color token and appearance reference. Color and appearance are metadata, never identity. Stickers occupy exactly the exposed faces of the home shell slot; no duplicate local normals. The initial piece-local axes coincide with the puzzle axes at home.

Piece kind derives from exposed faces: corner (3), edge (2), center (1). Mechanical orbits derive from the permitted move action, not color/kind alone. No hardcoded claim that every center or every wing is interchangeable. The foundation supports arbitrary legal layer selections within the cubic shell model; bandaging/custom restrictions require a later versioned capability.

## State

`PuzzleState`: definition ID and one pose for every piece. A pose consists of piece ID, current shell position p, and orientation O mapping piece-local vectors into puzzle coordinates. O belongs to SO(3,Z), the 24 proper signed permutation matrices: integer entries −1/0/1, OᵀO=I, det O=+1. Wire format uses its row-major nine entries, avoiding an undocumented orientation-number table.

A sticker's physical world normal is On and its world up is Ou. A center's orientation is retained even when its color hides it. State equality compares all IDs, positions and O exactly, independent of record/array order. It does not quotient by visual symmetry or global rotation. Optical equivalence is only a goal comparison.

## Moves

Canonical move AST: axis `X|Y|Z`, sorted unique nonempty layer indices `0..N−1`, and signed quarter turns `−1|1|2`. Layer i has coordinate 2i−(N−1). Positive is right-hand rotation about the **positive** axis; 180° uses +2. A move selects pieces by pre-move position. For rotation matrix R, selected poses become `(Rp, RO)` and all others remain unchanged. IDs and printing never change.

For +Z,+1, `(x,y,z)→(−y,x,z)`; the N=2 piece at `(1,−1,1)` reaches `(1,1,1)`. Four such moves restore the entire state and orientation. Standard outward-clockwise notation maps F,R,U to −1 on their positive outer layer; B,L,D to +1 on their negative outer layer. Example R: axis X, layers [N−1], turns −1. F sends a front-top-right slot to front-bottom-right.

Proposed baseline policy permits single outer, single inner, contiguous wide and explicit multi-layer moves; adapter capability negotiation can reject any unsupported selection. Notation parsing is an adapter: initially outer `R L U D F B` with prime/2 suffix, numeric-width `kRw` family, and explicit AST for inner/noncontiguous layers. Ambiguous `M/E/S`, lowercase aliases and x/y/z notation remain deferred pending Q2; canonical AST can represent all-layer rotations when policy permits. No silent notation reinterpretation.

## Goals and symmetry

Goals are data, not callbacks crossing the solver boundary. Proposed finite grammar: `all` (conjunction), `any` (disjunction), `pieceAt`, `piecePose`, `stickerAt`, `faceColors`. Each node's schema is closed and typed; empty all=true and empty any=false. No arbitrary executable predicates, implicit negation or inferred reference frame.

- `pieceAt(pieceId, position)` checks identity and destination only.
- `piecePose(pieceId, position, targetOrientation, subgroup)` checks destination plus O=O_target H for some H in a declared subgroup of the piece-local proper rotation group. Exact pose uses H={I}.
- `stickerAt(stickerId, position, targetNormal, targetUp, symmetry)` checks owner destination, normal and up modulo rotations around the **target world normal**, expressed in the fixed puzzle frame. Appearance aliases require explicit equivalence metadata; no inference from text strings.
- `faceColors(samples)` compares exact color tokens at declared outward face slots, ignoring identity and sticker-up. A full classical solved goal supplies every outward sticker sample (6N²). Partial goals list only their intended samples.

Sticker symmetry groups C1={0}, C2={0,2}, C4={0,1,2,3} use quarter turns about the declared normal. “360° symmetry” means C1: a full turn returns to the same orientation; it does not mean all orientations are acceptable. Non-subgroups such as {0,1} are invalid. Piece subgroups must be closed, contain identity/inverses and preserve all declared physical appearance features; validation rejects a declared subgroup contradicting sticker metadata. A goal may require stricter orientation than optical symmetry but cannot claim broader optical equivalence without an explicit appearance equivalence declaration.

`GoalDefinition` includes a root node and allowed global frames: fixed `{I}` by default, or an explicit validated subgroup of the 24 cube rotations. Evaluation asks whether one common global rotation transforms the complete target into a match; different goal nodes cannot independently choose different global frames. This avoids accepting inconsistent mixtures. Goal transformations rotate target positions, normals and up vectors consistently. All predicates are deterministic and solver-neutral.

Example: two red edge pieces A and B can exchange matching color observations without satisfying `pieceAt(A,pA)`. A front sticker with target normal +Z and up +Y, currently up +X, fails C1 and C2 but passes C4. Up −Y passes C2. Tilting its normal away from +Z fails all three regardless of up. Symmetries leave actual O unchanged.

## Validation and limits

Return separate results for decoding, structural validity, mechanics invariants and reachability: `verified` (with legal replay witness or approved complete method), `disproved` (with applicable invariant/method evidence), or `unknown`. Structural pass is not a reachability certificate. Reject invalid types (including numeric strings/booleans), nonfinite/fractional coordinates, missing/duplicate IDs, reflections, occupied-slot collisions, non-outward posed stickers and invalid symmetry groups. Check definition/profile consistency first. Orbit and twist/parity checks must identify their applicable size/move policy; do not generalize a 3×3 parity test to arbitrary NxN moves.

Default untrusted-input limits proposed: 16 MiB JSON, N≤64, 100,000 goal nodes, depth≤64 and 1,000,000 response moves; caller may lower these, and solver advertises stricter limits. Reject before large allocations where possible. Larger puzzles need a separately negotiated profile. No validator or solver may downgrade unknown reachability to UNSAT.

## ReScript ownership

Opaque validated types separate raw decoded records from accepted definitions/states/goals/moves. Pure modules own coordinates, poses, transforms, goal evaluation, structural/invariant validation and codecs. Adapters own legacy mappings and Cubacle process I/O. Rendering, filesystems and search heuristics remain outside the core. Concrete module/type signatures are approved in the first implementation phase, preserving these semantics.
