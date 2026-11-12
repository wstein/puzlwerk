# Shared model: layers, convergence path and open work

Status: proposal. Markers **O**, **V**, **P**, **U** as in the [README](README.md). Facts per component are in
[comparison.md](comparison.md); this file states proposals and options, not decisions.

## 1. Layers of one abstraction

One abstraction has seven layers. A lower layer never depends on a higher one; appearance and targets refer to state
by IDs only.

| # | Layer | Content |
| --- | --- | --- |
| L1 | State | Definition (pieces, homes, sticker IDs, normals, `up`) and a pose per piece |
| L2 | Move algebra | Layer transformations, composition, inverse, orbits and permutations derived from moves |
| L3 | Orientation and centers | Whole-cube frame, center twist, pose variants (framed or canonical) |
| L4 | Appearance | Color, image reference, crop, design symmetry per sticker |
| L5 | Targets | Goals, don't-care stickers, exact frame or any rotation, display subsets |
| L6 | Wire | Canonical bytes, hashes, revisions, compact tokens, errors |
| L7 | Notation | Text moves to and from the move AST |

### 1.1 Candidates per layer

| Layer | Candidates today (**V**) | Proposed canonical owner (**P**) | Why |
| --- | --- | --- | --- |
| L1 State | wire-v1 pose; Orbit64 V2 orbits; Cubacle `Facelets` and fixed-frame `Print`/`State`; `cubistry.state`; Cubistry sticker arrays; KPuzzle orbit data (proposed) | PuzlWerk `puzlwerk.definition` and `puzlwerk.state` | Only model with piece and sticker identity, any print, centers as pieces and N up to 64; the others are projections of it (comparison section 7) |
| L2 Move algebra | `PwMove` AST; `Orbit64.Move`; Cubacle notation and engines; `cube-mechanics` (size 2); Calendar and Calendar7 engines; KPuzzle transformations (proposed) | PuzlWerk AST as the semantic definition; orbit permutation tables derived from it and published as vectors | The AST covers inner, wide and multi-layer moves; permutation algebra (compose, invert) is a derived view that every implementation can check against vectors |
| L3 Orientation and centers | ADR 0008 (O plus derived twist); Orbit64 `r_f` and pose variants; Cubacle `CenterTwists`, `SolveFrame` | PuzlWerk for the definition (ADR 0008 item 5); Orbit64 V2 for canonical/framed normalization of registry types | ADR 0008 and FORMAT-V2 already define the same twist; F4 checks it for N=3 |
| L4 Appearance | wire-v1 `color`; `cubistry.print` `assetId`, `materialId`, `equivalentQuarterTurns`; `cubistry.appearance` v2; Cubacle `image`; `FaceSet` and crops | PuzlWerk, as a separate document keyed by sticker ID ([#47](https://github.com/wstein/puzlwerk/issues/47)); image bytes and crops stay in the application | Appearance is never identity (wire-v1); a separate document leaves wire-v1 revision 1 unchanged |
| L5 Targets | PuzlWerk goal grammar (proposed, M2); `cubistry.target` v1 and `cubistry.goal` v2; Cubacle `Target`, `Mask`, display goals, C2 modes (proposed); KPuzzle `orientationMod` | PuzlWerk goal grammar, extended by the Cubistry goal and Cubacle don't-care cases as vectors | The grammar already names pose, sticker, color and symmetry goals; the other forms map onto `stickerAt`, `faceColors` and global frames |
| L6 Wire | wire-v1 canonical JSON and `sha256:`; Orbit64 V2 token; Cubistry versioned JSON; Cubacle REST `formatVersion` | Two canonical forms: wire-v1 for full documents (PuzlWerk), Orbit64 V2 for compact tokens of registry types (flix-orbit64) | They answer different needs (any print and goals versus short URLs); one conversion vector set keeps them consistent |
| L7 Notation | `PwNotation` (Q2 subset); Cubacle WCA, SiGN, SSE; Orbit64 move tokens; Calendar7 generators | PuzlWerk AST as the only semantic target; text dialects stay adapters, checked by a token-to-AST vector table | Q2 (**O** 2026-11-07) limits PuzlWerk text parsing, not the AST; Cubacle accepts more spellings |

### 1.2 How Rust and ReScript/TypeScript consume a layer (options, nothing decided)

| Option | Content | Price | Risk |
| --- | --- | --- | --- |
| S: specification plus shared vectors | One normative text per layer in PuzlWerk; each language implements; a pinned corpus (F1 to F7, wire vectors, new mapping vectors) is the conformance test in every repository | Two implementations (ReScript and Rust); a corpus to maintain | Drift between vector runs; covered only as far as the vectors reach |
| G: generated types from one schema | A JSON Schema per document in PuzlWerk; ReScript types and Rust structs generated | A generator in two toolchains; AGENTS.md rule "no generated code without justification" | Types match but semantics (moves, twist) do not follow from a schema; S is still needed |
| W: WASM from one Rust engine | ReScript/TypeScript call a Cubacle wasm module for state and moves | Contradicts **O** 2026-11-08 ("Rust stays own", shared code only within ReScript) and Cubacle `AGENTS.md` ("no shared cube core here") | Browser size and start time (2x2x2 cold start about 93 ms, 21.4 MB linear memory, Cubacle plan section 1); AGPL network clause |
| R: one ReScript implementation, Rust by vectors | PuzlWerk ReScript core is the single implementation for ReScript/TypeScript consumers (Cubistry, CubeAssembler, CubeLab); Cubacle keeps Rust and passes the corpus | One ReScript core plus one Rust implementation; MIT CubeAssembler consuming AGPL or unlicensed code needs a license decision | Same as S for Rust; for ReScript consumers the migration effort |

**P** R for ReScript and TypeScript consumers, S for Rust. This is the combination the 2026-11-08 decisions describe
(shared code within ReScript, Rust its own, specification and vectors first). G is not needed for that; W is excluded
by the decisions unless the owner changes them.

## 2. Convergence path (P)

Each step is one reviewable pull request (or a short stack) with a test or vector that fails first. Steps 1 to 4 change
only this repository; the first step needs no code change elsewhere. Every step outside PuzlWerk, and every milestone,
needs its own owner approval (**O** 2026-11-08). Generators for new vectors follow the independent-generator rule of
the plan ("independently computed hashes", [plan.md of 001](../001-core-foundation/plan.md)) and are written in Julia
or Flix, like the Orbit64 V2 generators, not in Python.

| Step | Content | Fails first | Done when | Verification |
| --- | --- | --- | --- | --- |
| 1 | Corpus index: `test/fixtures/corpus.json` listing every existing vector set with repository, commit, path, SHA-256 and license (wire examples, F1 to F7, Orbit64 V2 vectors, the Cubacle copy, the CubeLab and CubeAssembler copies) | a new test in `test/conformance-fixtures.test.mjs` reads the index and fails on a missing entry or a wrong hash of a local file | every local vector file is listed with its hash; remote entries carry a pinned commit | `npm run check`; `npm run docs:check`; `npm run test:docs` |
| 2 | Mapping vectors N=2 and N=3: the same states as wire-v1 state, Orbit64 V2 token (canonical and framed), picture facelets, color facelets, `cubistry.state` (Oᵀ) and Cubistry sticker frames; quarter turns and 120 degree rotations included (ADR 0008) | the test fails on a planted wrong transpose and on a planted center twist | each row converts both ways with byte-equal canonical JSON and equal tokens | `npm run check`; the generator command recorded in the provenance file |
| 3 | Appearance specification ([#47](https://github.com/wstein/puzlwerk/issues/47)): `puzlwerk.appearance` revision 1 proposal (sticker ID to color, image reference, design symmetry C1/C2/C4); tile ID rule; picture Cube 3x3 and Calendar examples as vectors | schema text plus examples that the decoder test (later) must read | owner accepts or changes the text; examples have provenance | `npm run docs:check`; `npm run test:docs` |
| 4 | Target vectors (M2 groundwork): `cubistry.goal` v2 slots, Cubacle color sets and masks, `orientationMod`, `ignore-centers` and `exact-frame` expressed as PuzlWerk goal nodes, each with a state that passes and one that fails | a vector whose expected result contradicts the data model text is rejected in review | every listed target form has a mapping row or an explicit "unsupported" row | `npm run docs:check`; vectors checked by the step-2 test harness once M2 starts |
| 5 | Consumer conformance, test only, one pull request per repository after approval: Cubacle reads the pinned corpus (Rust test), CubeAssembler and CubeLab run their V2 ports against it, Cubistry checks `cubistry.state` and Calendar states against step 2 | each repository's new test fails on a planted wrong vector | all consumers pass the same corpus at the same pin | `cargo test --release --test <name>` (Cubacle); `node --test tests/<file>` (Cubistry); the repository test command (CubeAssembler, CubeLab) |
| 6 | One ReScript Orbit64 V2 module in PuzlWerk, dual-run against the CubeLab and CubeAssembler ports, then each consumer switches (separate approvals, M2 and M3) | dual-run differs on a planted change | the PuzlWerk module passes the flix-orbit64 vectors; consumers use it | `npm run check`; consumer test commands |
| 7 | Cubistry adapters: `cubistry.state` v1 and the Calendar sticker arrays to and from wire-v1; Picture Cube engine interface (S3) backed by `PwMove` for N=3, later N=4 to 7 (replaces option E1's own engine) | Calendar and Calendar7 engines as differential oracles on fixed random words | replay equality of all stickers on the oracles | `node --test tests/<file>`; `npm run check` (PuzlWerk) |
| 8 | Solver adapter (M3, [solver contract](../001-core-foundation/contracts/solver.md)) through the Cubacle fixed frame (**O** Q3) | the contract's conformance cases 1 to 10 | negotiated capabilities, replay of every answer in PuzlWerk | contract tests; Cubacle `cargo test` |

Not in the path: changing wire-v1 revision 1; moving Rust code into PuzlWerk; a viewer change; certification of N=4
to 7 (needs its own approval, ADR 0008).
