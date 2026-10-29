# PuzlWerk knowledge base

Canonical Git-versioned project knowledge. Facts, proposals, requirements and
historical evidence have different authorities; an index link never accepts an ADR.

## Start here

- [Conventions, metadata and public views](CONVENTIONS.md)
- [Inventory, ownership and unresolved contradictions](INVENTORY.md)
- [Machine-readable baseline inventory](inventory.json)
- [Proposed curated navigation](publication.json)
- [Stage 1 scope and acceptance](../../specs/003-knowledge-base/spec.md)

## Atomic notes

- [pw-20261028-001 — Physical identity survives visual equivalence](notes/pw-20261028-001-identity-and-equivalence.md)
- [pw-20261028-002 — Exact replay and shortest-path guarantees are separate claims](notes/pw-20261028-002-replay-and-optimality.md)
- [pw-20261028-003 — An implemented scoped package does not approve the general foundation](notes/pw-20261028-003-package-and-foundation.md)

Each note has stable identity, maturity, visible sources and reciprocal related
links. `npm run docs:check` validates the graph and computes backlinks without
maintaining another content database. All notes remain public repository content;
publication candidates are a proposed curated view, not deployment permission.

## Canonical reference and context

- [Scoped 2×2 API, modes, physical profile, metrics, provenance and license](solver-2x2.md)
- [Architecture and ownership design intent](architecture.md)
- [Proposed Cubacle solver contract overview](solver-contract.md)
- [Development workflow and initial work order](workflow.md)
- [Repository metadata proposal](repository-metadata.md)
- [Historical rename inventory](rename-puzlwerk.md)

The private scoped solver is implemented and Cubistry PR #31 is merged. The general
NxN foundation and Cubacle rich-goal protocol remain proposals. The implemented
package is not an npm publication or general core release. Use lowercase
`puzlwerk`, `@puzlwerk/*` and `wstein/puzlwerk` for active technical references;
historical ADRs and source hashes keep their original wording.

## Decisions, specifications and open questions

- [ADR index](../adr/README.md): ADRs 0001–0005 retain their recorded statuses.
- [Accepted ADR 0006: canonical knowledge and curated views](../adr/0006-canonical-knowledge.md)
- [001 foundation specification](../../specs/001-core-foundation/README.md)
- [Foundation research/Q1–Q7](../../specs/001-core-foundation/research.md): frames,
  move notation, identity/symmetry, capability negotiation, reachability,
  compatibility fixtures and performance budgets still need their scoped decisions.
- [002 solver extraction requirements](../../specs/002-solver-2x2/spec.md)

No accepted architecture is silently inferred or overwritten by this migration.
The Stage 2 [Starlight publishing view](../site/README.md) is merged (PR #18) and
reuses these canonical sources. Settings changes and production deployment remain
explicit approval boundaries.
