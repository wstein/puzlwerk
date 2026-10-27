# PuzWerk knowledge base

This directory is the canonical project context for architectural decisions and cross-repository coordination. Keep facts, proposals and decisions distinct.

## Domain concepts

- **Piece identity:** distinguishes pieces even when stickers/colors are identical.
- **Position:** coordinate-defined slot in a puzzle state.
- **Orientation:** a piece's pose relative to a specified reference frame.
- **Orientation equivalence:** symmetry subgroup defining when distinct poses satisfy the same goal (e.g. 90° or 180° rotational symmetry).
- **Move legality:** physical allowed transformations; separate from solved-state equivalence.
- **Goal predicate:** configurable condition for colors, identities, positions and orientations.

## Architecture boundaries

PuzWerk defines state, transformations, validation and serialization. Cubacle (Rust) implements search and optimization; adapters must have versioned, tested contracts. CubeLab and CubeAssembler are potential consumers.

## Questions requiring a decision

1. Coordinate convention and reference frames for NxNxN cubes and nonstandard puzzles.
2. Piece types, indistinguishability and equivalence classes.
3. Representation of orientation groups and symmetry subgroups.
4. Move notation, serialization and ReScript/Rust interoperability.
5. Ownership of goal predicates and solver capability negotiation.
6. Compatibility fixtures and performance budgets.

## Decision process

Record each accepted architectural choice as an ADR under `docs/adr/`, with context, alternatives, consequences and date. Unresolved questions stay proposals, not implicit requirements.
