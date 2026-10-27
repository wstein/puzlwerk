# PuzlWerk knowledge base

This directory is the canonical project context for architectural decisions and cross-repository coordination. Keep facts, proposals and decisions distinct.

## Domain concepts

- **Piece identity:** distinguishes pieces even when stickers/colors are identical.
- **Position:** coordinate-defined slot in a puzzle state.
- **Orientation:** a piece's pose relative to a specified reference frame.
- **Orientation equivalence:** symmetry subgroup defining when distinct poses satisfy the same goal (e.g. 90° or 180° rotational symmetry).
- **Move legality:** physical allowed transformations; separate from solved-state equivalence.
- **Goal predicate:** configurable condition for colors, identities, positions and orientations.

## Architecture boundaries

PuzlWerk defines state, transformations, validation and serialization. Cubacle (Rust) implements search and optimization; adapters must have versioned, tested contracts. CubeLab and CubeAssembler are potential consumers.

## Questions requiring a decision

1. Coordinate convention and reference frames for NxNxN cubes and nonstandard puzzles.
2. Piece types, indistinguishability and equivalence classes.
3. Representation of orientation groups and symmetry subgroups.
4. Move notation, serialization and ReScript/Rust interoperability.
5. Ownership of goal predicates and solver capability negotiation.
6. Compatibility fixtures and performance budgets.

## Decision process

Record each accepted architectural choice as an ADR under `docs/adr/`, with context, alternatives, consequences and date. Unresolved questions stay proposals, not implicit requirements.

## Foundation specification under review

[001 core foundation](../../specs/001-core-foundation/spec.md) contains the proposed requirements; [research](../../specs/001-core-foundation/research.md) tracks Q1–Q7, source pins and alternatives. Proposed ADRs [0002](../adr/0002-coordinates-and-moves.md), [0003](../adr/0003-identity-and-goal-symmetry.md) and [0004](../adr/0004-versioned-solver-boundary.md) cover frames/moves, physical identity/goal symmetry and solver interchange. None is accepted by this index. All 001 foundation implementation phases remain blocked pending explicit human approval.

## Scoped 2×2 solver migration

The maintainer separately authorized [the existing CubeLab solver extraction](solver-2x2.md)
for #5 after the Cubistry pilot. [ADR 0005](../adr/0005-reusable-2x2-solver.md)
records the narrow package/compatibility proposal. This does not approve the other
001 milestones, a general physical core, package publication or consumer migration.

## Project naming

Use PuzlWerk and `@puzlwerk/*` for active references. The
[technical rename inventory](rename-puzlwerk.md) records historical exceptions,
the coordinated GitHub operation and separate consumer follow-ups. Existing ADRs
and source provenance retain their original wording and hashes.
