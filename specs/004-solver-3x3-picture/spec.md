# Bounded 3×3 picture solver package

Status: implementation authorized by the maintainer on October 29, 2026; Draft review required.

Reuse CubeLab's reviewed center-aware two-phase implementation at
`08e079f3bc211777d8980f75ec6a7f61979dd2ac` through a private PuzlWerk package.
The existing 2×2 API, source and table remain unchanged. This scoped extraction
is not the general foundation or an npm publication.

Acceptance:

- Fixed URFDLB facelets and physical center quarter turns in ULFRBD order.
- Explicit center goal periods 1/2/4; integer and physical parity validation.
- Existing bounded search and full ordinary/center replay; distinguish invalid
  input from exhausted budgets. No universal 21-move or completeness claim.
- No browser, rendering or transport ownership in the synchronous package.
  Consumers run it inside their existing bounded worker boundary.
- Exact upstream source hashes, retained license/notices, reproducible package
  and isolated consumer tests; preserve ordinary 2×2 compatibility.
- Cubistry independently checks its complete physical candidate and keeps the
  existing direct solver as a checked fallback.

The user approved optimistic stacked implementation; merge, deployment and
package publication require separate human approval. Tracks PuzlWerk issue #6.
