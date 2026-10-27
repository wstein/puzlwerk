# Reusable 2×2 solver

Status: scoped implementation for [#5](https://github.com/wstein/puzlwerk/issues/5),
subject to Draft PR acceptance. The maintainer authorized this migration on
2026-10-27 after Cubistry pilot PRs #20, #22 and #24 were merged. This does not
approve the general 001 foundation milestones or consumer integration.

See [feature acceptance](../../specs/002-solver-2x2/spec.md),
[ADR 0005](../adr/0005-reusable-2x2-solver.md), the
[public types](../../packages/solver-2x2/src/index.d.ts) and
[provenance manifest](../../packages/solver-2x2/provenance.json).

## Ownership and provenance

The private package `@puzlwerk/solver-2x2` makes PuzlWerk the maintained location
for this reusable solver extraction. CubeLab remains an independent application;
its working solver is not deleted or changed. No package is published here.
The original CubeLab implementation at revision
`07e64c7f5b7a735ae12ce6cbd9c58647b8744776` supplies `Optimal2x2Solver`,
`Canonical2x2`, `Optimal2x2Table` and seven direct ReScript dependencies.
Only pinned ReScript formatting changes two imported files; the manifest records
both original and imported hashes. The unchanged v2 asset is 1,837,112 bytes:

```text
SHA-256 3b7f10a07d2e13b54044e9073b46f39544640fb6adf8e903ed84f8c3199dae5a
```

Its 32-byte header and packed distances cover 3,674,160 rotation-canonical corner
states. No table is regenerated. CubeLab's existing distance-gradient reconstruction
and its 24-orientation frame correction are reused; no new solving/search
algorithm is introduced. The wrapper composes one relative state, rather than
solving both endpoints separately or executing a detour via a reference state.

The copied dependency closure retains legacy parser/geometry helpers privately;
it does not expose or claim support for their other puzzle sizes or UI features.
No DOM, camera, Three.js, worker or application dependency enters this package.
The sole runtime dependency is the matching `@rescript/runtime@12.3.1`.

## Explicit modes, HTM and optimality

Both modes accept **complete states**, not color-only or partial-display goals.
The caller must choose a mode explicitly; there is no implicit default.

| Mode | Required final state | Metric and guarantee |
| --- | --- | --- |
| `rotationEquivalent` | The target up to one proper whole-cube rotation; identities and relative sticker poses remain attached to bodies | HTM-optimal in CubeLab's rotation quotient, using the existing v2 distance table; at most eleven outer-face moves for that quotient |
| `exactPhysical` | The exact complete target in the fixed world frame, including every cubie pose and therefore every sticker normal/up vector | HTM counts the gradient path **plus** the frame correction. Overall HTM optimality is **not guaranteed**, even when a particular result needs no correction |

Every returned token is an outer face turn: `R`, `R2` and `R'` each count as one
HTM move. No free `x/y/z` tokens are returned. Existing frame-correction rotations
are expanded into legal opposite-face pairs: `x = R L'`, `y = U D'`, `z = F B'`
and their inverses. These pairs count as two HTM moves each. The result reports
`moveCount`, `quotientDistance`, `frameCorrectionMoves`, `metric`, `mode` and
`optimality` separately; it never labels a composed exact solution HTM-optimal.

The quotient guarantee is inherited from CubeLab's algorithm/table; these focused
migration tests do not independently re-prove the entire distance database.
Neither mode claims shortest movement to *any* valid printed display. Whole-cube
rotation equivalence can rotate the printed front and is unsuitable when the
application requires an upright, fixed presentation.

## API and loading

Build with pinned ReScript 12.3.1 on Node 24+. The package is private and not
published; its ESM export and type declaration are tested through a packed,
isolated consumer. The packed artifact includes the compiled modules; consumers
do not need a compiler. Caller code owns loading and deployment paths:

```js
import { create2x2Solver, TABLE_URL } from '@puzlwerk/solver-2x2'
const bytes = new Uint8Array(await (await fetch(TABLE_URL)).arrayBuffer())
const solver = await create2x2Solver(bytes, immutablePrint)
const result = solver.solve2x2(currentState, completeTarget, {
  mode: 'exactPhysical',
})
```

In Node, `readFile(TABLE_URL)` supplies the same bytes. No fetch or hard-coded
root-relative URL is performed by the public API. `TABLE_URL` is module-relative
so bundlers can transport the asset. Modern browser Web Crypto (normally a secure
context) or Node 24 Web Crypto is required; absence produces an explicit error.

The factory snapshots the table and print before asynchronous authentication,
checks the pinned SHA-256 and existing header/dimension/checksum decoder, then
retains one private decoded table. Reuse that solver instance for one fixed
print. It exposes no mutable table or definition. Solving is synchronous after
initialization and returns frozen output; input states are not mutated. Loading,
UI scheduling and cancellation policy belong to the consumer, not this package.

## State and coordinate boundary

There is no executable canonical PuzlWerk core yet. Rather than add a second
physical model, an explicit compatibility adapter accepts the **existing**
`cubistry.print@1` and `cubistry.state@1` wire profiles. Their strings are
`schema: "cubistry.print"` / `"cubistry.state"` with integer `version: 1`.
These are not silently renamed into the proposed 001 interchange format.
See the preserved [source contract](https://github.com/wstein/cubistry/blob/f2d23f3/docs/SHARED_CUBE_M1.md).

- World axes: right-handed +X right, +Y up, +Z front; corner positions are ±1.
- Each body's orientation is its three source basis vectors in world coordinates:
  transformed component `i` is `sum(v[j] * basis[j][i])`.
- The immutable print owns eight permanent numeric cubie IDs and 24 permanent
  sticker IDs, local normal/up vectors and asset/material references. Its required
  `equivalentQuarterTurns` arrays must be unique C4 subgroups `{0}`, `{0,2}` or
  `{0,1,2,3}`. Neither mode uses glyph symmetry to normalize physical poses.
- Complete states own only cubie positions/body frames and refer to that print.
  There are no independently movable/reorientable sticker fields.
- Validation rejects unknown versions/sizes, duplicate/unknown IDs, occupied slots,
  reflections/nonproper frames, body/position mismatches and impossible twist sums.
  Different frame conventions require an explicit external conversion, not a flag
  silently changing this profile's meaning.
- Private CubeLab corner order is UFR, UFL, ULB, UBR, DFR, DLF, DBL, DRB, with each
  slot's ordered U/D sticker and cyclic side faces. Cubie identity is mapped from
  source position and ID, never inferred from visible colors. All labels may be
  visually identical. This private solver coordinate is not a new public model.

For source `S` and target `T`, the adapter forms `T^-1 ∘ S` in CubeLab's existing
composition convention. The existing solver is called **once** on that relative
state. Applying its returned word to S reaches T modulo a global rotation;
`exactPhysical` appends the existing correction and rechecks exact corner identity
and orientation internally. This mathematical relative identity is not an actual
source → solved → target path.

JSON round trips are supported by the existing plain-data wire profile; input
version and identities are validated again on each call. A future approved core
can replace this adapter at a package boundary, with compatibility fixtures, rather
than changing either existing wire semantics or canonical definitions silently.
ADRs [0002](../adr/0002-coordinates-and-moves.md),
[0003](../adr/0003-identity-and-goal-symmetry.md) and
[0004](../adr/0004-versioned-solver-boundary.md) remain proposed.

## Independent verification

The [test oracle](../../test/helpers/physical-replay.mjs) imports no CubeLab code,
solver adapter or cubie coordinates. It rotates integer positions, body basis
vectors, all sticker normals and all print-up vectors geometrically. Tests cover:

- Identity and all 18 single-turn transitions, inverse and nontrivial endpoint pairs.
- All 24 physical global target orientations, and distinct x/y targets that must
  stay different in `exactPhysical` although the quotient can accept both at zero cost.
- A → B → C → A, passing each actual replayed state into the next solve and comparing
  all bodies/stickers after every transition and after closing the loop.
- JSON round trips, mutation during/after factory initialization, malformed states,
  incompatible print IDs, impossible twists and table corruption.
- A packed isolated consumer, without a compiler or application dependency, verifying
  exact 42 → 43 by the same independent physical replay.

Internal solver replay alone is not the acceptance evidence. Full body and sticker
replay is checked independently, including cases where frame correction is nonempty.
This is a 2×2 outer-turn reachability check; it is not general NxN certification.

## Cubistry integration remains separate

The [pinned test excerpt](../../test/fixtures/cubistry-42-43.json) contains the padded
print and two existing witnesses. Its current reference path has **18 HTM**
(9 + 9); the new direct exact result has **10 HTM**, matching #5's direct acceptance
figure. Do not mislabel ten as the old reference detour's length. The deterministic
word is `U R' U' F2 R2 U R F' U F'`. Independent replay verifies all bodies/stickers
and the four upright front asset references for 42 and 43. No visual rendering,
font loading or browser counter integration is claimed by this headless fixture.

After this PuzlWerk PR is accepted, a separately reviewed Cubistry PR may replace
`inverse(witness[current]) + witness[target]` with this package, using
`mode: 'exactPhysical'` and the chosen **complete** target witness. It must:

1. Use the actual committed physical state, not just the desired numeric value.
2. Preserve the fixed print, upright title/digits and exact target frame by replay.
3. Pass returned tokens through the existing presentation/animation queue.
4. Set planned HTM to the actual token count; increment only on committed moves.
5. Preserve queued targets, interruption/reset and same-value behavior, including
   interruption between moves, and retain timer, accessibility and mobile tests.
6. Keep 42 → 43 and the closed transition chain as integration regressions, verify
   built assets/base paths, and remove duplicate solver ownership only after parity.

No Cubistry, CubeLab or Cubacle file is changed by this migration. Cubacle stays
an independent optional Rust provider. Broader monorepo work
[#8](https://github.com/wstein/puzlwerk/issues/8),
[#9](https://github.com/wstein/puzlwerk/issues/9), Zettelkasten/Pages work and the
3×3 Supercube are not implemented here.

## License and validation

The solver package is **AGPL-3.0-or-later**, with CubeLab's LICENSE and NOTICE
retained and full text in COPYING. The unrelated 4×4 source mentioned in upstream
NOTICE is not included. The counter fixture has separate provenance and AGPL text.
This does not relicense the entire PuzlWerk repository or authorize a permissive
license for downstream derived code; consumers must review distribution obligations.

```sh
npm ci
npm run check
npm run test:package
```

`check` runs ReScript formatting, the TypeScript **public consumer contract** and
Node's built-in tests (which compile ReScript first). It does not claim TypeScript
analysis of every imported ReScript-generated module. `test:package` builds, packs
locally and installs the artifact offline into an isolated temporary consumer using
the exact runtime tarball/integrity pinned by the root lockfile and cached by
`npm ci`. Its generated consumer lock avoids relying on cached registry metadata.
No registry publication occurs. CI uses
Node 24 and the same lockfile/checks. No test framework/runtime UI dependency,
exhaustive benchmark or table generation is added.
