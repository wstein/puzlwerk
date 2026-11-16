# Acceptance preview proposal

> Historical proposal, superseded by the owner’s local-demo decision on 2026-11-16. The PR-scoped Pages workflow described below is withdrawn; use `npm run dev` and the local routes in the acceptance manifest. The text remains as historical design evidence.

Status: planning only. No workflow, deployment, publication, settings change or
activation is authorized by this document. The suite contract and case routes
are in `acceptance-routes.json`; each PR would have one static preview containing
all its routes under `pr-preview/pr-N/acceptance/`. The build base is an explicit
input; `/puzlwerk/pr-preview/pr-72/acceptance/<id>/` is an example, not a live URL.
Build and direct-link checks must exercise both `/puzlwerk/` and `/puzlwerk/pr-preview/pr-72/`, including
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

## Proposed build and publication contract

This is a design for review, not permission to implement or run a workflow.
The expected deliverables are a read-only acceptance build, trusted publisher and
notification workflow, source-audited publication/reconciliation helpers and
focused tests, together with an integration of the existing documentation workflow
that preserves its explicit manual production dispatch. Review Cubistry's pinned
`.github/workflows/pages.yml`, `pages-publish.yml`, `pages-notify.yml`,
`scripts/pages/` and their tests as source, including each action and license;
adapt repository identities and trust assumptions rather than copying blindly.

A PR build uses `pull_request` opened, reopened, synchronized and preview-label
addition events. It is eligible only for a same-repository, open PR carrying the
current `preview` label. It checks out the exact head with read-only contents
permission, no secrets and no persisted credentials, and produces one bounded
static artifact. Artifact metadata identifies repository, PR, workflow, run,
attempt, source head, manifest and source revisions. The build has no publishing
permission. A label is not activation; fork PRs receive no automatic publication.
The output contains only `acceptance/` beneath that PR's namespace and must not
write production or a sibling PR directory.

The trusted publisher runs reviewed code from trusted `main`, not scripts or npm
from a PR artifact. A `workflow_run` signal and a trusted-main dispatch trigger
full reconciliation. Label removal, close and reopen must also signal a full
reconciliation even when no build runs; a `pull_request_target` signal, if used,
may only dispatch fixed trusted-main code with `actions:write`, without checking
out PR code or executing PR-controlled input. Before extracting and immediately before any
publication or removal, obtain and recheck the repository, workflow path, event,
successful run and attempt, artifact identity and current PR state, same-repo
head SHA and label. Reject missing or incomplete pagination, mismatched identity,
failed latest build, stale completion or changed head. Never label an older
artifact current after a newer build fails. Publication requires the separately
verified active gate and an eligible current build. Use least privilege: the build
has read-only contents; only the trusted publisher gets the narrowly required
storage/Pages write permissions. Notification is separate and may update a single
bot comment only after it validates the current PR/head/label and a verified live
receipt; no PR artifact code executes there.

Reconcile all currently eligible PRs against one verified published production
root and storage under a single publication lock shared by all Pages writers.
Out-of-order, coalesced or retried events must not regress a newer head. Close or
label removal removes only that PR's `pr-preview/pr-N/`; recheck current open and
label state immediately before removal so a reopened or relabeled PR survives
late cleanup. Preserve every sibling namespace and all verified production bytes.
A failure for one PR must not silently remove another; successful independent
updates and eligible cleanup remain possible without weakening verification.
An extraction stage rejects traversal, ambiguous archive paths, symlinks and
special files, Git metadata, reserved namespaces, protected CNAME/dot paths,
excess size/count and incomplete source metadata. Strip unsafe modes, never
execute extracted content, and add escaped non-production banner and noindex.

The published-root storage and verification design remains an owner decision.
The proposed combined tree uses only a byte-for-byte verified snapshot of the
currently published root and validated per-PR directories. It must not substitute
a newer main build; if current published bytes, identity or integrity cannot be
proved, fail closed. New production bytes enter only through the separate owner's
explicit `deploy=true` dispatch. Publish a bounded receipt with nonce, run,
attempt and exact tree identity; verify the fixed-origin HTTPS receipt without
credentials or redirects before any success notification. A failed or stale
receipt yields no current-success link. Same-origin JavaScript is not isolated
from production by the path prefix.

## Ordered activation and rollback proposal

After a separately authorized implementation and independent exact-head review,
the maintainer first verifies that the gate is false and that no legacy writer
is in flight. The owner separately approves an existing verified production-root
baseline and the production-root storage mechanism. Only then may the owner
separately authorize setting the gate true and dispatching trusted reconciliation.
Verify the public receipt and production bytes, then two internal PRs with
independent updates, close/removal, reopen and retained namespaces. No URL is
claimed live before its exact receipt and head are verified. The current 403 gate
read is not evidence that this prerequisite is satisfied.

For rollback, drain in-flight publishers; the maintainer sets the gate false under
the separately authorized operation, verifies no competing writer, then uses the
existing explicitly approved manual production dispatch if restoration is needed.
Verify published root bytes and the disabled path before reporting success.
Inspect retained preview storage read-only; deleting remote state requires its own
owner authorization. If a step or identity check is ambiguous, stop rather than
performing cleanup or claiming rollback complete.
