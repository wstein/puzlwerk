# Agent working agreement

## Human-in-the-loop gates

- Read README and `docs/knowledge-base/README.md` before work.
- Begin with a spec and acceptance criteria; do not infer permission to implement from a planning request.
- Human approval is required before starting each implementation phase and before merging PRs.
- Never self-merge, force-push protected branches, or change repository settings without explicit authorization.

## Workflow

1. Capture decisions and open questions in the knowledge base.
2. Draft `specs/001-core-foundation/` (specification, plan, tasks) using Spec-Kit conventions.
3. Review architecture and interfaces before coding.
4. Implement small vertical slices with tests and focused Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).
5. Open a PR with scope, test evidence, risks, unresolved questions and linked spec. Await human review.

## Engineering rules

- Canonical piece identity, position, orientation, coordinate frames and goal semantics must be explicit.
- Separate physically legal moves from visually equivalent solved orientations.
- Support legacy color-only puzzles without silently changing their meaning.
- Keep the core independent of rendering, CLI and solver heuristics.
- Prefer deterministic pure functions, invariants, property-based tests and reproducible fixtures.
- ReScript is the proposed core implementation language; confirm build tooling during foundation specification.
- No speculative dependencies, generated code or sweeping rewrites without justification.
