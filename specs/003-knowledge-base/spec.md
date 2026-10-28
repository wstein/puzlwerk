# 003 — Canonical knowledge base, Stage 1

Status: implementation authorized by the maintainer's staged housekeeping task;
human acceptance remains required for merge. Optimistic stacked development
authorizes dependent implementation before that acceptance. Tracks [#10](https://github.com/wstein/puzlwerk/issues/10)
and [#15](https://github.com/wstein/puzlwerk/issues/15).

## Baseline and scope

Start at `c0826027e5c4b369edbee0f05d239fc7f35e737a`. Cubistry
[PR #31](https://github.com/wstein/cubistry/pull/31) is merged, satisfying #15's
start gate. Consolidate knowledge without moving existing documents, rewriting
decisions, copying research artifacts or changing solver behavior.

## Acceptance scenarios

1. An existing repository-relative document link still resolves. Every baseline
   Markdown document is classified in a versioned inventory; preserved documents
   remain byte-identical to their recorded SHA-256.
2. A reader follows the knowledge index to three atomic notes with unique stable
   IDs, explicit maturity, reciprocal related links and inspectable sources.
3. A reader can distinguish the implemented private 2×2 API, proposed general
   foundation, historical ADR text and consumer integration evidence. No status
   becomes accepted merely because a new index links it.
4. The offline validator rejects broken paths/anchors, missing or duplicate IDs,
   dangling/asymmetric relations, missing sources, unindexed notes and invalid
   publication selections. Regression tests exercise those failures.
5. A future publisher can read the versioned curation metadata and proposed
   navigation without maintaining a second copy of any note. Repository-only
   content remains public and accessible.
6. Existing ReScript, public TypeScript contract, solver/replay and packed-consumer
   checks pass; package manifests/lock, source, tables and provenance are unchanged
   except for development-only documentation check scripts in the root manifest.

## Delivery and gate

Use atomic documentation/tooling commits, one Draft PR and independent review.
Do not close #10/#15 automatically. Stage 2 (Starlight, #16) may be implemented on this branch as its immediate
parent under the maintainer's optimistic stacked-development policy; its merge
still follows Stage 1 acceptance. No website dependency,
build, deployment, repository setting, branch rename or later-stage backlog work
is authorized by this implementation slice.

## Incremental publishing plan (proposal only)

Stage 2 may map the curated IDs to Starlight routes and render
the same Markdown using a content loader or disposable generated build inputs.
Keep generated inputs out of the maintained content tree. Rewrite relative source
links to selected site routes or canonical GitHub source links for unselected
documents, preserving fragments. Test `/puzlwerk/`, search and assets before any
approved production deployment. Compare Hugo only if an actual Starlight blocker
appears. Later housekeeping may proceed optimistically; destructive operations, repository
protection changes, historical closures, merge and production deployment retain
explicit maintainer gates.
