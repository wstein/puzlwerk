# Tasks — 001-core-foundation

Status: Proposed. **Every task below is BLOCKED until explicit human approval of its phase and listed decisions.** Unchecked means not implemented. Commit subjects are suggestions, not authorization. Tasks produce focused PRs; never merge automatically.

| ID | Phase / dependency | Atomic task and evidence | Suggested Conventional Commit |
| --- | --- | --- | --- |
| T001 | M0; human scope approval | Confirm Q1/Q6/Q7, record approval and runtime versions; audit licenses at pinned revisions | `docs: record approved foundation baseline` |
| T002 | M0; T001 | Preserve Cubacle color/frame fixtures with source hashes and old expected solved behavior (AC01,03,16) | `test: capture Cubacle compatibility fixtures` |
| T003 | M0; T001 | Preserve CubeLab/CubeAssembler fixtures and mappings with provenance (AC01,16) | `test: capture consumer definition fixtures` |
| T004 | M1; T002,T003; ADR approval | Add approved minimal ReScript build/lock configuration and deterministic check command; no speculative runtime package | `build: establish approved ReScript foundation` |
| T005 | M1; T004 | Add validated IDs, shell coordinates and proper pose types; odd/even and reflection tests (AC10) | `feat: model exact physical cube poses` |
| T006 | M1; T005,Q2 policy approval | Add pure AST layer transforms/inverses and hand-derived six-face tests (AC08–09) | `feat: define canonical layer transformations` |
| T007 | M1; T006 | Add bounded outer/wide notation parser; unsupported aliases fail (AC09–10) | `feat: parse approved cube notation` |
| T008 | M1; T005 | Add closed wire schema, canonical bytes/hashes and full valid examples; strict malformed/round-trip tests (AC10,15) | `feat: add versioned canonical state codec` |
| T009 | M1; T006,T008 | Add seeded mechanics properties across N=2–7 and provenance-linked golden tests (AC08,16) | `test: verify exact NxN state transformations` |
| T010 | M2; phase approval,T009 | Add identity, position and exact-pose predicates; same-color and wrong-pose cases (AC02,04) | `feat: evaluate physical goal predicates` |
| T011 | M2; T010 | Add C1/C2/C4, validated piece groups and one-common-global-frame evaluation (AC05–07) | `feat: model explicit goal symmetry groups` |
| T012 | M2; T011 | Add color/partial goals and approved legacy solved profiles; differential fixtures (AC01,03) | `feat: preserve legacy color goal semantics` |
| T013 | M2; T009,Q4 decision | Add structural/invariant/reachability evidence separation and replay certificates; unknown cases (AC11) | `feat: distinguish validation from reachability` |
| T014 | M3; phase approval,T008,T012,T013,Q3 agreement | Add capability/version negotiation adapter against fake backend; no search implementation (AC12) | `feat: negotiate Cubacle contract capabilities` |
| T015 | M3; T014 | Add bounded process transport, limits/cancel and malformed/timeout tests (AC10,14) | `feat: enforce solver process boundaries` |
| T016 | M3; T015 | Verify response hashes, legal full-state replay and original goals; reject weakened/fake answers (AC13–15) | `feat: verify solver responses independently` |
| T017 | M3; T016,approved upstream fixture | Run cross-language golden round-trip/replay; unsupported features documented (AC12–16) | `test: certify negotiated Cubacle profiles` |
| T018 | M2/M3; respective phase approval,T009,Q5 | Establish reproducible benchmark harness/baseline and gate provisional budgets (AC17) | `test: measure foundation performance budgets` |
| T019 | M4; separate consumer approvals,T012,T017 | Submit separately scoped consumer pilot plans/PRs with dual-run compatibility and rollback; no automatic migration | `docs: plan approved consumer adoption` |

T002 and T003 may proceed independently; T008 may proceed independently of notation after T005. Tests accompany each implementation task rather than being postponed to T009/T017. Before closing a phase, map all applicable ACs to actual results and request the next human gate. This specification PR stops before T001 execution.
