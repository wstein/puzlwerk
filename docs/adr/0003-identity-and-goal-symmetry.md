# ADR 0003: Preserve physical identity; compare goals modulo declared symmetry

Status: Proposed
Date: 2026-10-27

## Context

Same-color pieces and rotationally symmetric printing cannot be modeled faithfully by color facelets or by discarding orientation. Structural validity does not prove legal reachability.

## Options and proposal

Propose stable immutable piece/sticker IDs plus exact position and SO(3,Z) pose. Keep optical equivalence in explicit goal predicates, using C1/C2/C4 around a declared sticker normal or a validated piece-local subgroup. One global frame is chosen for the entire goal. See the [data model](../../specs/001-core-foundation/data-model.md).

Alternatives: facelet-only state loses identities; quotienting stored poses loses information needed for later exact goals; arbitrary angle lists lack group closure; compact orientation indices require an additional shared table. Matrices cost bytes but are inspectable and exact. Color-only solved goals remain first-class rather than gaining identity constraints.

## Consequences and approval

Goals can be stricter than visible appearance; symmetry never changes legal transitions. Validation reports structural/invariant evidence separately from verified/disproved/unknown reachability. Complete NxN membership is deferred to approved size/policy-specific methods (Q4). Human review must approve subgroup and global-frame semantics before goal implementation. No solver-rich-goal support is implied.
