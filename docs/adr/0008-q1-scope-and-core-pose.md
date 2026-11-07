# ADR 0008: Q1 scope and the single core pose

Status: Accepted (owner decision 2026-11-05)
Date: 2026-11-05
Refines: [ADR 0002](0002-coordinates-and-moves.md) and [ADR 0003](0003-identity-and-goal-symmetry.md), which were accepted on 2026-11-07 and keep their recorded wording

## Context

Q1 in the [research register](../../specs/001-core-foundation/research.md) asked for approval of the frame, the face-up table and the certification scope 2–7. The [data model](../../specs/001-core-foundation/data-model.md) proposes SO(3,Z) as the pose and leaves the matrix layout, the position consistency and the center twist implicit. Cubistry v1 `BodyFrame` stores the same nine numbers transposed (Cubistry `packages/cube-core/res/PwCore.res` `rotate`; `packages/solver-2x2/src/physical-adapter.mjs` `rotate`, which sums `v[j]·basis[j][i]`). Consumers also use goal periods 1, 2 and 4 for the same symmetries that the data model names C4, C2 and C1.

## Decision

1. **Q1 scope.** The frame (+X right, +Y up, +Z front), the doubled centered integer coordinates and the frame/face-up table in the data model are approved. Certification covers N=2 and N=3 first. Sizes 4–7 stay representable, are not certified, and need a separate approval.
2. **One core pose.** SO(3,Z) stored row-major as nine integers is the only pose in the core. Layout: entry (i,j) is row i, column j of O, and column j is the image O·e_j of piece-local axis j in puzzle coordinates. Cubistry v1 `BodyFrame` is Oᵀ; reading its nine numbers as row-major O yields O⁻¹. Identity and half turns satisfy Oᵀ=O, so conversion fixtures must contain quarter turns and 120° rotations. Cubistry v1 `BodyFrame`, Cubacle `pose24`, the Orbit64 frame rank and quaternions are adapters.
3. **Position rule.** Each piece starts at its home slot h with O=I, and a move maps (p,O) to (Rp,RO). Hence p=O·h for every piece, including centers. A structural check may use this rule.
4. **Canonical bytes.** Pose and position values are integers, with no negative zero, as in [contracts/solver.md](../../specs/001-core-foundation/contracts/solver.md) (canonical JSON). This ADR adds no decoder rule.
5. **Center twist.** A center has no twist field. The twist r∈{0,1,2,3} is a derived view of O: the number of clockwise quarter turns, seen from outside, from the reference direction of the center's current face (face-up table) to O·u₀, where u₀ is the center's home reference. It is not measured against the home orientation. Example: after x the U center lies on B, O·u₀ = −Y, the B reference is +Y, so r=2. This is certified for N=3; for N≥4 only a smoke test applies.
6. **Terminology.** C1 corresponds to goal period 4 (exact), C2 to period 2, C4 to period 1 (see [solver-3x3-picture](../knowledge-base/solver-3x3-picture.md), `symmetry`). C1 is never period 1.

## Consequences and fixture plan

Adapters carry the layout and the term mapping explicitly. Fixtures live in `test/fixtures/conformance/`, each with a provenance file (source repository, revision, path, SHA-256 of input and output):

- F1 frame table: 24 rotations, the transposed Cubistry form, Orbit64 frame rank, quarter and 120° turns.
- F2 move signs, including all-layer rotations.
- F3 2×2 v1: `test/fixtures/cubistry-42-43.json` to core state.
- F4 3×3 picture, canonical and framed: the 82 rows of the 174 Flix vectors in Cubacle `tests/fixtures/orbit64_v2_picture_facelets.txt` that use the 3×3 picture registries, including x/y/z.
- F5 4×4 and 5×5 from the same file as an uncertified smoke test.
- F6 symmetry table C1/C2/C4 against periods 4/2/1.
- F7 center order URFDLB against ULFRBD.

F1–F7 belong to T002 and T003 and are not part of this decision. The rule in item 3 and the twist formula in item 5 are derived and need confirmation by F4 and F6.

## Non-goals

No code, no ReScript build (T004), no Q6 decision, no quaternion or CubeScene contract (Cubistry #111), no migration commitment, no change to Q2 and no Rust/WASM decision.
