# 001 Core foundation — feature specification

Status: Proposed; specification only; human approval required before implementation.
Date: 2026-10-27. Source: [Issue #3](https://github.com/wstein/puzwerk/issues/3).

## Problem and scope

PuzlWerk provides the canonical ReScript puzzle model consumed by Cubacle (Rust search), CubeLab and CubeAssembler. Colors cannot stand in for physical identity or orientation. Consumers need reproducible transformations and goal evaluation without sharing rendering or search implementations.

The proposed foundation models NxNxN shell pieces for integer N ≥ 2, with an initial **certified compatibility range 2–7**. Larger sizes are representable subject to explicit resource limits but have no compatibility or performance claim until certified. Non-cubic, bandaged, shape-changing and deformable puzzles are out of scope. Inner and wide moves are proposed explicitly in [ADR 0002](../../docs/adr/0002-coordinates-and-moves.md); this PR requests approval rather than assuming existing consumers agree.

No production code, dependencies, solver algorithms, repository migrations or package publication are authorized. No UI, optimal solver, move animation, generalized puzzle DSL or universal NxN reachability theorem is required.

## User stories and acceptance scenarios

### US1 — preserve classical definitions (P1)

As an existing color-cube consumer, I can import a definition and evaluate its original solved convention without acquiring identity constraints.

- Given a legacy fixture and its explicit face/color/frame mapping, when imported and exported, then colors, dimensions and move results retain their meaning (AC01).
- Given two same-colored pieces swapped in a structurally valid state, a color-only goal may pass while an identity-sensitive goal fails (AC02). This example does not assert physical reachability.
- Legacy solved-up-to-global-rotation and fixed-frame solved are distinct selectable profiles; the adapter never guesses which was intended (AC03).

### US2 — exact physical state and optical equivalence (P1)

As a puzzle designer, I retain immutable sticker identity while allowing specified optical symmetries.

- Correct position with an incorrect orientation fails an exact goal (AC04).
- Around an explicitly declared sticker normal, quarter-turn symmetry accepts 0/90/180/270°, half-turn symmetry accepts 0/180° only, and full-turn-only symmetry accepts 0° only modulo 360° (AC05).
- Symmetry never changes physical state, sticker ownership or legal moves. A goal accepting 90° does not authorize an extra move (AC06).
- A sticker with half-turn symmetry does not imply that its whole multi-sticker cubie has that symmetry (AC07).

### US3 — deterministic mechanics and honest validation (P1)

As a consumer, I can transform states without rendering or solving.

- All proposed N=2–7 fixtures satisfy four quarter turns = identity, move followed by inverse = identity, and exact integer orientation/position preservation (AC08).
- A wide move equals the product of its disjoint constituent layers. Inner moves on N=2, empty ranges and out-of-bounds layers fail explicitly (AC09).
- Duplicate IDs/positions, reflections, malformed JSON, unknown revisions and unsupported moves fail with stable error codes and field paths (AC10).
- Structural validity is reported separately from legal reachability; an unproved state is never labeled reachable or impossible (AC11).

### US4 — portable solving without silent weakening (P1)

As a solver consumer, I negotiate a supported profile before submitting a versioned goal.

- Unsupported identities, orientation goals, sizes, frames or move sets return `unsupported` before search; there is no color-only fallback (AC12).
- Every solved response replays in PuzlWerk from the requested initial state under the negotiated legal moves and satisfies the original goal (AC13).
- Time/budget exhaustion is `unknown`, never `unsatisfiable`; UNSAT requires a complete method for the exact negotiated finite problem (AC14).
- Canonical definition/state/goal round trips are deterministic and lossless for supported profiles, including invisible sticker identities (AC15).

### US5 — bounded usable foundation (P2)

As a maintainer, I can reproduce compatibility and performance results.

- Pinned legacy fixtures for all three consumers record source revision, license, interpretation and expected move/goal outcomes; unconfirmed support remains blocked (AC16).
- Validation, replay and wire performance meet the provisional budgets in the plan on a recorded reference environment (AC17).

## Requirements and traceability

| Requirement | Normative design | Acceptance |
| --- | --- | --- |
| Coordinates, NxN, frames | data-model §§ Frames, Definition; ADR 0002 | AC01,08–10 |
| Identity, pose, immutable stickers | data-model §§ State, Validation | AC02,04,07,10–11 |
| Color/position/orientation goals and symmetry | data-model § Goals; ADR 0003 | AC02–07 |
| Legal moves | data-model § Moves; ADR 0002 | AC06,08–09,13 |
| Versioned interchange and Cubacle | contracts/solver.md; ADR 0004 | AC03,10,12–15 |
| Compatibility, validation, performance | plan.md; research.md | AC11,16–17 |

Every AC becomes an executable test after approval; prose scenarios here are not claims that tests already ran.

## Approval questions

Approval must resolve or explicitly defer Q1–Q7 in [research](research.md). A deferred item blocks its dependent task, not unrelated approved work. In particular, no adapter may ship without an agreed legacy frame/goal mapping. Review approval is not merge authorization and merge is not approval of every later implementation phase.
