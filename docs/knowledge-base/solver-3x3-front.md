# Front-goal 3x3 solver

The private `@puzlwerk/solver-3x3-front` package is the ReScript implementation of the Cubacle front-goal search for the
`front-image-classes` goal (protocol minor 1.2). Its [specification](../../specs/007-solver-3x3-front/spec.md) records the
owner decision of 2026-11-15 and the acceptance; the [package README](../../packages/solver-3x3-front/README.md) is the
API reference (request and answer format, Groups9 tables, budgets, progress and cancel, rotation words) and lists the
differences from the Rust engine. The goal codec and evaluator (T013a) are not part of the package.
