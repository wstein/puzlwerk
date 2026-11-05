# Agent working agreement

## Human-in-the-loop gates

- Read README and `docs/knowledge-base/README.md` before work.
- Begin with a spec and acceptance criteria; do not infer permission to implement from a planning request.
- Human approval is required before starting each implementation phase.
- Agent collaboration (roles, review, Ready, merge, rewrite, stacks, labels, identity, reports) follows the global agent rules, not this file.

## Workflow

1. Capture decisions and open questions in the knowledge base.
2. Draft `specs/001-core-foundation/` (specification, plan, tasks) using Spec-Kit conventions.
3. Review architecture and interfaces before coding.
4. Implement small vertical slices with tests and focused Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `refactor:`).

## Engineering rules

- Canonical piece identity, position, orientation, coordinate frames and goal semantics must be explicit.
- Separate physically legal moves from visually equivalent solved orientations.
- Support legacy color-only puzzles without silently changing their meaning.
- Keep the core independent of rendering, CLI and solver heuristics.
- Prefer deterministic pure functions, invariants, property-based tests and reproducible fixtures.
- ReScript is the proposed core implementation language; confirm build tooling during foundation specification.
- No speculative dependencies, generated code or sweeping rewrites without justification.

## Git history and atomic commits

- Merge: Rebase and merge only.

## PuzlWerk naming conventions

- Display/branding: **PuzlWerk**. Technical identifiers, paths, directory names and imports always use lowercase `puzlwerk`.
- GitHub repository: `wstein/puzlwerk`. npm scope: `@puzlwerk/*`; a scope name does not imply a published package or authorize a new dependency.
- Apply exact-case, context-aware edits to active references; never use global case-insensitive replacements.
- Preserve historical ADR wording, immutable snapshots, source URLs/revisions/hashes, quotations and license/copyright notices. Classify old-name occurrences as historical, active or uncertain; report uncertain cases for review instead of silently changing them.
- Naming-only work does not authorize a solver/application change, package publication or migration. Preserve existing `@cubistry/*` packages.

## Knowledge authoring

- Follow [knowledge conventions](docs/knowledge-base/CONVENTIONS.md). Atomic notes are not stored in this repository.
- Keep requirements in specs, decisions in ADRs, API details in their reference and immutable evidence at its source. Preserve existing paths and historical provenance.
- Run `npm run docs:check` and `npm run test:docs` for documentation changes. Publication metadata selects public content; it does not authorize deployment or imply unselected content is private.
