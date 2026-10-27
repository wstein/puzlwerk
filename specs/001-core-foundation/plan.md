# Incremental implementation plan

Status: Proposed; **all implementation milestones blocked pending explicit human approval**. No runtime changes or dependencies in this PR.

## Technical context and gates

ReScript pure core, proposed ESM output; Rust Cubacle through a process adapter; CubeLab/CubeAssembler consume versioned contracts. Proposed tooling is ReScript 12.3.1 / Node 24 LTS with a lockfile, subject to Q6. Do not add a test framework, code generator or runtime package merely because it appears in this plan. Use existing toolchain capabilities first; justify additions in the approved implementation PR.

Human first reviews this PR, proposed ADRs and Q1–Q7. Record approval scope and date in the knowledge base. Each milestone requires its own go-ahead; completion of M1 does not authorize Cubacle changes, consumer migrations, publication or M2. Cross-repository changes need separately scoped issues/PRs in their own repositories.

## Milestones and dependencies

| Milestone | Work and exit evidence | Dependencies / gate |
| --- | --- | --- |
| M0: compatibility baseline | Audit pinned consumers; preserve licensed legacy definitions, coordinate mappings and old solved results; confirm build/runtime and benchmark runner | Human scope approval; Q1,Q6,Q7; consumer maintainers |
| M1: exact foundation | Validated definitions/states, doubled coordinates, proper poses, moves/inverses, canonical codec; golden wire schema and complete examples | M0; ADR 0002/0003/0004 approval; phase approval |
| M2: goals and validation | Color/identity/pose/sticker predicates, symmetry, global-frame semantics, layered reachability reports and bounded parsing | M1; Q4; phase approval |
| M3: negotiated adapter | Capability probe, strict request/response, budgets/cancel, independent replay and negative fake-backend tests | M2; Q3; Cubacle maintainer contract agreement; phase approval |
| M4: consumer pilots | Separate small CubeLab and CubeAssembler adapters with dual-run comparison; retain old definitions and rollback | M3 or approved core-only pilot; each consumer's approval/PR |

No solver algorithm is implemented in these milestones. If Cubacle lacks a required goal, report unsupported and open a separately approved upstream dependency; do not implement search here.

## Test strategy

Trace tests to AC01–AC17. Golden fixtures include full source definitions and provenance, all six outer moves on N=2–7, both odd/even centers, a single inner layer, a wide move, same-color distinct IDs, wrong orientation and fixed/global goals. Test every size even when no solver advertises it. Use independent hand-derived coordinate examples and reference transformations to avoid testing an implementation against itself.

Property suites use recorded seeds and at least 1,000 sequences per certified size, lengths 0–100: move/inverse and fourth powers restore byte-equivalent canonical states; transforms preserve identity/occupancy/orthogonality/outward stickers; wide moves equal constituent layers. Include reflected matrices, impossible orbit placement, malformed types, duplicate fields and invalid groups. Distinguish invariant failure, replay-certified reachable and unknown. Cross-language fixtures require independently computed hashes and full-state replays, not merely matching visible colors. Archive failing seeds and minimized cases.

Classical compatibility means original definitions and goal semantics pass unchanged through approved adapters. Facelet-only export cannot losslessly represent rich identity; reject it unless the caller explicitly selects a documented lossy color-only projection. Browser rendering and Playwright are not needed for this headless specification; consumer UI tests belong to M4.

## Provisional performance acceptance (AC17, Q5)

Record CPU, OS, RAM, Node/compiler versions and commit; use a dedicated 2-vCPU/4-GiB Linux runner, one benchmark process, 100 warm-up samples and 1,000 measured samples, report median/p95. Benchmarks exclude Rust search, compilation, rendering and process startup. Proposed budgets: N=7 single layer transformation p95≤2 ms; complete structural validation p95≤10 ms; encode+decode+validate a ≤1 MiB fixture p95≤50 ms; 10,000 N=7 moves complete in ≤10 s with peak RSS≤256 MiB. Retained state storage should scale O(N²), each move no worse than O(N²), and explicit global-frame goal evaluation at most 24 evaluations. Deep goal-node cost is linear in encoded node count aside from indexed state lookups.

Budgets are proposals, not measured claims. Baseline before optimization; changes require recorded rationale and human approval, not a hidden threshold relaxation. Search has its own backend-enforced budgets and makes no latency/optimality guarantee. Hash/canonicalization allocations, even-cube orbit logic, large goals and matrix overhead are named performance risks.

## Review evidence and risks

Each implementation PR includes AC IDs, fixture provenance, test commands/results, unsupported profiles, benchmark environment and deltas, compatibility effects, unresolved questions and rollback plan. Do not report passing checks here as runtime conformance.

Primary risks: legacy orientation mismatch; solver global-rotation quotient; incomplete NxN reachability; rich goals unsupported in Rust; JSON memory/hash drift; licensing; unapproved language/runtime choices. Mitigate by pinned fixtures, explicit capability rejection, independent replay, layered evidence, and phase gates. The specification PR can be reviewed without resolving backend implementation dates; affected milestones remain blocked.
