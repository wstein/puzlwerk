# ADR 0006: Canonical notes and curated publishing views

Status: Proposed for Stage 1 acceptance
Date: 2026-10-28

## Context

Knowledge, API guidance, foundation proposals and migration history currently
share one directory. A future documentation site must not become another editable
source. Issues [#10](https://github.com/wstein/puzlwerk/issues/10) and
[#15](https://github.com/wstein/puzlwerk/issues/15) authorize the scoped migration.

## Proposed decision

Keep existing documents and links. Add atomic Markdown notes with stable IDs,
explicit maturity, source links and reciprocal related links. Keep decisions in
ADRs and requirements in specifications. Classify the original documents with
hashes; preserve historical text and provenance. Use restricted front matter and
a versioned ID-based selection to describe proposed public documentation views.
Validate the graph and repository links offline in CI.

## Alternatives and consequences

Copying notes into a site directory creates competing authorities. Exporting all
notes indiscriminately removes curation. Relocating all legacy documents at once
adds unnecessary link and history risk. A database-backed graph adds infrastructure
without a current requirement. The chosen incremental approach retains the old
paths, needs disciplined source/status links and requires a future route resolver.

Astro Starlight is the requested Stage 2 default, not an installed dependency or
deployment decision in this PR. This ADR changes no solver, goal semantics, prior
ADR status, licensing or research verdict. Human acceptance is still required.
See [the conventions](../knowledge-base/CONVENTIONS.md) and
[Stage 1 specification](../../specs/003-knowledge-base/spec.md).
