# PR #77 review — Real application fixtures and acceptance parity

**Reviewed head:** `4e94b2d3ed386d09db6fa7e46e8233afbc7e7a74`  
**Source:** [PuzlWerk PR #77](https://github.com/wstein/puzlwerk/pull/77)  
**Status:** Review findings and **proposed follow-up scope**, not an implementation or owner acceptance decision.

## Verdict

PR #77 is a useful, bounded **acceptance inventory and renderer diagnostic**. It is **not yet** an interactive, source-equivalent application acceptance suite. It declares 98 routes: 53 Cubistry, 23 CubeAssembler, 16 CubeLab, and 6 Regrip. Most case pages currently show static source/fixture descriptions, status labels and temporary checkboxes. The diagnostic uses a generated 2×2 presentation to exercise production viewer rendering, a signed visual transition, drag, cancel and reset; this is not proof of physical legality, production PlayController integration, source parity or visual quality.

The PR's own description correctly disclaims source application comparison and owner acceptance. Preserve these disclaimers in every route and do not convert inventory/checklist existence into `passed` evidence.

## Recommended vertical acceptance slices (prioritized)

| Priority | Source family and concrete cases | Required native evidence and assets | Acceptance goal |
| --- | --- | --- | --- |
| P0 | CubeAssembler 2×2–7×7 viewer; especially `cube-assembler-viewer-7` | Source-native fixture ZIP/meta.json, actual state and geometry, palette, face pose, camera, controls | Original and PuzlWerk must render the **same** state and reproduce camera/view/play actions; include the 7×7 orientation ambiguity regression independently of viewer migration |
| P0 | Cubistry `cubistry-viewer-picture-projected`, `cubistry-picture3-edit` | `src/apps/playground/themes.ts` FaceSet registry with distinct six-face SVG/PNG/WebP sources, SHA-256, size, print version, crop/rotation, uploaded image path | Exact stickers on every face; no placeholder or substitute artwork; correct image orientation, stickerless appearance and update after turns |
| P0 | Cubistry `cubistry-calendar` and `cubistry-calendar7-names` | Calendar3 printing/artwork; Calendar7 `public/calendar7/state.v1.json`, `displays.v1.json`, source `fonts.ts`, `font-art.ts`, `sticker-art.ts`, `layout.ts` | Exact text, language, font metrics, ink classes, banners, special layer geometry and physically correct date-dependent state |
| P1 | `cubistry-calendar7-standard`, `cubistry-calendar7-any`, custom profile, schemes | Separate source standard/names/names-any datasets and layouts; date=2026-05 baseline; font/asset license manifest | Distinct layouts and print identities must remain distinguishable; research candidates **must not** be described as certified |
| P1 | Cubistry `cubistry-clock`, `cubistry-hm-clock`, timer / ms-timer / five-second timer | Native print and controllers, multiple physical cubes in a single scene, fixed virtual clock, actions, timing and animations | Two/three cubes with source-equivalent spacing/framing, concurrent transitions, start/pause/reset/set and deterministic time |
| P1 | Regrip `regrip-replay`, `regrip-gizmo`, `regrip-sync` | Native replay JSONL from GoCube Edge and GAN UI12; distinct sensor quaternion, virtual solver frame and presentation/axis gizmo | Real replay and orientation semantics, not an arbitrary static cube |
| P1 | CubeLab studio/player/patterns/pictures/manual input | Source-native CubeState/geometry/algorithms, image/pattern cases and user actions | Comparable state, move semantics, tutorial focus, solver and image orientation |
| P2 | General text-appearance contract | Measure actual cross-app needs from completed Calendar/Clock/Timer adapters | Consider schema extension **only** if existing `appearance-v1` plus a deterministic adapter demonstrably cannot preserve native output |

## Architecture boundaries

- Keep existing [wire-v1](../001-core-foundation/contracts/wire-v1.md) and [appearance-v1](../001-core-foundation/contracts/appearance-v1.md) canonical contracts unchanged without a separately reviewed ADR.
- `wire-v1`: mechanical definition/state and identity. `appearance-v1`: sticker color/image reference and declared symmetry. Image bytes, crop, font metrics, glyph layout, palette/material and rendering are **application/asset adapter responsibilities**, not hidden additions to the canonical state.
- Preserve source-native logical state and print identity when building fixture-specific adapters; produce real canonical fixture output, not hand-authored approximate colored cubes.
- Picture assets: honor source hash/version, all six face images, orientation, repeatable crop, original format and relevant licenses; do not commit unapproved or unlicensed binaries.
- Text assets: reproduce Canvas/SVG glyph generation with deterministic fonts and metric-aware layouts; report missing-font fallback as a failed or blocked visual parity case. Do not merely `fillText` a generic string at the center.
- Dynamic applications: use a frozen-time controller to assert exact physical state and simultaneous cubes; avoid real wall-clock nondeterminism in visual test capture.
- Regrip: keep sensor/physical cube orientation, virtual solver frame and display-only pose distinct.
- A valid screenshot cannot replace a source-to-core equivalence test; a passing unit test cannot replace interactivity and owner visual inspection.

## Per-route executable evidence contract

Each accepted route must expose or identify:

1. Pinned source application/revision and exact original route.
2. Source definition/state/printing (or reproducible source builder and inputs), plus hashes.
3. The `wire-v1` definition/state, `appearance-v1` and asset manifest generated from those same inputs (or explicit `BLOCKED`).
4. Source render vs PuzlWerk render using matched camera, light, viewport, orientation and state; if source hosting is unavailable, show specific licensing/technical blocker instead of a fake comparison.
5. Interactive actions with expected result and linked automated evidence; mouse, touch and keyboard where appropriate.
6. Versioned status: architecture, function, visual, owner; exact tested head, browser/device, fixture, log/traces and explicit owner decision.
7. Independent test of export/import roundtrip and original asset identity, for image/text cases.

## Delivery gates and sequence

1. **Keep PR #77 Draft:** its renderer-only diagnostic and informational cases remain clearly labeled; no claims of completed app parity.
2. Build one real vertical slice per family, beginning with NxN CubeAssembler, Picture Cube and Calendar7 names. Show native baseline and adapter mapping before broad migrations.
3. Continue with multi-cube Clock/Timer and Regrip sensor replay; then the remaining inventoried routes.
4. Open each implemented case locally with `npm run dev` at `http://127.0.0.1:4174/acceptance/<case>/`. Record the local route and independently verify reloads and assets.
5. Require exact-head architectural, functional and visual review, then separate **owner acceptance**. Merge, production release and broad consumer migration remain separately gated.
6. Follow-ups that add scope should be new, chronologically tracked work; do not silently rewrite already handed-off PR #77 scope.

## Evidence / limits of this review

Reviewed the PR #77 code (`acceptance/build.mjs`, `acceptance/diagnostic.js`), the acceptance-route manifest, existing `appearance-v1`, and source examples for Cubistry Calendar3/7, FaceSet, Clock/Timer and Regrip scene. The live external GitHub Pages URL was **not visually or interactively inspected by this review**. The ratings from the accompanying review (infrastructure/inventory ~8.5/10; completed consumer acceptance ~2/10) are **qualitative scope assessments**, not test results.

**No functional code changes, asset copies, canonical schema changes or merge permission are requested by this documentation-only PR.**
