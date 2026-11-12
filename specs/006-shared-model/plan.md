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
