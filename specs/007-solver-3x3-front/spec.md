# Front-goal 3x3 solver package

Status: implementation of the solver extension per owner decision of 2026-11-15 (ReScript in PuzlWerk, no WebAssembly);
Draft review required.

A private package `@puzlwerk/solver-3x3-front` reproduces the Cubacle front-goal search (nine accepted sticker lists, free
whole-cube rotation, optional upright center) in ReScript with typed arrays, so that the logic of the
`front-image-classes` goal (protocol minor 1.2, [solver-stream.md](../001-core-foundation/contracts/solver-stream.md))
has a reusable solver in this repository.

Acceptance:

- Same function as the Rust engine: status, route, final rotation and node counts equal on 183 recorded cases; the
  fixtures record their origin and keep the check verifiable without Cubacle.
- Shortest route in half turns, at most two rotation tokens, replay by an independent cube model.
- Time, node and table budgets, a progress observer and a cancel flag; no allocation in the search loop.
- Out of scope: the goal codec and evaluator (T013a), the consumer adapter (goal builder, pose normalizer) and any
  publication of the package.

See the [package README](../../packages/solver-3x3-front/README.md) for the API and the measured differences.
