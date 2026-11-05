# Knowledge conventions

Status: Stage 1 merged in PR #17 (2026-10-28); see the
[scope and acceptance criteria](../../specs/003-knowledge-base/spec.md) and
[ADR 0006](../adr/0006-canonical-knowledge.md), superseded in part by
[ADR 0007](../adr/0007-atomic-notes-not-stored-here.md).

## One source per responsibility

| Content | Canonical location | Meaning |
| --- | --- | --- |
| Evergreen explanation | Not stored in this repository | One reusable claim per note |
| Architectural decision | `docs/adr/` | Context, alternatives, status and consequences; a note cannot accept an ADR |
| Requirements and plans | `specs/` | Scoped acceptance and phase gates, not implementation evidence |
| Public API reference | `solver-2x2.md` and package declarations | Reference links to executable contracts/tests; avoid a copied API in every note |
| Research evidence | Original pinned source repository | Link to certificates, revisions and independent checkers; never replace with a summary |
| Tutorials | A future dedicated guide | An ordered task, not an evergreen fact or a second API reference |
| Generated documentation | Disposable build output | A presentation of canonical sources; never independently edited |

Existing knowledge paths remain valid. The [baseline inventory](inventory.json)
classifies every pre-migration Markdown document and records its original hash.
A committed SHA-256 of the sorted baseline path set detects omitted inventory
records; changing that fingerprint requires a reviewed inventory migration.
`preserve` means byte-identical; navigation updates and explicit status annotations
are separately identified. The [inventory review](INVENTORY.md) explains ownership,
overlaps and unresolved questions. New files are additions to that baseline.

## Curation and public views

[publication.json](publication.json) is a versioned, **proposed selection**, not
deployment permission. It maps existing canonical documents (`path`, `title`,
`slug`) to site routes and references no copied Markdown. The full public
repository graph includes every document, including unselected ones. Unselected
does not mean private, secret or access-controlled. The
[publishing view](../site/README.md) consumes this selection; source-relative links
are not assumed to work unchanged in a static site.

## Validation and editing

Run `npm run docs:check` and `npm run test:docs`. The offline check covers tracked
and nonignored new Markdown, repository-relative paths, Markdown heading/HTML-ID
fragments, the baseline inventory and proposed curation.
It ignores remote HTTP availability and does not certify GitHub issue acceptance.
Inline and reference-style Markdown destinations and HTML `href`/`src` are checked;
code fences are excluded. Unsupported destination syntax fails explicitly instead
of silently being treated as validated. No check fetches research or edits files.

Run existing
solver/package checks for the final PR. Preserve licenses, source hashes, historic
names and ADR status. Record architectural uncertainty rather than normalizing it
away. Dependent implementation may proceed in stacked Draft PRs under the maintainer's
optimistic development policy. Acceptance is required before merge or deployment.
