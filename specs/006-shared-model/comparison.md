# Model comparison per component

Status: proposal (see [README](README.md) for the markers **O**, **V**, **P**, **U**). Every row is read from the
primary source at the revision in section 1, not from summaries.

## 1. Sources and revisions

| Repository | Revision read (2026-11-12) | License (**V**) |
| --- | --- | --- |
| [puzlwerk](https://github.com/wstein/puzlwerk/tree/dd8d5a3ba658b692bc55d6afa6b0a594a750b2e3) | `main` `dd8d5a3ba658b692bc55d6afa6b0a594a750b2e3` | packages `AGPL-3.0-or-later`; no repository `LICENSE` file, so the license of `core/` is **U** |
| [flix-orbit64](https://github.com/wstein/flix-orbit64/tree/4a4f822db4a417ed58ed864ae1de00ec0b293db0) | `main` `4a4f822db4a417ed58ed864ae1de00ec0b293db0` | Apache-2.0 |
| [cubacle](https://github.com/wstein/cubacle/tree/bb92669ccf9416dfe2627067b0782f6fefbf27b0) | `develop` (GitHub default branch) `bb92669ccf9416dfe2627067b0782f6fefbf27b0` | AGPL-3.0-or-later, upstream MIT grant kept |
| [cubistry](https://github.com/wstein/cubistry/tree/ac6b00b5232201575cc618adfe538e0d81e75d0a) | `main` `ac6b00b5232201575cc618adfe538e0d81e75d0a` | AGPL-3.0 (`LICENSE`) |
| [cube-assembler](https://github.com/wstein/cube-assembler/tree/8ac10f5ae65f68e56a08bad5bdb738efe0e5bd4f) | `main` `8ac10f5ae65f68e56a08bad5bdb738efe0e5bd4f` | MIT |
| [cubelab](https://github.com/wstein/cubelab/tree/5ab482719a31b894bd32d78ea76c64609b89acb2) | `main` `5ab482719a31b894bd32d78ea76c64609b89acb2` | AGPL-3.0-or-later |

Issues and pull requests read: puzlwerk #9, #11, #12, #23, #47; flix-orbit64 #22; cubacle #32, #38 (merged; the plan
is `docs/design/browser-wasm-plan.md` on `develop`); cubistry #430 (head `d9b23283`), #431 (head `bf04c500`);
cubelab #22; cube-assembler #29.

## 2. PuzlWerk wire-v1 (ReScript core)

| Aspect | Model (**V** unless marked) |
| --- | --- |
| State | `puzlwerk.state` revision 1: one pose per piece, `pieceId`, `position` (shell slot), `orientation` (nine integers, row-major O in SO(3,Z)). Checks: distinct slots, proper rotation, `position = O * home` ([wire-v1](../001-core-foundation/contracts/wire-v1.md), [ADR 0008](../../docs/adr/0008-q1-scope-and-core-pose.md)). Definition `puzlwerk.definition`: pieces with `home` and stickers (`id`, `normal`, `up`, optional `color`). |
| Frame and coordinates | +X right, +Y up, +Z front; doubled centered integers, shell slots only ([ADR 0002](../../docs/adr/0002-coordinates-and-moves.md)). |
| Orientation and centers | Every piece, centers included, has O. A center twist is a derived view of O (ADR 0008 item 5), no twist field. Whole-cube orientation is part of the state; goal acceptance up to a rotation is a separate goal feature (data model). |
| Moves and notation | AST: axis `X|Y|Z`, sorted unique layers `0..N-1`, turns `-1|1|2` (`core/res/PwMove.resi`). `movePolicy` `outer-wide` or `any`. Text (Q2, **O** 2026-11-07): `R L U D F B` with `'`/`2`, `Rw`, `kRw`; slices, `x y z` and lowercase aliases fail (`core/res/PwNotation.resi`). |
| Size | 2..64 representable; certified N=2 and N=3; 4 to 7 need a separate approval (ADR 0008). |
| Appearance | Optional sticker `color` ID, "appearance, never identity". No image reference ([puzlwerk #47](https://github.com/wstein/puzlwerk/issues/47)). |
| Targets | Goal grammar `all`, `any`, `pieceAt`, `piecePose`, `stickerAt`, `faceColors`, C1/C2/C4, one global frame ([data model](../001-core-foundation/data-model.md)); proposed, not implemented (M2). |
| Serialization | Canonical JSON (sorted keys, integers only, ID-sorted arrays), `sha256:` hash, stable error codes with JSON paths, `revision` integer; unknown revisions fail with `BadRevision` (**O** 2026-11-08). |
| Language and runtime | ReScript 12.3.1, ES modules, Node 24 (`core/res/Pw*.res`). |
| Tests and vectors | `test/fixtures/wire/` (six documents, byte counts and SHA-256 in `index.json`); conformance F1 to F7 with `.provenance` files (`test/fixtures/conformance/`); `test/core-*.test.mjs`. The wire and conformance generators are Python scripts (`scripts/wire-examples.py`, `scripts/conformance-fixtures.py`). |

## 3. Orbit64 V2 (Flix reference, ports in Rust and ReScript)

| Aspect | Model (**V** unless marked) |
| --- | --- |
| State | One base64url token per state: a mixed-radix rank over orbits (corner permutation and twists, midge permutation and flips, wing orbits, center orbits, fixed-center rotations, frame), offset into a registry entry ([FORMAT-V2.md](https://github.com/wstein/flix-orbit64/blob/4a4f822db4a417ed58ed864ae1de00ec0b293db0/FORMAT-V2.md)). Pieces are numbered by home slot; no piece IDs beyond that. |
| Frame and coordinates | Facelet indices `face * n^2 + row * n + col`, faces `U R F D L B`; slot convention `orbit64-Nxn-draft@1`; 24 frames in V1 `Frame` order. |
| Orientation and centers | Two pose variants: canonical (frame dropped; odd cubes read with fixed centers home, even cubes with DBL home) and framed. Two sticker models: color (center multisets, no fixed-center rotation) and picture (every sticker distinct, fixed-center rotation `r_f` in 0..3, measured like ADR 0008 item 5). |
| Moves and notation | `Orbit64.Move`: face, zero-based depth, amount; no rotations, slices or aliases. A separate algorithm DAG contract (`ALGORITHM-DAG.md`). |
| Size | Registry entries 0 to 53: n = 2..15, color/picture by canonical/framed; 2x2x2 picture equals color. |
| Appearance | Only "all six colors" or "all stickers distinct". Partial distinguishability and masks are listed as future registry entries ("Extensions"). Design symmetries "belong in a goal or target definition, not in the token". |
| Targets | None in the token. |
| Serialization | The token itself; frozen rules, registry append-only; picture facelet string `6 n^2 + 5` characters. |
| Language and runtime | Flix on the JVM; independent Julia generators in `tools/format-v2/`. Ports: Rust in cubacle (`src/notation/orbit64/v2/`), ReScript in cubelab (`src/State/Orbit64V2*.res`) and cube-assembler (`src/cube/notation/Orbit64V2.res`). |
| Tests and vectors | `test/TestV2VectorData.flix`, `test/TestV2FaceletPictureData.flix` (174 picture rows, copied into cubacle `tests/fixtures/orbit64_v2_picture_facelets.txt`; 82 rows are PuzlWerk F4, others F5); proof report `tools/format-v2/proof-obligations.md`. |
| Open work | [flix-orbit64 #22](https://github.com/wstein/flix-orbit64/issues/22): V2-only state interchange across nine projects; states PuzlWerk and Cubistry "have no active Orbit64 codec to replace". |

## 4. Cubacle (Rust)

| Aspect | Model (**V** unless marked) |
| --- | --- |
| State | `puzzle::Facelets`: color letters `URFDLB`, row-major per face, `6 n^2` characters (`src/puzzle/facelets.rs`). Fixed frame (2x2x2 only): `frame::Print` of 24 stickers (`id`, `cubie`, `p`, `n`, `up`, `image: Option<String>`) and `frame::State` as one pose code 0..23 per corner body, relative to its print (`src/puzzle/frame/`). Orbit64 V2 `Cube` (orbits, rotations, frame). |
| Frame and coordinates | Facelet index order of Orbit64; fixed-frame vectors `[i8; 3]` in a world frame. |
| Orientation and centers | `Facelets` drops center orientation. `CenterTwists` (Z4 per face, odd cubes; merged in [#32](https://github.com/wstein/cubacle/pull/32)) is filled from the Orbit64 V2 picture model and read by the renderer. `SolveFrame::{Fixed, AnyOrientation}` (`src/puzzle/proof.rs`). |
| Moves and notation | WCA, SiGN and SSE spellings, layer ranges, `x y z` and `M E S` in expressions (`docs/cli/move-notations.md`). Fixed frame: 18 HTM moves. |
| Size | `PuzzleKind` 2..7; engines for 2x2 to 5x5 (`AGENTS.md`); Orbit64 V2 port 2..15; fixed frame 2x2x2. |
| Appearance | Color schemes; `image` reference on fixed-frame stickers; picture renderer (#37). |
| Targets | `puzzle::Target`: allowed color set per sticker (don't-care) and `Mask`; 3x3x3 target sets with sticker identity in `engines/three/partial/`; fixed-frame display goals ([fixed-frame proofs](https://github.com/wstein/cubacle/blob/bb92669ccf9416dfe2627067b0782f6fefbf27b0/docs/design/fixed-frame-proofs.md)). |
| Serialization | REST/JSON `formatVersion` 1; `canonical` field with Orbit64 token and schema name; fixed-frame strict JSON (`src/fixed_frame_cmd/strict_json.rs`); wasm C ABI 1. |
| Language and runtime | Rust; native CLI and REST server; `crates/wasm` facade for 2x2 and 3x3 solve. |
| Tests and vectors | `tests/fixtures/` (recorded solver output, not to be edited), Orbit64 V2 picture vectors copied from flix-orbit64. |
| Proposed (PR #38 plan, merged as a proposal) | A KPuzzle-like algebra in `src/kpuzzle/` (section 3.2): orbits `CORNERS`, `EDGES`, `CENTERS` (4 orientations), `{permutation, orientationDelta}` and `{pieces, orientation, orientationMod}`, compose, invert, bridge to `Facelets`, `CenterTwists` and Orbit64 V2; piece numbering open (D3, recommended Cubing.js numbering); public in Rust, JS limited (D13); target modes `ignore-centers` and `exact-frame` (section 3.3). Non-goal 3.8: "a shared cube core in cubacle". |
| Boundary rule | `AGENTS.md`: PuzlWerk owns the shared ReScript core; "do not create a public, reusable web viewer or shared cube core here". |

## 5. Cubistry (ReScript core packages and TypeScript apps)

| Aspect | Model (**V** unless marked) |
| --- | --- |
| State, shared packages | `cubistry.state` version 1: `printId`, `topology {kind, size}`, cubies `{id, position, orientation}` with a 3x3 rotation (`packages/cube-core/src/index.ts`). Size 2 only (`PwCore.res` `topology`). The nine numbers are the transpose of PuzlWerk O (ADR 0008 item 2). `cubistry.print` version 1: cubies and stickers `{id, cubie, normal, up, assetId, materialId, equivalentQuarterTurns}`. |
| State, 3x3 Calendar and Picture Cube 3x3 | Array of sticker records `{id, cubie, p, n, up, image, slot}`, coordinates in {-1, 0, 1}, not doubled (`src/apps/calendar/model.ts`, `src/apps/picture3/model.ts`). Tile ID rule `${face}_${row}_${col}`. |
| State, Calendar7 | Own 7x7 engine: 218 bodies, 294 stickers, poses as `Int8Array` `pos`, `normal`, `up`; coordinates -3..3, not doubled (`src/apps/calendar7/engine.ts`). |
| Orientation and centers | Size 2: full body rotation. Calendar, Picture Cube 3x3 and Calendar7: every sticker keeps `n` and `up`, so center orientation is carried; Picture Cube 3x3 `exactGoal` compares every center up vector. |
| Moves and notation | Size 2: `LegalMove {face, turns}` (`cube-mechanics`). Calendar: `R L U D F B` and `x y z`. Calendar7: 21 generators `7 * axis + slot`, no layer 0 generator, exponents -1, 1, 2. |
| Size | Shared packages: 2. Calendar: 3. Calendar7: 7. Picture Cube size control 2..7, playable 2 (`src/apps/playground/size.ts`); 3 planned (S3), 4 to 7 decided E0 (**O** 2026-11-11 in `knowledge/plans/unified-application.md`, D3). |
| Appearance | `assetId`, `materialId`, `equivalentQuarterTurns` per sticker; `cubistry.appearance` version 2 with a SHA-256 (`packages/cube-appearance`); one `FaceSet` image model for the Picture Cube (**O** 2026-11-12, D6 there); 3x3 crop per face (zoom, x, y) in `src/apps/picture3/images.ts`. |
| Targets | `cubistry.target` version 1 (facelets with `assetId`, `up`, `matching` `exact|equivalent`); `cubistry.goal` version 2: slots keyed by doubled integer position and normal, asset, up quarter turn, `matching`, optional sticker ID, `scope` `full|display`, `appearanceSha256` (`packages/cube-appearance/src/goal.ts`). |
| Serialization | Versioned JSON documents per schema name; no canonical-bytes rule or state hash found (**U**). |
| Language and runtime | ReScript 12.3.1 in `packages/cube-core`, `cube-mechanics`, `cube-assets`; TypeScript apps and `cube-viewer` (Three.js). Consumes `@puzlwerk/solver-2x2` and `@puzlwerk/solver-3x3-picture` as pinned tarballs (`puzlwerk-source.json`). |
| Viewer model | `PhysicalStickerFrame {id, cubie, p, n, up}` (`packages/cube-viewer/src/physical-scene.ts`): the viewer reads sticker frames only. |
| Calendar7 chain and Orbit64 V2 | **U**: no Orbit64 reference in `src/apps/calendar7/` at the revision above, nor on the branches `research/cal7-month-list-checkers`, `research/calendar7-jump-e1`, `research/calendar7-pure-split-states`, `demo/cal7-beam-names` (search for `orbit64`). |

## 6. CubeAssembler and CubeLab

Scope: as far as [cube-assembler #29](https://github.com/wstein/cube-assembler/issues/29) and
[cubelab #22](https://github.com/wstein/cubelab/issues/22) describe them, plus file names.

| Aspect | CubeAssembler (**V**) | CubeLab (**V**) |
| --- | --- | --- |
| State | `CubeState.cubeState`: six arrays of color strings; `cubeIR` with face grids (`src/cube/CubeState.resi`) | Facelet, color, net and Orbit64 codecs in `src/State/` |
| Moves | `cubeTurn {face, depth, width?, turns}` (`src/cube/CubeMoves.resi`) | `src/Move/` (executor, normalizer, compatibility) |
| Size | 2x2 to 7x7 behavior to preserve (#29) | not stated in #22 (**U**) |
| Orbit64 V2 | ReScript port in `src/cube/notation/` (PRs #40, #42, #43) | ReScript port in `src/State/` (PRs #38 to #40) |
| Role | Scanner, capture, assembly, viewer; migration M2 needs approval | Studio and Cube Rosetta; migration M3 needs approval |
| Recorded debt | Both issues: two ReScript V2 ports are "consolidation/interop debt"; no new parallel shared implementation | same |

## 7. Cross-component summary

| Layer | PuzlWerk | Orbit64 V2 | Cubacle | Cubistry | CubeAssembler, CubeLab |
| --- | --- | --- | --- | --- | --- |
| Identity | piece and sticker IDs | home slot only | color; fixed frame: sticker IDs (2x2x2) | sticker and cubie IDs | color |
| Pose | O matrix per piece | orbit permutation plus orientation digits | color facelets; pose code 0..23 (2x2x2) | Oᵀ per cubie (size 2); `p`, `n`, `up` per sticker | color facelets |
| Coordinates | doubled integers | facelet indices | facelet indices; world vectors | doubled (size 2, goal keys); not doubled (3x3, 7x7) | facelet grids |
| Centers | O of the center piece | picture: `r_f`; color: none | `CenterTwists` | `up` per sticker | none (**U** for CubeLab) |
| Sizes | 2..64 | 2..15 | 2..7 (engines 2..5) | 2, 3, 7 | 2..7 |
| Appearance | optional color | color or all distinct | colors; `image` (2x2x2) | asset, material, symmetry, appearance map | colors |
| Targets | proposed grammar | none | color sets, masks, display goals | `cubistry.target`, `cubistry.goal` | U |
| Hash | `sha256:` of canonical JSON | token is canonical | table and manifest hashes (proposed) | appearance map hash | none found |

Common ground (**V**): every identity-carrying model (PuzlWerk, Cubacle fixed frame, Cubistry shared packages and
Calendar models, the viewer) describes a sticker by position, outward normal and `up` in a right-handed integer world
frame. The Cubistry face table (`FACE_FRAMES` in `src/apps/picture3/model.ts`, `faces` in
`src/apps/playground/model.ts`) and the Orbit64 V2 fixed-center reference directions ("toward `B` on `U`, toward `F` on
`D`, and up on the four side faces") equal the face-up table of the data model. Sticker frames follow from a PuzlWerk
pose as `p`, `O n`, `O up` (**P** as a general claim; checked for N=3 picture states by F4). Orbit64 V2 picture tokens
and color facelets are projections of a pose: the picture projection is lossless for a cube whose stickers all
differ, the color projection is lossy. Whether the Cubacle fixed-frame axes equal the data-model frame is **U**.
