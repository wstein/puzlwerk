# ADR 0002: Exact cube frames and layer transformations

Status: Proposed
Date: 2026-10-27

## Context

Even/odd cubes and image-upframes need a deterministic coordinate convention independent of renderer cameras. No consumer mapping has yet been certified here.

## Options and proposal

Propose right-handed +X right, +Y up, +Z front with doubled centered integer coordinates, the explicit six-face up table, and signed axis/layer AST in the [data model](../../specs/001-core-foundation/data-model.md). Alternatives: zero-based slots with recentering; floating-point positions; undocumented inherited renderer axes. Exact centered integers make rotations auditable and prevent rounding. NxN shell representation starts at N=2; certification initially 2–3 (owner decision of 2026-11-05; sizes 4–7 need a separate approval), not a claim of existing consumer support.

Propose explicit single, inner, contiguous wide and multi-layer transforms. Text notation is a separate adapter; slice aliases and global-rotation notation are unresolved Q2. Legality comes from the definition policy, never glyph symmetry.

## Consequences and approval

All adapters need explicit reversible frame mappings and golden fixtures. Center orientation and physical global rotations remain observable. Approve the convention and move policy before mechanics implementation; Q1 was approved on 2026-11-05 for the frame, the coordinates and the face-up table; Q2 remains open until recorded human review. No existing definition is rewritten by this proposal.
