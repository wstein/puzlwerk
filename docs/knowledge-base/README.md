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

Atomic knowledge notes are not stored in this repository.
Decisions, requirements and API reference keep their authorities here: ADRs in
`docs/adr/`, requirements in `specs/`, reference in the documents below.

## Canonical reference and context

- [Scoped 2×2 API, modes, physical profile, metrics, provenance and license](solver-2x2.md)
- [Bounded 3×3 picture solver, physical center goals and limits](solver-3x3-picture.md)
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
- [ADR 0008: Q1 scope and the single core pose](../adr/0008-q1-scope-and-core-pose.md): accepted by the owner on 2026-11-05; approves the Q1 frame and face-up table, certification for N=2 and N=3 first, and the pose layout.
- [ADR 0006: canonical knowledge and curated views](../adr/0006-canonical-knowledge.md), superseded in part by [ADR 0007](../adr/0007-atomic-notes-not-stored-here.md)
- [001 foundation specification](../../specs/001-core-foundation/README.md)
- [Foundation research/Q1–Q7](../../specs/001-core-foundation/research.md): frames,
  move notation, identity/symmetry, capability negotiation, reachability,
  compatibility fixtures and performance budgets still need their scoped decisions,
  except Q1 (approved 2026-11-05, see ADR 0008).
- [002 solver extraction requirements](../../specs/002-solver-2x2/spec.md)

No accepted architecture is silently inferred or overwritten by this migration.
The Stage 2 [Starlight publishing view](../site/README.md) is merged (PR #18) and
reuses these canonical sources. Settings changes and production deployment remain
explicit approval boundaries.
