# Shared model: layers, convergence path and open work

Status: proposal with owner decisions of 2026-11-12 (section 4). Markers **O**, **V**, **P**, **U** as in the
[README](README.md). Facts per component are in [comparison.md](comparison.md).

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

| Layer | Candidates today (**V**) | Canonical owner (**O** where decided, else **P**) | Why |
| --- | --- | --- | --- |
| L1 State | wire-v1 pose; Orbit64 V2 orbits; Cubacle `Facelets` and fixed-frame `Print`/`State`; `cubistry.state`; Cubistry sticker arrays; KPuzzle orbit data (proposed) | **O** 2026-11-12 (SM1): PuzlWerk `puzlwerk.definition` and `puzlwerk.state`; the Cubacle fixed frame is the Rust implementation of the same semantics | Only model with piece and sticker identity, any print, centers as pieces and N up to 64; the others are projections of it (comparison section 7) |
| L2 Move algebra | `PwMove` AST; `Orbit64.Move`; Cubacle notation and engines; `cube-mechanics` (size 2); Calendar and Calendar7 engines; KPuzzle transformations (proposed) | PuzlWerk AST as the semantic definition; orbit permutation tables derived from it and published as vectors | The AST covers inner, wide and multi-layer moves; permutation algebra (compose, invert) is a derived view that every implementation can check against vectors |
| L3 Orientation and centers | ADR 0008 (O plus derived twist); Orbit64 `r_f` and pose variants; Cubacle `CenterTwists`, `SolveFrame` | PuzlWerk for the definition (ADR 0008 item 5); Orbit64 V2 for canonical/framed normalization of registry types | ADR 0008 and FORMAT-V2 already define the same twist; F4 checks it for N=3 |
| L4 Appearance | wire-v1 `color`; `cubistry.print` `assetId`, `materialId`, `equivalentQuarterTurns`; `cubistry.appearance` v2; Cubacle `image`; `FaceSet` and crops | **O** 2026-11-12 (SM3): PuzlWerk, as a separate document `puzlwerk.appearance` keyed by sticker ID ([#47](https://github.com/wstein/puzlwerk/issues/47)); wire-v1 revision 1 stays unchanged. **P**: image bytes and crops stay in the application | Appearance is never identity (wire-v1); a separate document leaves wire-v1 revision 1 unchanged |
| L5 Targets | PuzlWerk goal grammar (proposed, M2); `cubistry.target` v1 and `cubistry.goal` v2; Cubacle `Target`, `Mask`, display goals, C2 modes (proposed); KPuzzle `orientationMod` | PuzlWerk goal grammar, extended by the Cubistry goal and Cubacle don't-care cases as vectors | The grammar already names pose, sticker, color and symmetry goals; the other forms map onto `stickerAt`, `faceColors` and global frames |
| L6 Wire | wire-v1 canonical JSON and `sha256:`; Orbit64 V2 token; Cubistry versioned JSON and `canonicalJson` with an unprefixed hex SHA-256 (appearance only); Cubacle REST `formatVersion` | **O** 2026-11-12 (SM1): wire-v1 for full documents (PuzlWerk); Orbit64 V2 is a derived compact token. **O** 2026-11-12 (SM2): a codec from and to wire-v1, proven by vectors, not a model of its own | They answer different needs (any print and goals versus short URLs); one conversion vector set keeps them consistent |
| L7 Notation | `PwNotation` (Q2 subset); Cubacle WCA, SiGN, SSE; Orbit64 move tokens; Calendar7 generators | PuzlWerk AST as the only semantic target; text dialects stay adapters, checked by a token-to-AST vector table | Q2 (**O** 2026-11-07) limits PuzlWerk text parsing, not the AST; Cubacle accepts more spellings |

### 1.2 How Rust and ReScript/TypeScript consume a layer (SM4 decided: G)

| Option | Content | Price | Risk |
| --- | --- | --- | --- |
| S: specification plus shared vectors | One normative text per layer in PuzlWerk; each language implements; a pinned corpus (F1 to F7, wire vectors, new mapping vectors) is the conformance test in every repository | Two implementations (ReScript and Rust); a corpus to maintain | Drift between vector runs; covered only as far as the vectors reach |
| G: generated types from one schema | A JSON Schema per document in PuzlWerk; ReScript types and Rust structs generated | A generator in two toolchains; AGENTS.md rule "no generated code without justification" | Types match but semantics (moves, twist) do not follow from a schema; S is still needed |
| W: WASM from one Rust engine | ReScript/TypeScript call a Cubacle wasm module for state and moves | Contradicts **O** 2026-11-08 ("Rust stays own", shared code only within ReScript) and Cubacle `AGENTS.md` ("no shared cube core here") | Browser size and start time (2x2x2 cold start about 93 ms, 21.4 MB linear memory, Cubacle plan section 1); AGPL network clause |
| R: one ReScript implementation, Rust by vectors | PuzlWerk ReScript core is the single implementation for ReScript/TypeScript consumers (Cubistry, CubeAssembler, CubeLab); Cubacle keeps Rust and passes the corpus | One ReScript core plus one Rust implementation; MIT CubeAssembler consuming AGPL or unlicensed code needs a license decision | Same as S for Rust; for ReScript consumers the migration effort |

**O** 2026-11-12 (SM4): option G, a schema generator. One schema generates the types and codecs for Rust and for
ReScript/TypeScript. This is not the recommendation of the first version of this plan (R for ReScript plus S for Rust).
For types and codecs it supersedes the 2026-11-08 line "shared code only within ReScript, Rust stays its own
implementation"; Rust then uses generated types and codecs from the same schema. Move semantics, twist and goal
evaluation do not follow from a schema; for them the vectors of option S still apply (**P**). W stays excluded.

### 1.3 What the schema generator needs (P unless marked)

The generator gets its own plan (step G1) before any code. Its design is **P** or **U** until that plan is accepted.

| Topic | Content |
| --- | --- |
| Plan | A separate spec directory in PuzlWerk with scope, acceptance and slices, approved by the owner before step G2. |
| Input | One schema per document: `puzlwerk.definition`, `puzlwerk.state`, `puzlwerk.appearance`, later goals. Schema language **U** (a JSON Schema subset or an own description). It must state closed objects, the ID pattern, integer-only numbers, ranges (size 2..64), ID-sorted arrays, revisions and the error codes with JSON paths of [wire-v1](../001-core-foundation/contracts/wire-v1.md). Rules a schema cannot state (proper rotation, `position = O * home`) stay hand-written checks, tested by vectors. |
| Language | No Python. The generator is written in the language of the repository that hosts it: JavaScript (Node 24) or ReScript in PuzlWerk; emitters write ReScript and Rust source. Julia or Flix only for the independent recomputation of vectors, never for the generator. |
| Location | Generator and schemas in PuzlWerk. Generated ReScript in PuzlWerk; generated Rust in Cubacle. **U**: whether generating Rust text from PuzlWerk agrees with the Cubacle rule "Do not add a Rust project or Rust package to PuzlWerk" (`AGENTS.md` of Cubacle); whether the Rust output is committed or produced by a Cubacle build step. PuzlWerk `AGENTS.md` asks for a justification for generated code; SM4 is it. |
| Verification | Generated codecs in both languages decode and re-encode every wire vector and every step 2 mapping vector byte-equal, give the same `sha256:` hashes, and give the same error code and JSON path on every negative vector. A regenerate-and-diff check fails when committed output differs from generator output. A planted schema change must fail a test (mutation). During migration the generated ReScript codec runs beside `PwCodec` on all vectors (dual run). |
| Price | A generator with two emitters and their tests; migration of `PwCodec` to generated code; a Cubacle change per schema revision. |
| Risks | Semantics outside the schema drift without vectors; emitter bugs hit both languages at once; cross-repository toolchain coupling; review of large generated diffs; license of generated output in AGPL Cubacle (**U**, see SM11); the Orbit64 V2 codec is generated (**O** SM8), but its rank algorithm is not a schema, so how the generator expresses it is **U** (design of step G1). |

## 2. Convergence path (P)

Each step is one reviewable pull request (or a short stack) with a test or vector that fails first. Steps 1 to 4, G1, G2 and LC change
only this repository; the first step needs no code change elsewhere. Every step outside PuzlWerk, and every milestone,
needs its own owner approval (**O** 2026-11-08). Generators for new vectors follow the independent-generator rule of
the plan ("independently computed hashes", [plan.md of 001](../001-core-foundation/plan.md)) and are written in Julia
or Flix, like the Orbit64 V2 generators, not in Python.

| Step | Content | Fails first | Done when | Verification |
| --- | --- | --- | --- | --- |
| 1 | Corpus index: `test/fixtures/corpus.json` listing every existing vector set with repository, commit, path, SHA-256 and license (wire examples, F1 to F7, Orbit64 V2 vectors, the Cubacle copy, the CubeLab and CubeAssembler copies) | a new test in `test/conformance-fixtures.test.mjs` reads the index and fails on a missing entry or a wrong hash of a local file | every local vector file is listed with its hash; remote entries carry a pinned commit | `npm run check`; `npm run docs:check`; `npm run test:docs` |
| 2 | Mapping vectors N=2 and N=3: the same states as wire-v1 state, Orbit64 V2 token (canonical and framed), picture facelets, color facelets, `cubistry.state` (Oᵀ) and Cubistry sticker frames; quarter turns and 120 degree rotations included (ADR 0008); one row per canonical-bytes difference (Cubistry `canonicalJson` allows non-integers and writes an unprefixed hex hash; wire-v1 rejects non-integers and `-0` and prefixes `sha256:`) | the test fails on a planted wrong transpose and on a planted center twist | each row converts both ways with byte-equal canonical JSON and equal tokens | `npm run check`; the generator command recorded in the provenance file |
| G1 | Generator plan (**O** SM4; design **P**/**U**, section 1.3): spec directory with schema language, emitters, location, verification and slices | review rejects a plan without the verification rows of section 1.3 | the owner approves the plan | `npm run docs:check`; `npm run test:docs` |
| G2 | Generator for `puzlwerk.definition` and `puzlwerk.state` with ReScript and Rust emitters, in PuzlWerk; generated ReScript runs beside `PwCodec` | a planted schema change and a planted wrong error code fail the generated-codec test | generated ReScript passes the wire vectors and step 2 vectors byte-equal and agrees with `PwCodec` on all of them; regenerate-and-diff is clean | `npm run check`; the regenerate-and-diff command named in G1 (**U**); the Rust output is tested by `cargo test` in a Cubacle PR with its own approval |
| LC | `LICENSE` for EUPL-1.2 (**O** SM11) covering `core/` and the generator, in its own reviewed pull request; first a compatibility check against the facts of SM11 | review rejects a license file without the written check | the owner accepts the check and the file; package licenses stay as they are unless the owner decides otherwise | `npm run docs:check`; `npm run test:docs`; `npm run test:package` (package license fields unchanged) |
| 3 | Appearance specification ([#47](https://github.com/wstein/puzlwerk/issues/47)), shape decided (**O** SM3): `puzlwerk.appearance` revision 1 text (sticker ID to color, image reference, design symmetry C1/C2/C4); tile ID rule; picture Cube 3x3 and Calendar examples as vectors | schema text plus examples that the decoder test (later) must read | owner accepts or changes the text; examples have provenance | `npm run docs:check`; `npm run test:docs` |
| 4 | Target vectors (M2 groundwork): `cubistry.goal` v2 slots, Cubacle color sets and masks, `orientationMod`, `ignore-centers` and `exact-frame` expressed as PuzlWerk goal nodes, each with a state that passes and one that fails | a vector whose expected result contradicts the data model text is rejected in review | every listed target form has a mapping row or an explicit "unsupported" row | `npm run docs:check`; vectors checked by the step-2 test harness once M2 starts |
| 5 | Consumer conformance, test only, one pull request per repository after approval: Cubacle reads the pinned corpus (Rust test), CubeAssembler and CubeLab run their V2 ports against it, Cubistry checks `cubistry.state` and Calendar states against step 2 | each repository's new test fails on a planted wrong vector | all consumers pass the same corpus at the same pin | `cargo test --release --test <name>` (Cubacle); `node --test tests/<file>` (Cubistry); the repository test command (CubeAssembler, CubeLab) |
| 6 | Generated Orbit64 V2 codecs (to and from wire-v1, **O** SM2 and SM8) replace the ReScript ports of the Facelet and V2 codecs in CubeLab and CubeAssembler once the generator and the vectors exist; first dual-run against the ports; one pull request per repository, each with owner approval (M2, M3) | dual-run differs on a planted change | the generated codec passes the flix-orbit64 vectors and the step 2 vectors; each consumer uses it and its port is removed | `npm run check`; consumer test commands |
| 7 | Cubistry adapters: `cubistry.state` v1 and the Calendar sticker arrays to and from wire-v1; Picture Cube engine interface (S3) backed by `PwMove` for N=3, later N=4 to 7 (replaces option E1's own engine) | Calendar and Calendar7 engines as differential oracles on fixed random words | replay equality of all stickers on the oracles | `node --test tests/<file>`; `npm run check` (PuzlWerk) |
| 8 | Solver adapter (M3, [solver contract](../001-core-foundation/contracts/solver.md)) through the Cubacle fixed frame (**O** Q3) | the contract's conformance cases 1 to 10 | negotiated capabilities, replay of every answer in PuzlWerk | contract tests; Cubacle `cargo test` |

Not in the path: changing wire-v1 revision 1; moving Rust code into PuzlWerk; a viewer change; certification of N=4
to 7 (needs its own approval, ADR 0008).

## 3. Impact on open work

Judged against the principle "one model, compatible implementations". Verdicts: **proceed** (model independent or
already consistent), **change** (may proceed with a changed recommendation), **wait** (needs the named step, decision
or follow-up). SM1 is decided (**O** 2026-11-12); the Cubacle browser plan still assumes its own algebra and Cubing.js
numbering, so Cubacle stacks B and M and plan decisions D3, D12, D13 and D14 stay on hold until a follow-up docs PR in
Cubacle updates that plan for SM1 and SM4. This plan does not edit the Cubacle plan.

| Work | Model content (**V**) | Verdict (**P**) | Reason and change |
| --- | --- | --- | --- |
| Cubacle stack A (A1 to A4, build, features, manifest, tarball) | `crates/wasm/` split, ABI version, `cli` feature, `xtask` manifest and tarball; no state, pattern or target type (plan section 5) | proceed | The claim "model independent" holds. Only shared file: A1 and B1 both edit `tests/architecture_test.rs` (a text conflict, not a model one). |
| Cubacle L2, L3 (JS glue, table hashes) | loader, worker, hash pin, abort; serialization of built tables | proceed | Model independent. |
| Cubacle L1 (ABI 2, `capabilities`, error codes) | capability keys `sizes`, `moves`, `modes`, `frames`; codes 0 to 6 | change | Vocabulary overlaps the [solver contract](../001-core-foundation/contracts/solver.md) capability probe and outcomes (`unsupported`, `invalid`, `unknown`). Add a mapping table to the contract terms in L1, or reuse its names, so M3 needs no second vocabulary. |
| Cubacle stack B (B1, B2, `src/kpuzzle/`) | a new orbit model in Rust: piece numbering (Cubacle plan D3), `orientationMod`, bridges to `Facelets`, `CenterTwists`, Orbit64 V2 | wait (hold) | It would be a fifth state model. With SM1 the Rust model must implement wire-v1 semantics: numbering derived from wire-v1 piece IDs and checked by step 2 vectors, not adopted from Cubing.js; with SM4 its types and codecs come from the generator. On hold until the Cubacle plan follow-up; SM5 stays open. |
| Cubacle stack M (target modes, `solvePattern`, JS pattern operations) | targets `ignore-centers`, `exact-frame`; JS API within Cubacle plan D13 | wait (hold) | Targets are layer L5; express both modes as PuzlWerk goal nodes first (step 4). M3 also depends on Cubacle plan D13. |
| Cubacle D3 (piece numbering) | recommendation: Cubing.js numbering | wait (hold), then change | Recommend the Orbit64 V2 slot convention already in Cubacle (`orbit64-Nxn-draft@1`), with a vector table to wire-v1 piece IDs; Cubing.js numbering only as a test-side mapping in Cubistry. |
| Cubacle D13 (JS pattern API) | algebra public in Rust; JS exposes data, conversion, `solvePattern`, `capabilities`; its price: "the Calendar planner keeps a JS algebra of its own (Cubing.js until G2, then its own or a PuzlWerk one, availability **U**)" | wait | The boundary part (no general JS algebra in Cubacle) fits the principle. The PuzlWerk alternative does not exist yet (**V**): the core has `PwMove.inverse` and `applyToPose` (`core/res/PwMove.resi:13-19`) and `PwOrientation.compose` (`core/res/PwOrientation.resi:10`), no pattern or transformation algebra (compose, invert of whole states, orbit permutations). That algebra is new PuzlWerk work, not yet planned; its availability stays **U**. |
| Cubacle D14 (module placement) | `src/kpuzzle`, `src/targets` in `RULES` | wait (hold) | Placement itself is model neutral, but it names modules for an algebra that is on hold; it is revisited in the Cubacle plan follow-up. |
| Cubacle D12 (C2 fixtures) | Calendar fixtures, provenance by Cubistry commit | wait (hold), then change | Store them in the corpus format of step 1 (wire-v1 state plus Orbit64 V2 token, provenance file), so every implementation reads the same rows. |
| Cubistry PR #430 (cubacle C2 to C5 go record) | one file, `knowledge/plans/cubacle-wasm-replacement.md`; head `26e2474a` withdraws "D1 to D14 as Recommended", proposes as go (pending owner confirmation) stack A, L2, L3, D14 placement and L1 with a mapping to the solver contract, holds B, M, D3, D9, D12, D13 | change (small) | Already narrowed along this plan. Remaining difference: D14 is in its go set ("placement only"); this plan holds D14 with stack B until the Cubacle plan is updated. Its text states that Cubacle `develop` is retired; GitHub shows `develop` as the default branch of Cubacle on 2026-11-12 (**V**), and #430 itself now says so. |
| PuzlWerk #47 (picture cubes) | appearance per sticker, tile ID rule, legacy adapter | proceed as specification (step 3) | No wire-v1 change. The shape is decided (**O** 2026-11-12, SM3): a separate `puzlwerk.appearance` document per sticker ID. |
| Cubistry PR #431 (Calendar7 month picker) | UI files, browser specs, `docs/CALENDAR_7X7.md` | proceed | No state, move or target change. |
| Calendar7 chain and engine work | own 7x7 engine and pose arrays | proceed for UI, print and research; wait for new state formats | The engine is a transition state; a new persisted state format or a new interchange should use wire-v1 or an Orbit64 V2 token. An Orbit64 V2 chain interchange was named in the planning request for this plan; no repository source for it was found, so it is **U** (comparison section 5). |
| Cubistry Picture Cube stack S0a to S6 | host mount, upload, editor, storage, solve; S3 adds an engine interface and a 3x3 adapter on the Calendar sticker model | proceed, S3 change | The engine interface is application level. Keep the 3x3 adapter thin so that step 7 can swap it to `PwMove`. |
| Cubistry option E1 (own NxN engine, decided after stack PR 4) | new in-repository engine for 4 to 7 | change | An own NxN engine is another model. PuzlWerk `PwMove` already transforms N=2..64 poses (certified 2 and 3). Recommend E1 as "consume PuzlWerk core plus certification of N=4 to 7" (SM7). |
| flix-orbit64 #22 (V2-only interchange) | token codec in nine projects | proceed for the token layer, scope change | V2 is a projection (comparison section 7); it cannot hold prints with equal stickers or partial identity (FORMAT-V2 "Extensions"). With SM2 (**O**) #22 becomes a codec task against wire-v1 and the step 2 vectors. With SM8 (**O**) the CubeLab and CubeAssembler ports are replaced by generated codecs (step 6); #22 says PuzlWerk has no codec to replace, which changes with the generator. |
| PuzlWerk #23 (2x2 solver on Cubacle) | solver choice | proceed | Solver engines are outside the model; the adapter uses the solver contract. |
| PuzlWerk #9, #11, #12 (packages, CubeAssembler and Cubistry migration) | architecture and migration issues | wait | SM1, SM2, SM4 and SM8 are decided; they still depend on the generator plan (step G1). |

## 4. Owner decisions

Each with recommendation (R), price and consequence. The owner answered SM1, SM3, SM4 and SM11 on 2026-11-12 (source:
owner answer in the coordinator session) and SM2 and SM8 (**O**, 2026-11-12, same source); they are marked **O**.
SM5 to SM7, SM9 and SM10 stay open proposals. SM numbers are the decisions of this plan; D numbers name the decisions of the Cubacle
browser plan.

1. **SM1 Canonical semantic model (core decision).** **O** 2026-11-12: PuzlWerk wire-v1 is the canonical model; the
   Cubacle fixed frame is the Rust implementation of the same semantics; Orbit64 V2 is a codec. The question was:
   which model is the one all components share?
   Options: (a) PuzlWerk wire-v1 definition and pose; (b) Orbit64 V2 orbits and token; (c) Cubacle fixed-frame print
   and pose code; (d) a KPuzzle-like orbit model. R: (a), with (c) as the Rust realization of the same semantics for
   the solver adapter (**O** Q3) and (b) as a codec (**O** SM2). Price: every other model becomes an adapter with mapping
   vectors; Cubistry `cubistry.state` (size 2, transposed) and the Calendar models migrate in later steps.
   Consequence: (b) or (d) as canonical would drop sticker identity for equal-looking stickers, prints with partial
   identity and sizes above 15; (c) covers the 2x2x2 only today.
2. **SM2 Role of Orbit64 V2.** **O** 2026-11-12: Orbit64 V2 is a derived compact token. It is a codec from and to
   wire-v1, proven by vectors, and not a model of its own. PuzlWerk owns the conversion vectors (step 2). Price: one
   more vector set. Consequence: flix-orbit64 #22 becomes a codec task and does not compete with wire-v1.
3. **SM3 Appearance layer (#47).** **O** 2026-11-12: a separate appearance document per sticker ID
   (`puzlwerk.appearance`); wire-v1 revision 1 stays unchanged. The question was: a separate `puzlwerk.appearance` document keyed by sticker ID (color, image
   reference, design symmetry), image bytes and crops in the application? R: yes. Price: one more schema and the tile ID
   rule. Consequence: wire-v1 revision 1 stays; Cubistry `assetId`, `equivalentQuarterTurns` and Cubacle `image` map
   onto it.
4. **SM4 How languages consume the layers.** **O** 2026-11-12: option G, a schema generator; one schema generates the
   types and codecs for Rust and ReScript/TypeScript. It differs from the recommendation of the first version (R for
   ReScript, S for Rust) and supersedes the 2026-11-08 line "shared code only within ReScript, Rust stays own" for types
   and codecs. Price and risks: section 1.3. Consequence: steps G1 and G2; semantics stay checked by vectors; no wasm
   core.
5. **SM5 Cubacle stack B.** With SM1 decided: wait for step 2 and the Cubacle plan follow-up, and replace Cubacle plan D3 (Cubing.js numbering) by the Orbit64 V2
   slot convention with mapping vectors? R: yes. Price: stack B starts later; the Calendar planner keeps Cubing.js
   until then (it does today). Consequence: no fifth independent numbering.
6. **SM6 Cubistry PR #430.** Narrow it to stacks A, L2, L3 (and L1 with a contract mapping), and mark Cubacle plan D3,
   D12, D13, D14 and stacks B and M as waiting? Partly answered: head `26e2474a` of #430 does this except D14, as a
   proposal pending the owner. Open: D14, and the owner's confirmation of the #430 go. R: hold D14 with B. Price: a
   one-line edit of an open Draft. Consequence: the record does not fix a module layout for an algebra that waits.
7. **SM7 Picture Cube sizes 4 to 7 (E1).** Build them on PuzlWerk `PwMove` and approve certification of N=4 to 7
   (ADR 0008 item 1)? R: yes, when E1 is decided after stack PR 4. Price: certification work in PuzlWerk before the UI.
   Consequence: no own NxN engine in Cubistry.
8. **SM8 Generated Orbit64 V2 codecs.** **O** 2026-11-12: the ReScript ports of the Facelet and V2 codecs in CubeLab
   and CubeAssembler are replaced by generated codecs as soon as the generator and the vectors exist (steps G2, 2 and
   6); one pull request per repository, each with owner approval. Price: two consumer migrations and the generator
   design for the rank algorithm (**U**). Consequence: #22 scope text changes for PuzlWerk.
9. **SM9 Notation.** The PuzlWerk AST is the only semantic move form; WCA, SiGN, SSE and app dialects are adapters with a
   token-to-AST vector table? R: yes. Price: one table. Consequence: Q2 stays as decided for PuzlWerk text.
10. **SM10 Record the 2026-11-08 decisions.** Write Q3 and Q7 into `research.md` (now "Q7 open", "Q3 untouched")? R: yes,
    as a separate small PR. Price: none. Consequence: the repository states the decisions it follows.
11. **SM11 Licenses.** **O** 2026-11-12: the shared core, PuzlWerk `core/` and the schema generator, is licensed
    EUPL-1.2 (owner answer "Ja, EUPL-1.2", confirming the earlier free-text answer "eul1.2"). No `LICENSE` file is
    written in this pull request; it is follow-up step LC of section 2. Facts for the compatibility check of that step
    (**V**; no legal conclusion is drawn here):
    - EUPL-1.2 Article 5 (compatibility clause): a work combining the licensed work with a work under a "Compatible
      Licence" may be distributed under that Compatible Licence; its obligations prevail where they conflict. The
      Appendix lists GNU GPL v2 and v3, GNU AGPL v3, OSL v2.1 and v3.0, EPL v1.0, CeCILL v2.0 and v2.1, MPL v2, GNU
      LGPL v2.1 and v3, CC BY-SA 3.0 (works other than software), EUPL v1.1 and v1.2, LiLiQ-R and LiLiQ-R+. MIT and
      Apache-2.0 are not in the Appendix. Source: the EUPL-1.2 text (SPDX license list copy).
    - Cubacle: AGPL-3.0-or-later with the upstream MIT grant kept. CubeAssembler: MIT. flix-orbit64 (Orbit64 V2):
      Apache-2.0; its vectors F4 and F5 are Apache-2.0 at the origin, and their copy in PuzlWerk comes via Cubacle under
      AGPL-3.0-or-later (`test/fixtures/CONFORMANCE-NOTICE.md`, line 10); F1 is Apache-2.0 (same file).
      Cubistry: AGPL-3.0. CubeLab: AGPL-3.0-or-later.
    - In PuzlWerk today: `packages/solver-2x2` and `packages/solver-3x3-picture` are AGPL-3.0-or-later; the
      conformance fixtures from this repository carry AGPL-3.0-or-later in their provenance files.
    - Open for the check (**U**): the license of generated code emitted into Cubacle (AGPL) and into ReScript consumers;
      whether any existing `core/` file carries another license notice.

## 5. Not verified

- **U** Calendar7 chain state with Orbit64 V2 interchange: not found (comparison section 5).
- **U** Whether each Cubacle fixed-frame print uses the face-up table for its `up` vectors (the axes are **V**,
  comparison section 7); whether the Cubistry 3x3 and 7x7 coordinate scale (not doubled) is the only difference to wire-v1 for those states.
- **U** CubeLab sizes and center handling; read from #22 and file names only.
- Not written: the `LICENSE` file for EUPL-1.2 (SM11); it is step LC with its compatibility check first.
- Not run: no test, build or vector generator of any repository; only the documentation checks of this repository.
- Effort estimates are not given; each step is sized by its own pull request.
