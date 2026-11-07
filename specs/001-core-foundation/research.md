# Research and decision register

Status: Proposed, 2026-10-27. This is repository/design research, not execution evidence for a new implementation.

Status 2026-11-05: Q1 approved with certification scope narrowed to N=2 and N=3 (sizes 4–7 need a separate approval); the pose layout and center twist are fixed by [ADR 0008](../../docs/adr/0008-q1-scope-and-core-pose.md). This text keeps its recorded wording.

Status 2026-11-07 (owner decisions, recorded by T001):

- **Q1:** approved 2026-11-05, see [ADR 0008](../../docs/adr/0008-q1-scope-and-core-pose.md).
- **Q2:** approved for M1 as outer faces plus wide moves. Slices (M/E/S), global rotations (x/y/z) and lowercase wide aliases are not supported by text parsing; unknown notation fails (AC09, AC10). The AST stays complete. This approves T006 and T007.
- **Q6:** approved as proposed: ReScript 12.3.1, ES modules, Node 24 LTS, npm lockfile. The repository already pins `rescript` 12.3.1 and `engines.node` `>=24`. Node 24.22.2 is the version used for M1 checks.
- **Q7:** open. M1 does not depend on it.
- **ADR 0002, 0003 and 0004:** approved by the owner on 2026-11-07; the status change is a separate PR.
- **T002 and T003:** deferred for M1. The conformance fixtures F1 to F7 with their provenance files stand in for them, and M1 tests run against F1 to F7. Q3 to Q5 are untouched.
- License audit: covered only for the F1 to F7 fixture sources ([CONFORMANCE-NOTICE](../../test/fixtures/CONFORMANCE-NOTICE.md)). The pinned consumer revisions are not audited by this record.

## Existing sources

Read the [knowledge base](../../docs/knowledge-base/README.md), [architecture](../../docs/knowledge-base/architecture.md), [solver proposal](../../docs/knowledge-base/solver-contract.md), [workflow](../../docs/knowledge-base/workflow.md), ADR 0001 and Issue #3. They establish ownership and approval gates but do not choose coordinates, codecs or NxN support.

Upstream HEADs observed through GitHub on 2026-10-27:

| Repository | Revision | Dependency to verify before adapter implementation |
| --- | --- | --- |
| [Cubacle](https://github.com/wstein/cubacle/tree/233045908fe3b3a2ef5e57e410549d438614c820) | 233045908fe3b3a2ef5e57e410549d438614c820 | Exact-frame versus rotation-quotiented solving; capability/version protocol; goal support; move conventions |
| [CubeLab](https://github.com/wstein/cubelab/tree/89053d06df0a992acf68506d0dec5082c71dfaab) | 89053d06df0a992acf68506d0dec5082c71dfaab | Existing color definitions, orbit/center treatment, notation and goal semantics |
| [CubeAssembler](https://github.com/wstein/cube-assembler/tree/d62d1715e041c6b808fcce08c597fcb4a3ce5c98) | d62d1715e041c6b808fcce08c597fcb4a3ce5c98 | Geometry axes, sticker frames, assembly validation, public definition formats |

These pins establish reproducible audit targets, **not** verified adapter compatibility. No cross-repository code change or solver feature is part of this PR. Before importing source/fixtures, inspect licenses and record provenance; do not assume common ownership permits unrestricted relicensing. Re-audit pins if upstream changes.

## Alternatives

| Topic | Proposed choice | Alternatives and tradeoffs | Record |
| --- | --- | --- | --- |
| Coordinates | Right-handed integer doubled lattice | 0-based indexing is compact but obscures centered rotations; floats introduce rounding | ADR 0002 |
| Pose | Explicit proper 3×3 integer matrix | 0–23 orientation indices smaller but require a shared table; quaternions inappropriate for exact discrete equality | ADR 0003 |
| Identity | Stable physical IDs independent of colors | Facelet-only compact representation loses equal-color identities and sticker-up | ADR 0003 |
| Symmetry | Goal comparison via explicit groups | Normalizing physical states loses information; arbitrary angle lists need not be groups | ADR 0003 |
| Wire | Versioned bounded canonical JSON | Binary codec more compact but less reviewable; JS object ABI excludes Rust | ADR 0004 |
| Reachability | Layered evidence with unknown | Full general NxN membership algorithm is a separate undertaking | ADR 0003 |
| Toolchain | Proposed pinned ReScript 12.3.1, Node 24 LTS, npm lock | Repository has no build yet; consumer compiler/module compatibility must be checked | Q6 |

## Open questions and disposition

- **Q1 (approval blocker):** Approve frame/face-up table and 2–7 certification scope? Confirm each consumer mapping with pinned fixtures before compatibility claims.
- **Q2 (notation milestone blocker):** Approve legal multi-layer policy; which notation aliases, slices and global rotations should public text parsing support? AST semantics are complete without aliases.
- **Q3 (Cubacle adapter blocker):** Which proposed goal nodes, exact reference frames, sizes and moves does Cubacle actually support? Assign a Cubacle maintainer to approve its capability response and required follow-up issue. Unsupported is acceptable; silent weakening is not.
- **Q4 (reachability milestone blocker):** Which size/policy combinations receive complete reachability checks? Start with replay certificates and documented invariants; unknown is an intentional result.
- **Q5 (performance gate):** Approve provisional budgets and reference CI runner; record baseline before optimization. Numeric representation/limits may need revision from measurement.
- **Q6 (build gate):** Confirm ReScript 12.3.1/ES modules, Node 24 and supported consumer runtimes. No dependency or compiler is installed by this PR.
- **Q7 (legacy import blocker):** Who supplies approved solved semantics and authoritative fixtures for each consumer? Preserve original definitions as bytes plus provenance; do not silently replace them with newly invented ones.

Proposed decisions may be approved individually. Unanswered questions remain visible in the knowledge-base index; implementation tasks depending on them stay blocked. The specification is implementation-ready at the semantic boundary, with these explicit human/consumer decisions rather than guessed compatibility.
