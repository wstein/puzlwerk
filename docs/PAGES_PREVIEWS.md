# Acceptance Pages previews

The preview build is read-only and runs for an open same-repository PR with the
`preview` label. Its head must contain `acceptance/build.mjs`. A PR without the
suite fails the build and has no current preview. The viewer PR #72 does not
contain the suite by itself; the cumulative suite PR #77 is the first candidate
for that check. No URL is asserted live by this document.

Preview publication requires `PAGES_PREVIEWS_ENABLED` to equal `true` and an
established, verified publication ledger. The variable read returned HTTP 403;
its value is **UNKNOWN**. Before merging a workflow capable of publication,
the maintainer must establish that activation is off. Activation and any
workflow dispatch are separate owner operations. Same-origin preview scripts
are not isolated from production.

Production still requires `workflow_dispatch`, `deploy=true`, and `main` at
either gate value. Without a receipt and without any ledger artifacts, this
uses the existing root-only production deployment. A missing receipt with an
existing ledger, an unreadable API, an expired artifact, an ambiguous writer,
or a failed integrity check blocks publication. With a verified ledger,
production replaces the root and preserves every preview namespace; preview
reconciliation preserves the exact verified root and other namespaces. The two
writers share one job-level lock from snapshot verification through deployment
and confirmation. Failed or stale preview builds retain their last namespace
without claiming that it is current.

## Bootstrap and activation

The first bootstrap is disabled by default. Before any bootstrap, the owner must
verify the exact current published tree and all preview namespaces against an
original successful production deployment and its retained Pages artifact; a
crawl or a later `main` build is not evidence of the published tree. The
supported source is a first-attempt successful `documentation.yml` dispatch
using either the original workflow blob `3f73dcb8d236057eb6724d4c45475d5b3215ba53`
or the reviewed workflow blob `f7f131d5a3bd64a4052ffbc78b90538ba391f51a`,
and its unique `github-pages` artifact. For the latter, the deploy job's
completed steps must prove that the legacy path deployed `github-pages` and the
combined-publication steps were skipped. Other workflow versions are rejected
until their exact blob and deployment contract are reviewed and explicitly added.
If the artifact expired or the current publication cannot be linked to it, stop. The owner also verifies that all
Pages writers are drained. The artifact can be inspected locally using a
separately obtained trusted copy; calculate the production-root and full-tree
SHA-256 values with `baseline.digest(path)` and
`baseline.digest(path, include_previews=True)` from `scripts/pages/baseline.py`.
These are structured tree digests, not a hash of the ZIP file.

Only after those checks may the owner separately dispatch the documentation
workflow on `main` with `deploy=true`, `bootstrap=true`, and
`bootstrap_attested=true`, providing the source run ID, attempt `1`, artifact
ID, and both expected digests. This republishes the verified tree with a new
receipt; it does not build a new production root. The writer validates the
source run, deploy job, artifact identity, archive paths, and both digests.
After successful deployment and receipt/ledger confirmation, the maintainer
records the bootstrap run, attempt, and receipt nonce in `PAGES_BOOTSTRAP_RUN`,
`PAGES_BOOTSTRAP_ATTEMPT`, and `PAGES_BOOTSTRAP_NONCE`, under a separate owner
authorization for settings. The owner may then separately authorize enabling
the preview gate. Verify the public receipt, production bytes, two internal PRs,
updates, cleanup and reopen before reporting a live preview.

The ledger assumes GitHub and the maintainer retain its runs and artifacts for
the stated 90-day retention window. It detects observed missing or ambiguous
state and fails closed; manual deletion is not permitted within that window.
Expiry or an interrupted writer requires owner-directed recovery from a verified
published snapshot; do not reconstruct it from the latest `main`. A start
artifact without a confirmed commit blocks subsequent combined publications.

## Rollback

Drain in-flight writers. Under separate owner authorization, disable the preview
gate and verify the state. The manual production dispatch remains explicit; when
a verified ledger exists it retains the preview namespaces. If restoration is
needed, the owner separately approves the exact verified root and deployment.
Verify the resulting public receipt and production bytes. Remote deletion,
settings changes and further dispatches require their own owner authorization.
