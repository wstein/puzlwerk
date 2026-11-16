# Acceptance preview proposal

Status: planning only. No workflow, deployment, publication, settings change or
activation is authorized by this document. The suite contract and case routes
are in `acceptance-routes.json`; each PR would have one static preview containing
all its routes under `pr-preview/pr-N/acceptance/`. The build base is an explicit
input; `/puzlwerk/pr-preview/pr-72/acceptance/<id>/` is an example, not a live URL.
Build and direct-link checks must exercise both root and nested bases, including
CSS, modules, workers, fonts, assets and source notices. Source revisions and
asset hashes belong in the build evidence; original hosting remains blocked until
its exact source and asset licenses and technical eligibility are established.

## Production boundary and open decisions

PuzlWerk's `origin/main:.github/workflows/documentation.yml` deploys production
only on an explicit `workflow_dispatch` with `deploy=true` on `main`. Preserve
that contract. Preview events must never publish a newer, unpublished main root.
The proposed combined publication takes only the currently **verified published
root bytes** as its production root and adds the authorized preview namespace;
new production bytes require the owner's separate `deploy=true` operation. The
identity and retrieval/verification of that published root, concurrent writers,
first-preview baseline and rollback require an implementation design and review.
If the published root cannot be proven, fail closed. The owner must decide the
storage and verification mechanism; this proposal does not authorize it.

The read of `PAGES_PREVIEWS_ENABLED` returned HTTP 403: its value is **UNKNOWN**,
not false or absent. Before merging any future workflow that can publish when
this variable is true, the maintainer must establish that activation is off.
Separate owner authorization is required to activate publication. Preserve the
manual production path at both gate settings, use one serialization boundary for
writers, and never allow a preview to replace another PR's namespace or production.
No live publication or cleanup is implied by a label or this plan.

Cubistry's pinned source is evidence for a possible port, not a PuzlWerk deploy
implementation. Its `pages-publish.yml` directly uses JamesIves at
`fa24774553152dd7873cd16ebd8d959b010c5445`; Ross at
`873417d2df72380da1f3978378fb58560bcde976` internally uses JamesIves at
`4a3abc783e1a24aeb44c16e869ad83caf6b4cc23`. These are distinct direct and nested
calls. Recheck action source, pins, licenses and the intended invocation before
any port. Retain notices and avoid executing untrusted PR artifact scripts in a
privileged publisher. Same-origin preview scripts are not browser isolation.

## Verification and acceptance records

A future suite must provide stable case IDs and independent URLs from the manifest,
show the exact source and suite head, fixture identity, action trace, results and
source reference, and verify nested direct links. A renderer diagnostic exercises
only the named production viewer API; it is not application parity. Wire-v1
**definition and state** are both required for a physical-state comparison;
appearance-v1 is a separate document. Missing production Core-to-Viewer mapping,
policy-aware moves or shared play is visibly blocked for affected cases. Do not
add a second TypeScript puzzle engine or simulate play to claim the contract.

Architecture, functional and visual outcomes are separate, with `not implemented`,
`not tested`, `passed`, `failed`, `blocked` and `owner approved` as applicable.
Evidence records include the exact head, source revision, case, fixture identity,
scope, device/browser where relevant, trace and result. An unchecked or checked
local UI box is only an observation; it cannot create or imply owner approval.
Recommended design: a versioned acceptance record with an explicit, attributable
owner decision and evidence links; changing the tested head or fixture makes the
record stale for the changed scope. Trusted storage, identity and the exact record
format remain owner decisions. One approval covers only its recorded case and scope.

Future verification must include two PRs, successive heads, reload/deep links,
assets and workers, stale and failing builds, removal/reopen, source provenance,
production-byte retention, concurrent writers, and blocked gate behavior. New
checks require targeted mutations showing failure for the intended reason. No
preview, browser or live publication checks have been run for this proposal.
