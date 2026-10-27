# 001 — Core foundation (planning only)

**Status:** proposed; not approved for implementation.

## Problem

Color-only cube representations cannot express all piece identities, exact destination constraints or orientation-sensitive goals. A shared, solver-neutral model is needed.

## Deliverables for specification review

- Domain vocabulary and explicit invariants.
- Coordinate and orientation model with worked examples.
- Move transformations and legality constraints.
- Configurable solved-state goal semantics, including 90°/180° symmetry cases.
- Versioned interchange format and Cubacle adapter proposal.
- Compatibility strategy for classic color cubes.
- Test matrix, risks, alternatives and phased tasks.

## Acceptance criteria (to refine)

- Identity and color are independently representable.
- Correct piece position does not imply correct orientation.
- Orientation equivalence is mathematically defined and tested.
- Legal move sets are not inferred from visual symmetry.
- Classic color-only puzzle goals remain expressible.
- The solver boundary does not depend on UI or rendering.

**Gate:** Human review of spec, plan and tasks before any production implementation.
