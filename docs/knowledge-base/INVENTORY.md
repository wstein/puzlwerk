# Knowledge inventory and ownership review

Baseline: `c0826027e5c4b369edbee0f05d239fc7f35e737a` (2026-10-28 audit).
The machine-readable [inventory](inventory.json) lists every baseline Markdown
file, its kind, original SHA-256 and disposition. No file is relocated or deleted.
Historical source text remains inspectable in Git at that revision.

## Canonical ownership map

| Existing sources | Authority and disposition |
| --- | --- |
| Root README, AGENTS, knowledge README | Entry points and workflow; update navigation, preserve human gates |
| `architecture.md` | General design intent, not proof that the canonical NxN core exists |
| `solver-contract.md` | Proposed Cubacle interoperability; detailed proposed contract belongs to specification 001 |
| `workflow.md`, `repository-metadata.md` | Process/bootstrap context; actual settings require separate authorized actions |
| `solver-2x2.md` | Current scoped package reference; add a dated integration-status annotation, retain the original migration account |
| `rename-puzlwerk.md` | Dated rename audit; preserve observed revisions, old names and follow-ups as history |
| ADR index and ADRs 0001–0005 | Decision records with their recorded proposed statuses; no implicit acceptance or spelling rewrite |
| All seven specification 001 documents | Proposed requirements, research register, source pins, model, contract, plan and blocked tasks |
| Specification 002 | Scoped solver extraction requirements and exclusions, not general core authorization |
| Fixture NOTICE | Immutable source/attribution record; leave byte-identical |
| PR template | Contributor workflow, not evergreen domain knowledge |

The new notes explain three reusable distinctions and point back to these owning
documents rather than copying API tables, requirements or research. Their IDs
are listed in the [index](README.md). No tutorials or generated reference tree
exist yet; do not invent a second authoritative source for them.

## Overlaps, outdated statements and contradictions

- The old knowledge index repeated the domain overview and architecture summary.
  It is now a navigation/status entry point; linked notes own the reusable
  explanations and existing detailed documents own their reference content.
- Foundation research says no build existed at its source revision. That is
  historical context, not a present tooling claim. Keep it unchanged; the package
  reference and manifest describe the implemented build.
- General architecture text assigns search to Cubacle, while the scoped package
  implements reusable ReScript solving. Read the former as the general boundary;
  the separate optional package does not move search into a canonical core.
- The package guide's planned Cubistry integration is now historical after
  [merged PR #31](https://github.com/wstein/cubistry/pull/31). A dated annotation
  links the completed work without rewriting the original migration narrative.
- ADR 0005 still says proposed and uses the old package scope. Preserve that
  historical record. Whether to accept/supersede it is a maintainer decision;
  current package naming is lowercase `@puzlwerk/*`.
- The rename audit's open-PR observations are dated, not current backlog state.
  Issue closure and cross-repository audits belong to later housekeeping stages.

## Research and external references

Foundation research owns its pinned upstream observations. The solver package's
[provenance manifest](../../packages/solver-2x2/provenance.json) owns imported file
hashes and source revision; the [fixture notice](../../test/fixtures/NOTICE.md)
owns the counter excerpt's attribution. Independent tests and package validation
are evidence links, not a replacement copy of those manifests.

Chronocube SAT/UNSAT certificates and timer proofs remain in Cubistry's research
history. Stage 1 neither imports them nor rechecks their mathematics, renames the
branch or changes their verdicts. Follow the owning repository/immutable revisions
from the original records. No external repository has been edited by Stage 1.

## Open decisions and follow-ups

1. Resolved 2026-10-28: the three notes and conventions merged in PR #17, and
   ADR 0006 is accepted.
2. Explicit disposition of earlier proposed ADRs, especially 0005; no inferred
   approval from a code merge.
3. Resolved 2026-10-28: Stage 2 route mapping, curated navigation and search merged
   in PR #18. Publication metadata still authorizes no deployment or wholesale
   note export.
4. Later backlog/reference audits may update current status pages; dated evidence,
   historical names, licenses and proof/source hashes remain preserved.
