# PuzWerk

Coordinate-based twisty-puzzle model and virtual cube engine, designed for solver interoperability.

## Scope

- Piece identity, position and orientation independently of visible colors.
- Coordinate systems, legal moves and state transitions.
- Orientation equivalence and rotational symmetry (quarter-turn, half-turn and fully orientation-sensitive pieces).
- Goal predicates for color-only, position-sensitive and orientation-sensitive puzzles.
- Interoperability contracts for the Cubacle Rust CLI solver.

PuzWerk owns the canonical puzzle model; Cubacle owns solver search, pruning and heuristics. Visualization clients should consume the shared model rather than duplicate cube logic.

## Development

Read [AGENTS.md](AGENTS.md) and [the knowledge base](docs/knowledge-base/README.md). Work proceeds specification-first, with small focused conventional commits, tests, pull requests and human review. No implementation is authorized by this bootstrap alone.

## Initial roadmap

1. Specify core coordinates, piece identity, orientations and move semantics in `specs/001-core-foundation/`.
2. Define serialization and cross-language solver contract.
3. Implement a tested ReScript core after human approval.
4. Extend Cubacle to consume richer goal definitions without regressing color-only puzzles.

## Related projects

- [Cubacle](https://github.com/wstein/cubacle) — Rust solver and CLI.
- CubeLab and CubeAssembler — consumers/integration candidates; exact contracts to be reviewed.
