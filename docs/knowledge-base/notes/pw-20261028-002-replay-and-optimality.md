---
id: pw-20261028-002
title: Exact replay and shortest-path guarantees are separate claims
kind: evergreen
status: verified
audience: developer
publication: developer-candidate
related: ["pw-20261028-001", "pw-20261028-003"]
sources: ["../solver-2x2.md", "../../../test/solver.test.mjs", "../../../scripts/verify-package.mjs", "https://github.com/wstein/cubistry/pull/31"]
---
# Exact replay and shortest-path guarantees are separate claims

A legal sequence reaching an exact target establishes correctness for that
transition. It does not establish that no shorter sequence exists. Independent
replay must compare the complete bodies and attached sticker frames, not just the
visible front, and should pass each actual result into the next transition.

The shared solver's `rotationEquivalent` guarantee concerns HTM distance in the
whole-cube rotation quotient. Its `exactPhysical` result includes frame-correction
turns and has no general HTM-optimality guarantee. A half turn and a quarter turn
each count as one HTM token. The fixed Cubistry 42 → 43 regression is ten HTM;
that measurement is not a theorem about every exact or partial-display goal.

## Sources

- [Authoritative metrics, modes and limitations](../solver-2x2.md).
- [Endpoint, orientation and chained-transition tests](../../../test/solver.test.mjs).
- [Packed consumer and exact 42 → 43 replay](../../../scripts/verify-package.mjs).
- [Merged Cubistry integration and browser evidence](https://github.com/wstein/cubistry/pull/31).

## Related

- [pw-20261028-001: Physical identity](pw-20261028-001-identity-and-equivalence.md).
- [pw-20261028-003: Package and foundation scope](pw-20261028-003-package-and-foundation.md).
