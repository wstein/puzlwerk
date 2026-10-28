# Knowledge conventions

Status: Stage 1 implementation for human acceptance; see the
[scope and acceptance criteria](../../specs/003-knowledge-base/spec.md) and
[proposed ADR 0006](../adr/0006-canonical-knowledge.md).

## One source per responsibility

| Content | Canonical location | Meaning |
| --- | --- | --- |
| Evergreen explanation | `docs/knowledge-base/notes/` | One reusable claim with sources and related notes |
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

## Atomic notes

Use `pw-YYYYMMDD-NNN` IDs allocated in UTC, with a collision check against all
existing notes. An ID never changes, is never recycled and is not an assertion of
chronological authority. Use `notes/ID-descriptive-slug.md`; future slug/path moves
must preserve old links or update all inbound links in the same reviewed change.

The front matter is a deliberately restricted YAML-compatible format, parsed
without a dependency: one key per line, plain scalar strings, and JSON string
arrays for `related` and `sources`. No multiline values, aliases or arbitrary YAML
features. Required keys:

| Key | Values / purpose |
| --- | --- |
| `id`, `title` | Stable ID; title matching the first Markdown H1 |
| `kind` | `evergreen` (other document kinds retain their own formats) |
| `status` | `draft`, `proposed`, `verified`, `superseded`; verified needs linked evidence, not architecture approval |
| `audience` | `developer` or `user` |
| `publication` | `repository`, `developer-candidate`, `user-candidate` |
| `related` | Nonempty array of other stable note IDs; reciprocal links are required |
| `sources` | Nonempty array of relative source paths or HTTPS URLs, also linked visibly in the body |

Explain what was verified and its limits in prose. Sources link to the owning
specification/ADR, code or tests, and source issues when relevant. Related sections
link visibly to the actual notes. The validator emits computed backlinks in JSON;
do not maintain a separate duplicate backlink database. Superseding a note keeps
its file, ID and sources and links its replacement.

## Curation and public views

[publication.json](publication.json) is a versioned, **proposed selection**, not
deployment permission. It references stable IDs, not copied Markdown. The full
public repository graph includes every note, including unselected notes. The
developer view selects only developer candidates; the user view selects only user
candidates. The empty user view deliberately avoids inventing application guides.
Unselected does not mean private, secret or access-controlled.

Stage 2 should add guides/reference/architecture navigation by referencing their
existing canonical files. Keep note IDs available as page metadata and stable
anchors, with a reviewed ID-to-route mapping; source-relative links are not assumed
to work unchanged in a static site. No Astro, Starlight, Hugo or deployment workflow
is added in Stage 1. The separate [Stage 2 publishing view](../site/README.md)
consumes this selection, using optional `documents` mappings (`path`, `title`,
`slug`) for existing guides/reference. Note selection remains ID-based.

## Validation and editing

Run `npm run docs:check` and `npm run test:docs`. The offline check covers tracked
and nonignored new Markdown, repository-relative paths, Markdown heading/HTML-ID
fragments, note metadata/relations, the baseline inventory and proposed curation.
It ignores remote HTTP availability and does not certify GitHub issue acceptance.
Inline and reference-style Markdown destinations and HTML `href`/`src` are checked;
code fences are excluded. Unsupported destination syntax fails explicitly instead
of silently being treated as validated. No check fetches research or edits files.

Add both metadata and visible links; link the note from the index. Run existing
solver/package checks for the final PR. Preserve licenses, source hashes, historic
names and ADR status. Record architectural uncertainty rather than normalizing it
away. Dependent implementation may proceed in stacked Draft PRs under the maintainer's
optimistic development policy. Acceptance is required before merge or deployment.
