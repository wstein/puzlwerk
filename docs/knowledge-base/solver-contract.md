# Solver interoperability: PuzWerk ↔ Cubacle

**Status: proposal, not an implemented interface.**

A solver request should carry a versioned puzzle definition, initial state, legal move set, goal predicate and optional optimization limits. The response should carry a move sequence, its metric, and an explicit outcome (solved, unsatisfiable, timeout or unsupported).

## Goal semantics

- Color-only goals can ignore individual piece identity.
- Position-dependent goals require the specified piece at its target coordinate.
- Orientation-sensitive goals require a specified pose relative to a reference frame.
- Symmetric pieces can accept orientation modulo quarter-turn classes: 1 (360°), 2 (180°), or 4 (90°) equivalent poses, where the selected axis and symmetry group make this meaningful.

The symmetry subgroup is a property of the goal/physical piece, **not** permission to perform extra moves. Generalize beyond a single axis only after defining the orientation group.

## Acceptance tests

1. Legacy color cube remains solvable with unchanged semantics.
2. Equal-colored but distinct pieces cannot be interchanged in identity-sensitive goals.
3. Correct position with wrong orientation fails an orientation-sensitive goal.
4. 90° and 180° symmetric goals accept only their defined equivalent poses.
5. Invalid moves and unsupported goal features are rejected explicitly.
6. Solver output replays deterministically through PuzWerk to a verified goal state.
