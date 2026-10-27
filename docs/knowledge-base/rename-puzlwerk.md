# PuzlWerk technical rename inventory

Date: 2026-10-27. Authorized by the maintainer's technical rename work item.
Base: `738ef79045a89217534f123759c978b1d34c38d4`, after solver migration PR #13
was merged. This records a naming change, not a solver or architecture change.

## Naming and release coordination

| Item | Previous name | Target name |
| --- | --- | --- |
| Project | PuzWerk | PuzlWerk |
| GitHub repository | `wstein/puzwerk` | `wstein/puzlwerk` |
| Root npm/ReScript project | `puzwerk` | `puzlwerk` |
| Private solver package | `@puzwerk/solver-2x2` | `@puzlwerk/solver-2x2` |

The actual GitHub repository rename is a **separate maintainer operation**.
This PR changes no repository settings or Git remote, does not publish npm
packages, and does not claim npm namespace ownership.

During this work GitHub began reporting the canonical repository as
`wstein/puzlwerk`. Read-only API checks of both old and new URLs returned the
same repository ID, `1435899236`; Git also reported the old URL's redirect. The
external rename was observed, not executed by this task. Active links use the
new canonical repository; historical source URLs keep their original text.
The existing local origin remains the old, redirecting URL.

The solver package remains private at version 0.1.0. No old-scope alias, new API,
new feature or consumer migration is introduced. Existing `cubistry.print` and
`cubistry.state` wire schemas, solver modes and HTM/optimality guarantees remain
unchanged. Historical uses of the former brand are not active imports.

## Complete local inventory

| Files | Change |
| --- | --- |
| `package.json`, `package-lock.json` | Root project name and workspace link/name; all dependency versions, resolved URLs and integrity hashes stay unchanged |
| `rescript.json` | ReScript project name only; compiler options/source layout unchanged |
| `packages/solver-2x2/package.json` | Private npm scope only; version, exports, runtime dependency, assets and license unchanged |
| `scripts/verify-package.mjs` | Workspace selector, temporary consumer names, generated consumer manifest/lock paths and import use the new scope |
| `test/solver.test.mjs`, `test/types/consumer.ts` | Public-package imports only; physical replay scenarios and assertions unchanged |
| `README.md` | Current brand and link to this coordination inventory |
| `docs/knowledge-base/README.md`, `architecture.md`, `solver-contract.md`, `solver-2x2.md` | Active brand, package examples and current repository/issue destinations |
| `specs/001-core-foundation/spec.md`, `contracts/solver.md`, `specs/002-solver-2x2/spec.md` | Active brand; the **unimplemented proposed** protocol label/examples become `puzlwerk.solver`. No implemented runtime wire format changes |
| `docs/knowledge-base/rename-puzlwerk.md` | This inventory, exceptions, external handoff and validation record |

`AGENTS.md` now permanently records the lowercase technical/display naming rules,
context-aware edits and provenance exceptions. CI, build command names and other
specs were inspected: they contain no old-name literal to change. The existing CI runs the same renamed workspace
checks and packed-consumer test; no gratuitous workflow edit is needed.

## Deliberately preserved history and provenance

- Existing `docs/adr/0001`–`0005` records and the ADR index remain byte-identical,
  including their old brand/scope text, dates and statuses. Read the old brand
  as the historical name; this rename changes none of those decisions.
- The original Issue #3 source URL in `specs/001-core-foundation/spec.md` remains
  `https://github.com/wstein/puzwerk/issues/3`, identifying the historical source.
- The CubeLab provenance manifest, all ten imported ReScript files, the binary
  table and package LICENSE/NOTICE/COPYING remain byte-identical. So do the
  counter fixtures, original source URLs/revisions/hashes and their license text.
- The solver implementation, adapter, public API types and independent geometric
  oracle remain byte-identical. No copyright holder or source attribution changes.

A byte comparison against the base confirms all **27 protected files** are
unchanged. All ten newly compiled ReScript modules also match the previously
verified pre-rename compiled modules byte for byte. Remaining old-name hits are
limited to historical ADRs, the original source URL and this explanatory inventory.

## External references — original audit and coordinated follow-up

Read-only audit of current remote branches:

| Repository | Branch | Revision |
| --- | --- | --- |
| `cubelab` | `main` | `07e64c7f5b7a735ae12ce6cbd9c58647b8744776` |
| `cubistry` | `main` | `f2d23f3be7df48738f934a963447e72cde70cf40` |
| `cube-assembler` | `main` | `9d2d9de8cce3a03b1c4ce870fe87d1c7e5087938` |
| `cubacle` | `develop` | `01a5f7a338f36fa8fa66f5e1ac1d21cdbd6d8e63` |

| Repository | Required separate follow-up |
| --- | --- |
| CubeLab | Update current branding, repository/knowledge-base/issue links and migration wording in `AGENTS.md`; coordinate open issue #22 |
| Cubistry | Update active naming/namespace guidance in `README.md`, `docs/FRAMEWORK_ROADMAP.md`, `docs/FRAMEWORK_SERVICE_PROPOSALS.md`, `docs/SHARED_CUBE_M1.md` and `docs/M1_ACCEPTANCE.md`; review the branding comment in `packages/cube-core/res/PwCore.res` and current issue #21 guidance. Keep its actual `@cubistry/*` packages unchanged until separately approved integration |
| CubeAssembler | Update branding, repository/issue links and migration wording in `AGENTS.md`; coordinate open issue #29 |
| Cubacle | Update the integration-boundary heading, branding and repository link in `AGENTS.md` on `develop`; keep Rust ownership and licensing unchanged |

