# PuzlWerk

Rendering-independent twisty-puzzle foundation for physical state models, legal moves, and reusable solvers.

## Scope

- Piece identity, position and orientation independently of visible colors.
- Coordinate systems, legal moves and state transitions.
- Orientation equivalence and rotational symmetry (quarter-turn, half-turn and fully orientation-sensitive pieces).
- Goal predicates for color-only, position-sensitive and orientation-sensitive puzzles.
- Interoperability contracts for the Cubacle Rust CLI solver.

PuzlWerk owns the canonical puzzle-model design and the separately scoped reusable [2×2 solver extraction](docs/knowledge-base/solver-2x2.md). Cubacle remains an independent optional Rust solver provider. Visualization clients should consume the shared model rather than duplicate cube logic.

## Ecosystem boundary

PuzlWerk supplies reusable mathematical puzzle models, move/state semantics, and solver interfaces. It does not own browser rendering, 3D viewers, animations, application runtimes, or print-design UIs. [Cubistry](https://github.com/wstein/cubistry) consumes the foundation for its cube-display framework and visualizer; upper-layer applications such as the planned time-focused ChronoCube consume Cubistry. Dependencies flow from applications to Cubistry to PuzlWerk, never backward. This describes the intended architectural boundary, not a claim that all planned modules are implemented.


## Development

Read [AGENTS.md](AGENTS.md) and [the knowledge base](docs/knowledge-base/README.md). Work proceeds specification-first, with small focused conventional commits, tests, pull requests and human review. No implementation is authorized by this bootstrap alone.

## Knowledge navigation

The [canonical knowledge index](docs/knowledge-base/README.md) links atomic notes,
API reference, proposed decisions and specifications. See the
[inventory and status review](docs/knowledge-base/INVENTORY.md) before interpreting
historical roadmap text as current implementation status. Documentation checks:
`npm run docs:check` and `npm run test:docs`.

## Initial roadmap

1. Specify core coordinates, piece identity, orientations and move semantics in `specs/001-core-foundation/`.
2. Define serialization and cross-language solver contract.
3. Implement a tested ReScript core after human approval.
4. Extend Cubacle to consume richer goal definitions without regressing color-only puzzles.

## Related projects

- [Cubacle](https://github.com/wstein/cubacle) — Rust solver and CLI.
- CubeLab and CubeAssembler — consumers/integration candidates; exact contracts to be reviewed.

## Reusable 2×2 solver (private package)

The [scoped migration](specs/002-solver-2x2/spec.md) reuses CubeLab's existing
ReScript algorithm/table. Choose `rotationEquivalent` or `exactPhysical` explicitly;
only the former guarantees HTM optimality in the rotation quotient. The composed
exact-frame solution does not claim HTM optimality. No application is migrated here.

```sh
npm ci
npm run check
npm run test:package
```

See [API, provenance, license and integration requirements](docs/knowledge-base/solver-2x2.md).
The package is private and AGPL-3.0-or-later; it is not a published canonical core.
The broader foundation plan and unrelated framework phases retain their approval gates.

## Rename coordination

The target repository is `wstein/puzlwerk` and private packages use `@puzlwerk/*`.
The maintainer performs the GitHub repository rename separately; this technical
rename does not publish packages or change repository settings. See the
[rename inventory and external follow-ups](docs/knowledge-base/rename-puzlwerk.md).
