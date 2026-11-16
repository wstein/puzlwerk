# Acceptance suite inventory and decisions

Status: **incomplete draft**, based on PuzlWerk head `277bf5b89a4b139e3188b85cb7d8358b2a28d4bc`. No case has been run or approved. This is a scope inventory, not a claim of exhaustive coverage. The `acceptance-routes.json` route manifest reserves one prospective route per Cubistry registry mode. It is not a runnable suite. Complete the remaining inventory and case data before implementation.

## Source pins and inventory boundaries

| Source | Revision | Evidence and remaining work |
| --- | --- | --- |
| Cubistry | `efafcc1d97687eccea0cde87a230f447ce1b6c66` | [Mode catalog](https://github.com/wstein/cubistry/blob/efafcc1d97687eccea0cde87a230f447ce1b6c66/src/apps/mode-catalog.ts) lists 14 modes. `src/apps/routes.ts` parses `index.html?app=`. The manifest records these modes, not every setting, screen, legacy HTML entry or action. Inventory `picture3.html`, print and other root HTML entries separately. |
| CubeAssembler | `8ac10f5ae65f68e56a08bad5bdb738efe0e5bd4f` | [CubeView3D](https://github.com/wstein/cube-assembler/blob/8ac10f5ae65f68e56a08bad5bdb738efe0e5bd4f/src/client/view3d/cubeView3D.tsx) composes rendering, camera, turns and gestures. Inventory scan, camera, validation, assembling and profile flows and public routes. |
| CubeLab | `5ab482719a31b894bd32d78ea76c64609b89acb2` | [Cube viewport](https://github.com/wstein/cubelab/blob/5ab482719a31b894bd32d78ea76c64609b89acb2/src/client/cube-gl.ts) and `src/pages/` are source starting points. Inventory studio, player, Academy, timer, smart-cube and overlays. |
| Regrip | `ebe7d32d0fd1f0b74c528cd38618afda3f5a991e` | [Repository guidance](https://github.com/wstein/regrip/blob/ebe7d32d0fd1f0b74c528cd38618afda3f5a991e/AGENTS.md) identifies `/console/` and replay. Inventory gyro, frame, replay, devices and visual adapters. |

Tests cited in the manifest are candidates for further inspection, not evidence that a particular acceptance scenario passes. No source test was executed for this inventory. Capture source file, symbol and relevant tests for every additional case, including action-specific checks.

## Required coverage before implementation

| Dimension | Source starting point | Open work |
| --- | --- | --- |
| View and play modes, camera, zoom, mouse and touch | Cubistry `packages/cube-viewer/src/presentation-input.ts`, `play-gesture.ts`; CubeAssembler `src/client/view3d/useCubeCamera.ts`, `useCubeGestures.ts`; CubeLab `src/client/cube-gl.ts` | Enumerate defaults, controls and distinct source actions; pin expected traces and matching tests. |
| Animation, interruption, cancellation and hidden state | Cubistry `packages/cube-viewer/src/index.ts`, `src/apps/calendar7/playback-visibility.ts`; CubeAssembler `core/view/TurnAnimation.res`; CubeLab `docs/3d-viewport.md` | Pin each contract and its observable endpoints; do not equate different cancellation policies. |
| Sizes 2–7, geometry, stickerless, miter, UV, pictures and printed names | Cubistry `packages/cube-viewer/src/physical-scene.ts`, `src/apps/calendar7/geometry.ts`, `src/apps/calendar7/sticker-art.ts`; PuzlWerk `packages/viewer/src/contract.ts` | Individual source-backed cases and actual profile data remain unselected. Partial 7x7 geometry must use its real source, not an approximation. |
| Themes, lighting, clock and calendar presentation | Cubistry `src/apps/clock/stage.ts`, `src/apps/calendar7/schemes.ts`, `src/apps/calendar7/names-exposure.ts`; PuzlWerk `packages/viewer/src/stage-lighting.ts` | Enumerate source configurations, camera and assets; record exact source and shared traces. |
| Scan, validation, device, replay and overlays | CubeAssembler `src/client/capture/`, CubeLab `src/client/smart-cube/`, Regrip `packages/core/src/session/` | Map each relevant application boundary and a reproducible fixture or explicit hardware blocker; do not claim device acceptance from replay. |

## Contract and decision register

| Item | Status | Required resolution |
| --- | --- | --- |
| Physical definition and state | Binding [wire-v1](../001-core-foundation/contracts/wire-v1.md); ReScript `core/res/PwCodec.resi`, `PwMove.resi` | Select identical real definition/state fixtures and legal action traces per case. No new physical codec or TypeScript mechanics engine. |
| Sticker appearance | Binding [appearance-v1](../001-core-foundation/contracts/appearance-v1.md) | Map actual appearance IDs, orientation and assets. `test/helpers/appearance-reference.mjs` is a reference helper; a production ReScript appearance decoder has not been established. |
| Shared viewer | `packages/viewer/src/index.ts#createCubeScene`, `CubeScene` and stage interfaces exist | Case-level wire/appearance-to-projection mapping and production call evidence remain missing. Existing viewer tests do not establish consumer parity. |
| Shared play controller | **MISSING** at the pinned PuzlWerk head | Specify and implement the production interface in a separately authorized phase. Existing Cubistry `src/apps/shared/playback.ts` and CubeLab `src/client/playback.ts` are separate implementations. Until then, play cases are blocked. |
| Original references and licenses | **UNKNOWN** per case | Pin reproducible original, source revision, asset provenance and hosting eligibility; unavailable or unlicensed originals block the comparison. |
| Route and build interface | Proposal | Routes are relative `acceptance/<id>/` under one configured base. Example `/puzlwerk/pr-preview/pr-72/acceptance/<id>/` is a hypothetical nested Pages path, not a live URL. Build command and manifest schema remain open. Test direct navigation, assets, workers and module imports at both root and nested bases. One PR produces one preview, not one deployment per case. |
| Results | Proposal | Record architecture, functional and visual independently using `not implemented`, `not tested`, `passed`, `failed`, `blocked` or `owner approved`, with head, evidence and owner decision where applicable. Never infer owner approval. |
| Activation | Not authorized | No workflow, publication, Pages setting or preview activation follows from this draft. |

Each final case must name source app and screen, exact original and prospective route, cube and definition/state, appearance, camera, actions, assets, source component and tests, production core/viewer/play references, license eligibility, root and nested-base links, checklist, trace, evidence and separate statuses. Check each case independently; a success for one case does not approve another.