No actual `@puzwerk/*` package import or dependency was found in the inspected
consumer application code/manifests. This does not establish behavior on unmerged
feature branches or availability of the target npm scope. Future consumer work
must use the approved new scope and a pinned accepted distribution artifact.

Do **not** bulk-rewrite Cubistry's hashed `research/architecture/requirements-puzwerk-20261027.json`,
related `manifest-m1-*.json` references, or the archived `research/m1-acceptance/requirements.json`.
Those are original evidence and should keep their names, bytes and hashes. Likewise
retain source URLs in historical PRs/records; update current guidance separately.
The initial technical rename changed no external repository. The separately
authorized ecosystem follow-up now adds naming guidance and updates active
references in one Draft PR per affected repository; their delivery references
and validation are recorded below. Historical evidence remains unchanged.

## Acceptance and verification

```sh
npm ci
npm run check
npm run test:package
```

Fresh installation, ReScript build/format checks, the public TypeScript contract
and all ten Node test groups pass under the new scope. Tests retain independent
physical replay, all 24 global target orientations, A → B → C → A and the exact
Cubistry 42 → 43 regression (**10 HTM**, versus 18 via the existing witness detour).
The packed consumer installs offline with the renamed package/lock and verifies
all body/sticker poses. Dependency versions and upstream hashes are unchanged.

Spelling, relative documentation links, diff checks and the final old-name audit
are checked before delivery. GitHub CI status belongs to the Draft PR checks;
passing local tests alone is not a claim that remote CI finished. Human review remains required; the observed repository operation is separate
from this technical PR. No automatic merge.

## Ecosystem follow-up classification

- **A — preserve:** existing ADR history, original source URLs/commit references,
  Cubistry's dated M1 decision/acceptance wording, all hashed research snapshots
  and manifests, and the source comment in `packages/cube-core/res/PwCore.res`.
  That complete source file is hash-bound by the M1 manifests; changing a branding
  comment would invalidate evidence without changing behavior.
- **B — update:** permanent AGENTS naming rules in all five repositories, current
  architecture/repository links in sister AGENTS files, and Cubistry's README and
  current naming paragraphs in `SHARED_CUBE_M1.md` / `FRAMEWORK_ROADMAP.md`.
- **C — uncertain:** no unresolved name occurrence after checking the source
  context and hash bindings. New uncertain cases must be reported, not rewritten.

The dated `FRAMEWORK_SERVICE_PROPOSALS.md` decision reference and the original
`M1_ACCEPTANCE.md` PR scope remain historical. No new dependencies, changes to
`@cubistry/*`, solver implementation or application behavior are authorized by
this naming follow-up. Cubacle uses `develop`; its upstream-mirror `main` is not
an integration target. Every PR remains Draft for human review.

## Ecosystem Draft PRs

| Repository | Draft PR | Changed files | Validation |
| --- | --- | --- | --- |
| PuzlWerk | [#14](https://github.com/wstein/puzlwerk/pull/14) | Existing technical rename plus permanent `AGENTS.md` conventions and this inventory | Fresh install, build/format, public TypeScript contract, 10 solver/replay groups and offline packed consumer pass |
| CubeLab | [#25](https://github.com/wstein/cubelab/pull/25) | `AGENTS.md` | Documentation spelling, relative links, source/dependency preservation and diff checks pass; no PR CI configured |
| Cubistry | [#29](https://github.com/wstein/cubistry/pull/29) | `AGENTS.md`, `README.md`, `docs/FRAMEWORK_ROADMAP.md`, `docs/SHARED_CUBE_M1.md` | Fresh `npm run check`, independent proof/design checks, spelling and local links pass; browser/documentation CI passes |
| CubeAssembler | [#34](https://github.com/wstein/cube-assembler/pull/34) | `AGENTS.md` | Fresh install, typecheck/lint/format/build and 1,141 passing unit tests; spelling/links/diff checks pass; browser CI status is in the PR |
| Cubacle | [#3](https://github.com/wstein/cubacle/pull/3) | `AGENTS.md` on `develop` | Documentation spelling/links/diff pass; local Rust commands unavailable because `cargo` is absent; existing CI runs them, see actual PR checks |

All sister diffs are documentation-only. Their runtime code, manifests/lockfiles,
existing `@cubistry/*` names, assets, fixtures, licenses, hashes, research and ADR
history are byte-identical to their respective base commits. No package dependency
or application import was added, and no external issue or historical PR was edited.
The naming guidance does not authorize consumption of an unreleased package.

Recommended human merge order: accept #14 first, then review/merge the four sister
PRs independently once their applicable checks are satisfied. Cubacle targets
`develop`, never the upstream-mirror `main`. No merge is performed by this task.
