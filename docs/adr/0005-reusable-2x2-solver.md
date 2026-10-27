# ADR 0005: Reuse the CubeLab 2×2 solver as an optional package

Status: Proposed for acceptance with the solver migration PR
Date: 2026-10-27

## Context and authority

The maintainer's #5 work item authorizes a focused migration after the merged
Cubistry pilot. This is not approval of all foundation milestones or #8/#9's
broader framework roadmap. Older architecture proposals separate the core from
search; that separation still holds. Cubacle remains an independent Rust provider.

## Proposed decision

Maintain the existing CubeLab ReScript algorithm/table in the private, headless
`@puzwerk/solver-2x2` package, independently of the canonical core and renderer.
Preserve AGPL attribution. Take table bytes explicitly and expose a bound
`solve2x2(from, target, {mode})` API. The mode is mandatory: `rotationEquivalent`
inherits quotient HTM optimality; `exactPhysical` adds existing frame correction
and does not promise composed HTM optimality. Return only legal face-turn HTM tokens.

Use an explicit adapter for Cubistry's accepted physical v1 print/state wire format.
There is no executable PuzWerk core to depend on yet; do not invent another canonical
physical model. Keep CubeLab coordinates private and validate full poses/identities.
The future approved core migration must preserve these compatibility fixtures.

## Alternatives

- Keep the implementation in CubeLab or copy it separately into each app: leaves
  reusable ownership fragmented and conflicts with #5.
- Implement a new search/table or new physical engine now: unnecessary and outside scope.
- Return quotient solutions as exact: loses the fixed printed frame.
- Move all consumer/core packages first: expands this narrow work and preempts #9.

## Consequences and acceptance

The package has an AGPL boundary and a small compiler-runtime dependency. It retains
the existing private dependency closure rather than rewriting the solver. A proposed
package name is not publication or registry ownership. Validate by independent
body/sticker replay and a packed consumer. Existing applications are unchanged.

See the canonical [solver knowledge note](../knowledge-base/solver-2x2.md) for
API, coordinate conventions, metrics, provenance, tests and consumer requirements.
Human review/merge and a separate Cubistry integration approval remain required.
