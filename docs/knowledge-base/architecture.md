# Architecture and ownership

PuzlWerk is the canonical ReScript domain engine for virtual twisty puzzles. It owns coordinate frames, piece identity, position and orientation, legal move transformations, goal predicates and stable serialization. The canonical core remains independent of search heuristics and rendering. The separately authorized [2×2 solver extraction](solver-2x2.md) is an optional reusable package, not search inside the core or a replacement for Cubacle.

## Consumers

- **Cubacle (Rust CLI):** search, pruning, optimization and solving against versioned puzzle/goal contracts.
- **CubeLab:** notation, experiments and puzzle tools.
- **CubeAssembler:** visualization and interactive assembly.

## Dependency direction

Consumers depend on PuzlWerk contracts. PuzlWerk must not depend on a particular solver or UI. Cross-language interchange requires deterministic fixtures, schema versioning and round-trip tests.

## Design constraints

Distinguish mechanical move legality from visual/goal equivalence. Keep solved-state tests configurable; never assume matching colors means identical pieces or correct orientation. Record any accepted coordinate convention in an ADR before implementation.
