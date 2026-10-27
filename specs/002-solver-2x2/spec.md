# 002 — Existing 2×2 solver migration

Status: implementation authorized by the maintainer's attached migration work item on 2026-10-27; Draft PR review and merge remain human gates. References: PuzlWerk #5, #8, #9 and Cubistry #23.

## Scope and prerequisites

Cubistry pilot PRs #20/#22/#24 are merged. This authorization is limited to extracting the existing CubeLab solver/table into a headless package. It does not approve the broader 001 foundation milestones, the #9 monorepo design, consumer migration, package publication or repository renaming.

PuzlWerk currently has no executable canonical core. Do not implement a second physical engine: the package accepts the existing Cubistry v1 physical print/state wire format through an explicit adapter. CubeLab corner coordinates stay private solver coordinates. They are not a new canonical PuzlWerk state model. The proposed 001 codec remains proposed.

## Acceptance

- Reuse pinned CubeLab algorithm, 24-frame correction and v2 table with provenance and AGPL notices; do not regenerate data or invent search.
- Accept valid complete physical states of one immutable 2×2 print. Reject malformed states, identity mismatches, incompatible frames and impossible corner twists.
- Return outer-face HTM tokens reaching the exact complete target, preserving all cubie and sticker identities and sticker-up vectors, not merely matching colors.
- Verify solved, all single moves, inverse, nontrivial, whole-rotation and invalid cases using independent geometric replay.
- Check table signature/dimensions/checksum and pinned SHA-256. Caller owns loading; no root-relative URL or browser-only I/O dependency.
- Document conventional quotient optimality separately from exact-frame and partial-display optimality.
- Record the actual 42→43 witness baseline and direct result; flag discrepancies with the issue's stated 10 HTM instead of fabricating acceptance.
- No changes to CubeLab, Cubistry, Cubacle, UI, broad framework packages or 3×3 features. One focused Draft PR, no Ready transition or merge.
