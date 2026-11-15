# NxN notation standards audit — WI2

Status: proposal for integration and owner review, 2026-11-15. No implementation or owner approval is implied. Sources and evidence limits: [sources.md](sources.md). SM9's canonical AST decision is already made; the profile below does not reopen it. Q2 remains intentionally restricted; notation grammar does not enlarge Core legality.

## Size-aware matrix

`F` stands for any of U/L/F/R/B/D; positive quarter turn is clockwise when looking at that face. `nFw` starts at that face and includes n contiguous layers. WCA 12a requires 1 < n < N. The interior examples refer to a single layer or contiguous interval counted from that face, and are a proposed interpretation of SiGN grammar informed by CubeLab, not semantics proved by the grammar alone. All rows allow WCA face `R`, `R'`, `R2` and whole-puzzle `x`, `y'`, `z2`. Column 'interior' means geometrically interior indices, not a promise of Core execution. CubeLab parser coverage below is source/document evidence, not executed proof.

| N | WCA wide n | Single interior indices | Interior multi-layer ranges | CubeLab parser size |
|---|---|---|---|---|
| 2 | none | none | none | 2–5 accepted by entry guard |
| 3 | 2 (`Rw`) | 2 (`2R`) | none | 2–5 accepted by entry guard |
| 4 | 2, 3 (`Rw`, `3Rw`) | 2–3 | 2–3 (`2-3Rw`) | 2–5 accepted by entry guard |
| 5 | 2–4 | 2–4 | 2–3, 2–4, 3–4 | 2–5 accepted by entry guard |
| 6 | 2–5 | 2–5 | all `a-bRw`, 2 ≤ a < b ≤ 5 | rejected by current entry guard |
| 7 | 2–6 | 2–6 | all `a-bRw`, 2 ≤ a < b ≤ 6 | rejected by current entry guard |

SiGN Draft 6 admits positive integer + face and integer range + wide family syntactically; it does not establish per-size legality, frame conventions or actual implementation. WCA `2Rw` and `Rw` denote the same width; `1Rw` and `NRw` are invalid WCA block tokens. A full-width typed move should be rendered as an actual `x/y/z` rotation only when its domain semantics include that puzzle rotation; 2×2 `Rw` is not a valid block spelling. Half inverse `R2'` is syntactically admitted by Draft 6 and equivalent in cube state to `R2`, but not WCA's listed token spelling. Grammar acceptance, executable legality and WCA competition rules are separate assessments.

## Proposed deterministic display profile (owner decision pending)

- Validate size, legal move and frame using Core first; return typed error for unsupported model, out-of-range or unrepresentable move, rather than guessing or truncating. Normalize nonzero quarter turns modulo four to suffix empty, ASCII `'`, or `2`; identity is omitted only in flat executed-history output, with explicit loss metadata where relevant.
- Use WCA face tokens for outer single layers, `Fw` for width 2 and `nFw` for widths 3 through N−1; WCA `x/y/z` for actual whole-puzzle rotations. Use uppercase numbered `kF` for a single interior layer and `a-bFw` for a contiguous interior interval. Never default to `r`, `M/E/S`, `Ri`, `F2'`, or source-dialect aliases. These are WCA tokens plus explicit SiGN-style extensions, not a new official standard.
- For equivalent opposite-face references, represent a physical range [a,b] from either side as [N+1−b,N+1−a] from the opposite face with quarter-turn sign inverted. Prefer an outer-face spelling whenever the range touches an outer face; otherwise choose the reference with smaller start index, and on ties choose the fixed axis order R over L, U over D, F over B. Reverse direction when changing sides; half turns stay `2`. This makes `3R` on 4×4 `2L'` for the same physical quarter turn, whereas `2R` stays `2R`. The rule preserves the exact selected layers and physical action, not equivalence modulo global rotation. Frame mapping must be defined by the canonical AST/Core contract before implementation.
- Distinguish formatting an existing structured AST from formatting a flat execution trace. Structure-preserving serialization keeps nested group, commutator, conjugate, repeat counts, and supported annotation nodes in order. It may normalize spelling and whitespace; it is not byte-for-byte source preservation. Retain original source separately if required. Ignored line comments and editor trivia cannot be recovered from CubeLab's current AST; unsupported comments, pauses, timestamps or extensions require explicit error/loss report or a separately versioned extension, never silent deletion. LGN Draft lists comments and timestamps as extensions without defining their syntax; `.` and `/*…*/` are not established LGN core tokens.
- Parser input dialect is explicit. Default modern `r` means `Rw`; legacy lowercase `r` can mean `2R`; `F2'` is modern half turn but legacy Ruwix plaintext suffix-layer mode reads a wide inverse. ACube lowercase `m/e/s` means rotations `x'/y'/z`, not ordinary slice meanings. Do not infer a different dialect from ambiguous text. Existing saved strings need source version or an explicit migration choice. `2R` and `Rw` have distinct layer sets.

## Frame, compatibility, and tests

A camera orbit is presentation only and produces no move. Actual `x/y/z` modifies puzzle orientation in the declared frame, and subsequent moves must map through the same frame in replay, formatting and execution; distinguish physical pose, camera and solved orientation. Test noncommuting rotation-plus-turn sequences against execution, not text equality. CubeLab's workbench documents a fixed world-frame executor and separate coordinate relabeling; that convention must not silently dictate Core's contract.

For each size 2–7 propose positive and negative fixtures for face, all width boundaries, rotation, single interior and ranges; N=2 must reject wide and interior; N=6/7 specifically require new parser/semantic coverage. Exercise width 1/N/N+1, reversed/zero/out-of-bounds ranges, opposite-face equivalence, primes and inverse half, source-dialect ambiguity, structured AST preservation and comments/pauses, frame changes, and camera-only orbit. Compare typed moves and resulting states after parse/format/replay, not just strings. Test actual supported Core legality separately from grammar. No test or demo was executed in this audit.

Known discrepancy: CubeLab compatibility report says `M/E/S` are restricted to 3×3, but current `MoveParser.res` explicitly admits 3 and 5; `MoveTransform.res` documents 5×5 `M` as `3L`. Resolve documentation vs code before claiming behavior. Tests as written include 5×5 examples, but were not run here.
