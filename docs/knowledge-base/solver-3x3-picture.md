# Bounded 3×3 picture solver

The private `@puzlwerk/solver-3x3-picture@0.1.0` package extracts the reviewed
CubeLab center-aware two-phase implementation at commit
`08e079f3bc211777d8980f75ec6a7f61979dd2ac`. It is not an npm publication,
a general model foundation, or an optimal/complete solver. Its
[specification](../../specs/005-solver-3x3-picture/spec.md) tracks the maintainer's
approved calendar integration and [issue #6](https://github.com/wstein/puzlwerk/issues/6).

## API version 1

`solvePicture3x3(request)` is synchronous and browser-safe. Run it inside a
worker with a hard deadline and cancellation; the node budget does not interrupt
first-use table preparation. It returns `solved`, `unknown` or `invalid`.

Inputs:

- `facelets`: exactly 54 uppercase URFDLB color characters, row-major faces in
  **U/R/F/D/L/B** order, with the canonical fixed center-color frame.
- `centerOrientations`: six actual clockwise quarter turns, integers 0..3,
  in **U/L/F/R/B/D** order. Colors cannot reconstruct this physical data.
- `symmetry`: six goal periods 1, 2 or 4, in U/L/F/R/B/D order. Default all 4;
  1 ignores rotation, 2 permits a half turn, 4 requires exact original up.
- `maximumDepth`: integer 0..24, default 22, measured in outer-face HTM.
- `maximumNodes`: integer 1..10,000,000, default 100,000.

Both ordinary cubie invariants and center/corner parity are validated before
optical goals are considered. Ignored centers still have physical orientations.
Whole-cube-normalized inputs must transform printed orientations explicitly;
the package rejects a noncanonical center-color frame.

A solved result contains immutable `moves`, `htm`, `qtm` and the six resulting
physical `centerOrientationsAfter`. The inherited engine independently replays
colors and center goals before returning an answer. `unknown` means the bounded
search failed, exhausted nodes, or could not verify an answer; it is not an
impossibility assertion. The inherited phase-one cap is 12 HTM. There is no
universal 21-move guarantee; Kociemba's residual-center result has a different
scope from arbitrary picture states and calendar goals.

## Consumer and ownership boundary

A calendar may assign temporary solver colors from a canonical target's physical
face normals, read the actual pose in that frame, and request exact orientation
only for its visible printed center. Hidden center goal periods may be 1 without
changing their physical images or invalidating parity. All candidate words must
then be replayed against the consumer's authoritative full sticker state and
accepted only if valid and strictly shorter than its existing checked route.

PuzlWerk owns this reusable provider. CubeLab's compatibility implementation
remains at its reviewed revision during the Draft handoff; this change does not
migrate its UI. The package retains upstream ReScript sources, hashes, AGPL
license and notices. A separate ReScript build project avoids changing the
existing 2×2 package's module names, source, table or API.

```sh
npm ci
npm run check
npm run test:package
npm run docs:check
npm run test:docs
```

The source provenance regression checks all twelve retained modules byte for
byte. Package regressions cover malformed inputs, physical parity, optical
symmetry, exhausted budgets, normal move/inverse replay and a six-move positive
case with identical colors but different printed-center orientations.
