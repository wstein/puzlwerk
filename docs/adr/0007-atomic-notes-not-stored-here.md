# ADR 0007: Atomic notes are not stored in this repository

Status: Accepted
Accepted: 2026-11-05
Date: 2026-11-05
Supersedes: [ADR 0006](0006-canonical-knowledge.md), as to atomic notes and their validation

## Context

ADR 0006 added atomic notes with stable IDs, reciprocal related links and an
offline graph validation to this repository. The maintainer decided that atomic
notes are not kept in project repositories.

## Decision

This repository holds no atomic notes. The note metadata format, the note graph
validation and the ID-based note selection in `publication.json` are removed.
Everything else from ADR 0006 stays: existing documents and links, the hashed
baseline inventory with preserved historical text, offline link and anchor
validation, and `documents`-based curated publishing views.

## Consequences

Decisions stay in ADRs, requirements in specifications and API details in their
reference. The documentation site publishes the mapped documents only. The
Stage 1 and Stage 2 specifications keep their historical text about notes.
