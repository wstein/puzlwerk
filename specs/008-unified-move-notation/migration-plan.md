# Migration and decision proposal

Status: architecture proposal, 2026-11-15. Implementation, migrations, packages, Play activation and publication require their existing authorizations. This plan does not alter SM1, SM7, SM9, Q2 or application migration gates. See the [inventory](inventory.md), [matrix](standards-matrix.md) and [API proposal](api-proposal.md).

## Phases and rollback

1. **Evidence and decisions.** Resolve the CubeLab 3/5 slice documentation discrepancy; trace saved algorithms, share links and all consumers, including Regrip and extension paths. Establish source provenance and license compatibility before reuse. Agree on vectors and the decisions below. No production behavior changes.
2. **Shared boundary after approval.** Implement a single Core-owned formatting policy and explicitly scoped compatibility adapters; preserve Q2 parser behavior. Establish typed ReScript and TypeScript boundaries, source dialect and version metadata. Demonstrate equivalence with independent vectors before selecting any implementation reuse. Roll back by disabling the new boundary and retaining existing import and display paths; keep original stored text and metadata intact.
3. **Parallel verification.** Compare new formatting and replay against existing CubeLab and Cubistry behavior in tests, including known differences as explicit fixtures. Keep old paths as a temporary compatibility baseline, not a second permanent policy. A mismatch blocks cutover; no automatic rewrite of saved strings.
4. **Application cutovers, separately approved.** Adapt Playground and Picture Cube, then other consumers according to their own gates. Play gestures and solver results pass typed moves to the shared boundary; camera orbit remains presentation. Keep legacy import dialects and links working. Roll back each consumer independently to its previous reader and display path without rewriting stored data. Do not change CubeLab or CubeAssembler migration gates.
5. **Retire duplicate policy only after evidence.** Remove old mappings only after every approved consumer, historical input and rollback window has a verified replacement. Preserve source provenance, license notices and compatibility fixtures. A consumer still dependent on the old engine is a blocker, not a reason to silently remove it.

## Verification contract

For each N=2, 3, 4, 5, 6, 7, create independently derived token-to-AST vectors for each face, direction and half turn, valid wide widths and their boundaries, actual rotations, interior single layers and contiguous ranges. Include N=2 absence of interior/wide blocks, odd/even middle layers, full width, zero, reversed, out-of-range and noncontiguous selections. Assert typed errors for unsupported forms. Check both opposite-face descriptions against the same selected layers and sign, including ties and inverse half turns. Verify semantic state equivalence by executing parsed output, including noncommuting rotation-then-face sequences and inverse sequences; string equality alone is insufficient. The existing CubeLab parser rejects 6–7, so those sizes require new coverage, not an assumed round trip.

Exercise modern, legacy lowercase, Ruwix, SSE, ACube and other previously supported dialect fixtures with explicit selection and located failures. Preserve structured groups, comments and pauses where supported; report loss where not. Test old saved strings and share links with their source version, absent/unknown version and ambiguous tokens; retain originals and require an explicit choice when interpretation cannot be proven. Test generated TypeScript declarations and runtime boundary, errors and invalid inputs. Browser integration must compare displayed history, replay, copy/export and solver order and verify camera-only orbit produces no move. Include negative tests and mutation evidence for each new check, according to repository rules. Run existing compatibility and package suites as applicable; no implementation tests have been run by this plan.

## Owner decision register

These are proposals; implementation remains blocked until the applicable decisions and phase approvals are recorded. Existing canonical AST and Q2 decisions are not reopened.

| Decision | Recommendation and reason | Cost and consequence |
| --- | --- | --- |
| Ownership and packaging | Core-adjacent single policy, existing source tree first; no new package initially. Avoid a reverse dependency on CubeLab. | Public bindings and license review still need design; eventual package/export requires separate authorization. |
| Default interior/range profile | WCA outer/block and physical rotation tokens plus explicit SiGN-style numbered layers and ranges, with the deterministic tie break in the matrix. | Extensions are not official WCA tokens; arbitrary selections return typed unsupported errors. |
| Input and UI selection | Keep Q2 parser unchanged; compatibility import requires explicit dialect. Offer a UI selection only when a user imports ambiguous legacy text. | Additional UI and diagnostics; no silent inference of an old meaning. |
| Saved data and sharing | Version typed semantic data and record source dialect/version and original text when imported. Preserve existing links; require a choice if provenance is absent and interpretation ambiguous. | More metadata and migration fixtures; old links cannot all be silently normalized. Wire format and compatibility policy need a separate concrete design. |
| Physical frame and camera | Record physical rotations explicitly and carry frame through replay; camera orbits never generate puzzle moves. | Requires frame vectors and integration tests; applications must supply the distinction. |
| Reuse and extraction | Reuse evidence first; decide code extraction only after license and dependency review, preserving structured algorithms. | May require an adapter or a fresh implementation and staged de-duplication; no automatic permission to copy AGPL code into Core. |
| Sequencing | Verify shared semantics before separately approved consumer migrations; retain current Play and release gates. | Temporary parallel baseline and per-app cutover work. |
