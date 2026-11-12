# 006 — One shared cube model (comparison and convergence plan)

**Status:** proposal; planning only. No code, no migration and no cross-repository change is approved by these files.
The owner decided the canonical model on 2026-11-12: PuzlWerk wire-v1 (SM1 in plan.md).

## Purpose

The owner principle is that all components share the same cube model and abstraction. This directory compares the
models that exist today, from primary sources at pinned revisions, and proposes layers, owners per layer and a
convergence path in small reviewable steps. The owner decision of 2026-11-12 is "first a comparison, then decide".

## Markers

The legend of the Cubacle and Cubistry plans:

- **O** owner decision, with date and source. Only the decisions listed below are used.
- **V** verified in a file or on GitHub at the revision named in [comparison.md](comparison.md#1-sources-and-revisions).
- **P** proposed here.
- **U** UNKNOWN: not found, not measured or not run.

Owner decisions used (**O**, quoted as given to the author of this plan):

- 2026-11-08: PuzlWerk becomes the common cube model step by step. Compatible models and compatible implementations;
  nobody cooks their own soup; "keep own formats plus adapters" is a transition state, not the goal.
- 2026-11-08, Q3: converge via the Cubacle fixed frame, first only the specification and shared test vectors.
- 2026-11-08, Q7: corpus F1 to F7 plus hash and canonical-JSON vectors with provenance.
- 2026-11-08: shared code only within ReScript (PuzlWerk and Cubistry); Rust stays its own implementation. Superseded
  for types and codecs by SM4 (2026-11-12).
- 2026-11-08: every milestone and every cross-repository change still needs the owner's approval.
- 2026-11-08: [wire schema v1](../001-core-foundation/contracts/wire-v1.md) is accepted (recorded there).
- 2026-11-12: all components must share the same cube model and abstraction; first a comparison, then decide.
- 2026-11-12, SM1 (source: owner answer in the coordinator session): PuzlWerk wire-v1 is the canonical model; the
  Cubacle fixed frame is the Rust implementation of the same semantics; Orbit64 V2 is a codec.
- 2026-11-12, SM3 (same source): a separate appearance document per sticker ID (`puzlwerk.appearance`); wire-v1
  revision 1 stays unchanged.
- 2026-11-12, SM4 (same source): a schema generator; one schema generates the types and codecs for Rust and
  ReScript/TypeScript.

Owner decisions recorded in other repository documents and cited as **O** with their source:

- 2026-11-07, Q2: outer faces and wide moves, no aliases, for PuzlWerk text notation
  ([research.md](../001-core-foundation/research.md), status 2026-11-07).
- 2026-11-11, Cubistry Picture Cube D3: sizes 4 to 7 stay E0; E1 is decided after stack PR 4 (Cubistry
  `knowledge/plans/unified-application.md`, section 6).
- 2026-11-12, Cubistry Picture Cube D6: one `FaceSet` image model (same file, section 6).

**V** The Q3 and Q7 decisions are not yet recorded in this repository: [research.md](../001-core-foundation/research.md)
still lists Q7 as open and Q3 as untouched. Recording them is an owner step (decision SM10 in [plan.md](plan.md#4-owner-decisions)).

## Files

- [comparison.md](comparison.md): sources and the model of each component.
- [plan.md](plan.md): layers of one abstraction, owners per layer, convergence path, impact on open work, owner
  decisions, what is not verified.

## Why here

The [knowledge conventions](../../docs/knowledge-base/CONVENTIONS.md) place requirements and plans in `specs/` and
accepted decisions in `docs/adr/`. This is a plan with open decisions, so it is a new spec directory, not an ADR. Once
the owner decides the canonical model, that decision becomes an ADR here and this directory links to it.
