# WI2 source and evidence register

Read 2026-11-15. Repository SHAs identify the inspected checkouts; no execution or independent review is implied. PuzlWerk reference/worktree: `5bee91e5b717fed41caf9f076a7d6efecb0d58da`; CubeLab: `5ab482719a31b894bd32d78ea76c64609b89acb2`; Cubistry: `f976f40813d8e47f911ba6addab2603eb096f066`.

## Primary standards

- [WCA Regulations Article 12a](https://www.worldcubeassociation.org/regulations/#12a), current page version April 1, 2026, linked official source revision `415be08`: 12a1 face, 12a2 and 12a2+ outer block `1<n<N`, 12a4 rotations. Specifies notation tokens; does not by itself prove competition legality of an algorithm.
- [SiGN/LGN Draft 6](https://standards.cubing.net/draft/6/sign-lgn-notation/): descriptive draft, base-move and repeated-move grammar, LGN group/commutator/conjugate and axis rotations. Grammar includes `positive-int layer-move-family`, `positive-int dash positive-int range-move-family`, and inverse repetition including half inverse. Puzzle semantics and layer bounds are not specified by these productions. Comments and timestamps appear only as extension headings.

## CubeLab reference evidence

- `docs/move-notation-compatibility.md`: documented 2–5 coverage, explicit dialects, ambiguity and source-compatibility distinction. Contains stale/conflicting claim that M/E/S are 3×3 only; code below admits 5 too. Its uncovered-NISS text also conflicts with its earlier opt-in Twizzle statement; do not infer coverage without targeted validation.
- `docs/algorithm-workbench.md`: AST serialization, explicit modern notation, transform boundaries, frame rotation and replay. `docs/acube-notation.md`: ACube m/e/s as x'/y'/z; R* is configuration rather than algorithm.
- `src/Move/MoveTypes.res`: `baseMove`, `layerRange`, `unitDesc`, `locatedUnit`, `alg`, dialect and lowercase mode. `src/Move/MoveParser.res`: `validateRange` lines 292–307, `parseBaseMove` lines 309–429, `parseUnit`, `parseWithOptions` lines 941–948 (only sizes 2–5), comments/pause handlers and ACube mapping. Its `M/E/S` size guard explicitly permits 3 and 5. Grammar branch admits a wider set than the recommended profile; validation and AST distinct.
- `src/Move/MoveTransform.res`: `serializeMove` lines 58–78, `serializeUnit`/`serialize`, `sliceAsInnerFace`, `unfoldSlices`, `serializePortable` lines 245–320. These retain represented groups and nodes, but `skipTrivia` in parser discards line comments and whitespace. `src/Move/MoveExecutor.res`: `expandTimeline`, `expand`, `parseAndApplyWithOptions`; `src/Move/MoveCompatibility.res`: `assessment`, `compatibility`, source features. Generated `src/Move/MoveTransform.res.mjs` exports `serializeMove`, `serialize`, `serializePortable`; this establishes file exports, not a published stable package API.
- Tests read as source, not run: `test/move-parser.test.mjs` tests legacy lowercase (58), M/E/S size guard (121, 339), Ruwix versus modern `F2'` (172–180), ACube (269), AST annotations (296–334); `test/move-executor.test.mjs` range/inverse (86), dialect differences (91–112), 5×5 input (140); `test/move-transform.test.mjs` claims dialect semantic round trips across 2–5 (64); `test/move-compatibility.test.mjs` ACube and legacy profiles (65–91). A test name or assertion is documentary coverage, not evidence of passing. No 6–7 execution coverage established.

## Scope and verification

Read-only audit of standards and cited source. No suite, demo, code execution, mutation test, browser integration or state-equivalence validation was run; results UNKNOWN. No 6–7 execution claim, no published interface claim, and no implementation/migration authorization. The integrating author owns cross-repository code and binding inventory and final proposal; this register does not assert its completion.
