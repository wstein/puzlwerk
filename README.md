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

PuzlWerk core (ReScript) supplies reusable mathematical puzzle models, states, move semantics and solver interfaces, with no DOM. It does not own rendering, scene or camera code, animations, application runtimes, or print-design UIs. The shared viewer is planned as the separate package `@puzlwerk/viewer` in this monorepo (not in the core package, not in an application); it is not yet implemented. It would own the scene (camera, lighting) and rendering without application knowledge, with the CubeScene model (proposed in [Cubistry #111](https://github.com/wstein/cubistry/issues/111), still open) as its intended contract. [Cubistry](https://github.com/wstein/cubistry) owns presentation, animation timing, themes, print, counters and calendar; CubeAssembler owns scan, device camera and validation; CubeLab keeps its own native WebGL viewport until the CubeLab migration (M3) is separately approved by the owner; the Cubacle solver (Rust) never depends on the viewer. Upper-layer applications such as the planned time-focused ChronoCube consume Cubistry. Dependencies flow Core <- Viewer <- applications, never backward. Each application migration (CubeAssembler, Cubistry, CubeLab) needs its own owner approval; until then existing viewer code stays where it is. This describes the intended architectural boundary, not a claim that all planned modules are implemented.


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

## Bounded 3×3 picture solver

The private [center-aware solver package](docs/knowledge-base/solver-3x3-picture.md) reuses the reviewed CubeLab implementation for calendar integration. Physical centers, goal symmetry and budget failures are explicit; ordinary 2×2 behavior remains unchanged.
