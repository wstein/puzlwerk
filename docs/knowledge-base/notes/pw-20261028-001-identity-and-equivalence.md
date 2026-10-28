---
id: pw-20261028-001
title: Physical identity survives visual equivalence
kind: evergreen
status: verified
audience: developer
publication: developer-candidate
related: ["pw-20261028-002", "pw-20261028-003"]
sources: ["../solver-2x2.md", "../../../test/helpers/physical-replay.mjs", "../../adr/0003-identity-and-goal-symmetry.md", "https://github.com/wstein/puzlwerk/issues/5"]
---
# Physical identity survives visual equivalence

A visually equivalent target does not make physical stickers interchangeable.
Keep cubie IDs, attached sticker IDs and exact body poses in the state; apply
equivalence only when evaluating the chosen goal. A symmetric glyph is not an
extra legal move or permission to discard its physical orientation.

For the implemented 2×2 profile, `exactPhysical` reaches the complete target in
the fixed world frame. `rotationEquivalent` permits one proper global rotation
of that target. Neither mode swaps identical-looking stickers or normalizes away
their attachment to cubies. These facts are verified for the scoped package and
its independent tests, not for an implemented general NxN core.

## Sources

- [Current API and exact mode semantics](../solver-2x2.md).
- [Independent integer geometric replay](../../../test/helpers/physical-replay.mjs).
- [Proposed general identity/goal decision](../../adr/0003-identity-and-goal-symmetry.md)
  remains proposed; the scoped implementation does not accept it automatically.
- [Solver work item #5](https://github.com/wstein/puzlwerk/issues/5).

## Related

- [pw-20261028-002: Exact replay and optimality](pw-20261028-002-replay-and-optimality.md).
- [pw-20261028-003: Scoped packages and foundation proposals](pw-20261028-003-package-and-foundation.md).
