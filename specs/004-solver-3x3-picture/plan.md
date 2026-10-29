# Implementation plan

1. Freeze and retain the reviewed CubeLab solver source and its minimal module closure.
2. Build it as a separate ReScript project so 2×2 module names and artifacts remain stable.
3. Expose a validated versioned JavaScript/TypeScript API and package provenance.
4. Verify center-sensitive positive/negative cases and isolated package installation.
5. Consume the package from the calendar's bounded worker and compare actual chained transitions.

CubeLab's existing compatibility implementation remains pinned during this Draft
handoff. PuzlWerk owns the reusable provider; no independent search algorithm is
introduced and no CubeLab UI migration is claimed.
