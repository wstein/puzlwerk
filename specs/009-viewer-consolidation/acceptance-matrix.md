# Acceptance suite inventory and decisions

Status: source inventory and route proposal at PuzlWerk head `277bf5b89a4b139e3188b85cb7d8358b2a28d4bc`; implementation, functional and visual parity, hosted references and owner approvals are not established. The machine-readable `acceptance-routes.json` is the case-level authority for routes, source pins, native setup, actions, source tests, production interfaces, blockers and independent checklists. Source test references establish coverage intent, not a passing result. The 98 entries comprise registry modes, public entry aliases and distinct functional, renderer or source-library variants; entry aliases are not additional proof of functional coverage.

## Source pins and coverage boundaries

| Source | Revision | Inventory |
| --- | --- | --- |
| Cubistry | `efafcc1d97687eccea0cde87a230f447ce1b6c66` | 14 registry modes; all 15 Vite HTML inputs; source library, presentation, artwork, picture, calendar, timing and size-profile variants. Registry routing and defaults are in `src/apps/mode-catalog.ts`, `src/apps/routes.ts`, `src/apps/param-specs.ts` and `src/chronocube.mjs`; absent or unknown mode falls back to clock. The Playground only plays 2×2; sizes 3–7 are disabled and fall back to 2. Gesture primitives are library evidence, not a demonstrated application binding. |
| CubeAssembler | `8ac10f5ae65f68e56a08bad5bdb738efe0e5bd4f` | Scanner, capture, validation, profile and settings routes; 2D/3D, size 2–7, gestures and cancellation. Source already uses ReScript; compare its native core with an actual PuzlWerk bridge. Camera/touch acceptance needs real devices. |
| CubeLab | `5ab482719a31b894bd32d78ea76c64609b89acb2` | Astro routes `/`, `/academy`, `/workbench`, `/patterns`, `/timer`, `/player`, `/dev/mock`; viewport, playback, overlays, device and lifecycle cases. Its native WebGL viewport remains in use until its migration. |
| Regrip | `ebe7d32d0fd1f0b74c528cd38618afda3f5a991e` | Landing, console, docs, bundled replay, gyro/frame, TwistyPlayer and Three gizmo. Replay is not hardware evidence. |

Cases reflect identified screens and distinct flows; the manifest explicitly names unexported source fixtures and unresolved integration. Asset licensing, legal hosting, exact cross-system fixture exports and actual visual results remain per-case gates. For 7×7 names use the real source `geometry.ts`, `layerProfileFor`, `unitGridTileOf` and pinned `public/calendar7/chain-c/` data; no generic approximation is a reference. The default outer factors for 2–7 are 1, 1, 1, 1.1, 1.3 and 1.6 respectively. Names 7×7 has widths `[1.6,1,1,1,1,1,1.6]`; standard has unit pitch.

## Case index

Each listed route is relative to one configured base and has its own checklist and owner decision in the manifest. These are reserved routes, not deployed pages. The nested PR 72 path is `/puzlwerk/pr-preview/pr-72/` plus the route.

| Case ID | Relative route | Source screen |
| --- | --- | --- |
| `cubistry-clock` | `acceptance/cubistry-clock/` | Cubistry: `index.html?app=clock` |
| `cubistry-ms-timer` | `acceptance/cubistry-ms-timer/` | Cubistry: `index.html?app=ms-timer` |
| `cubistry-calendar` | `acceptance/cubistry-calendar/` | Cubistry: `index.html?app=calendar` |
| `cubistry-playground` | `acceptance/cubistry-playground/` | Cubistry: `index.html?app=playground` |
| `cubistry-hm-clock` | `acceptance/cubistry-hm-clock/` | Cubistry: `index.html?app=hm-clock` |
| `cubistry-tenth` | `acceptance/cubistry-tenth/` | Cubistry: `index.html?app=tenth` |
| `cubistry-counter` | `acceptance/cubistry-counter/` | Cubistry: `index.html?app=counter` |
| `cubistry-timer` | `acceptance/cubistry-timer/` | Cubistry: `index.html?app=timer` |
| `cubistry-five-second-timer` | `acceptance/cubistry-five-second-timer/` | Cubistry: `index.html?app=five-second-timer` |
| `cubistry-hsm-counter` | `acceptance/cubistry-hsm-counter/` | Cubistry: `index.html?app=hsm-counter` |
| `cubistry-ms-counter` | `acceptance/cubistry-ms-counter/` | Cubistry: `index.html?app=ms-counter` |
| `cubistry-hm-one-cube` | `acceptance/cubistry-hm-one-cube/` | Cubistry: `index.html?app=hm-one-cube` |
| `cubistry-calendar7` | `acceptance/cubistry-calendar7/` | Cubistry: `index.html?app=calendar7` |
| `cubistry-ci` | `acceptance/cubistry-ci/` | Cubistry: `index.html?app=ci` |
| `cubistry-entry-picture3` | `acceptance/cubistry-entry-picture3/` | Cubistry: `picture3.html` |
| `cubistry-entry-status` | `acceptance/cubistry-entry-status/` | Cubistry: `status.html` |
| `cubistry-entry-print` | `acceptance/cubistry-entry-print/` | Cubistry: `print.html` |
| `cubistry-entry-ms-timer` | `acceptance/cubistry-entry-ms-timer/` | Cubistry: `ms-timer.html` |
| `cubistry-entry-index` | `acceptance/cubistry-entry-index/` | Cubistry: `index.html` |
| `cubistry-entry-counter` | `acceptance/cubistry-entry-counter/` | Cubistry: `counter.html` |
| `cubistry-entry-timer` | `acceptance/cubistry-entry-timer/` | Cubistry: `timer.html` |
| `cubistry-entry-five-second` | `acceptance/cubistry-entry-five-second/` | Cubistry: `five-second-timer.html` |
| `cubistry-entry-tenth` | `acceptance/cubistry-entry-tenth/` | Cubistry: `tenth-counter.html` |
| `cubistry-entry-hsm` | `acceptance/cubistry-entry-hsm/` | Cubistry: `hsm-counter.html` |
| `cubistry-entry-ms-counter` | `acceptance/cubistry-entry-ms-counter/` | Cubistry: `ms-counter.html` |
| `cubistry-entry-hm-one` | `acceptance/cubistry-entry-hm-one/` | Cubistry: `hm-one-cube.html` |
| `cubistry-entry-solver-acceptance` | `acceptance/cubistry-entry-solver-acceptance/` | Cubistry: `solver-acceptance.html` |
| `cubistry-entry-library` | `acceptance/cubistry-entry-library/` | Cubistry: `library-example.html` |
| `cubistry-entry-licenses` | `acceptance/cubistry-entry-licenses/` | Cubistry: `licenses.html` |
| `cubistry-viewer-default` | `acceptance/cubistry-viewer-default/` | Cubistry: `index.html?app=counter` |
| `cubistry-viewer-view-drag` | `acceptance/cubistry-viewer-view-drag/` | Cubistry: `index.html?app=counter` |
| `cubistry-viewer-play-gesture` | `acceptance/cubistry-viewer-play-gesture/` | Cubistry: `No source application route established; library API case.` |
| `cubistry-viewer-animation` | `acceptance/cubistry-viewer-animation/` | Cubistry: `index.html?app=counter` |
| `cubistry-viewer-artwork` | `acceptance/cubistry-viewer-artwork/` | Cubistry: `index.html?app=playground` |
| `cubistry-viewer-stickerless` | `acceptance/cubistry-viewer-stickerless/` | Cubistry: `index.html?app=playground` |
| `cubistry-viewer-picture-projected` | `acceptance/cubistry-viewer-picture-projected/` | Cubistry: `index.html?app=playground&pictures=projected` |
| `cubistry-viewer-lighting` | `acceptance/cubistry-viewer-lighting/` | Cubistry: `index.html?app=clock` |
| `cubistry-calendar7-standard` | `acceptance/cubistry-calendar7-standard/` | Cubistry: `index.html?app=calendar7&year=2026&month=5` |
| `cubistry-calendar7-names` | `acceptance/cubistry-calendar7-names/` | Cubistry: `index.html?app=calendar7&layout=names&year=2026&month=5` |
| `cubistry-calendar7-any` | `acceptance/cubistry-calendar7-any/` | Cubistry: `index.html?app=calendar7&layout=names-any&year=2026&month=5` |
| `cubistry-calendar7-custom-profile` | `acceptance/cubistry-calendar7-custom-profile/` | Cubistry: `index.html?app=calendar7&layout=names&outer=1.8` |
| `cubistry-calendar7-schemes` | `acceptance/cubistry-calendar7-schemes/` | Cubistry: `index.html?app=calendar7&scheme=dracula` |
| `cubistry-calendar7-playback-layout` | `acceptance/cubistry-calendar7-playback-layout/` | Cubistry: `index.html?app=calendar7` |
| `cubistry-calendar3-english` | `acceptance/cubistry-calendar3-english/` | Cubistry: `index.html?app=calendar&lang=en&date=2026-05-01` |
| `cubistry-playground-upload` | `acceptance/cubistry-playground-upload/` | Cubistry: `index.html?app=playground` |
| `cubistry-picture3-edit` | `acceptance/cubistry-picture3-edit/` | Cubistry: `picture3.html` |
| `cubistry-geometry-2` | `acceptance/cubistry-geometry-2/` | Cubistry: `No source application route for this arbitrary N profile; source geometry builder case.` |
| `cubistry-geometry-3` | `acceptance/cubistry-geometry-3/` | Cubistry: `No source application route for this arbitrary N profile; source geometry builder case.` |
| `cubistry-geometry-4` | `acceptance/cubistry-geometry-4/` | Cubistry: `No source application route for this arbitrary N profile; source geometry builder case.` |
| `cubistry-geometry-5` | `acceptance/cubistry-geometry-5/` | Cubistry: `No source application route for this arbitrary N profile; source geometry builder case.` |
| `cubistry-geometry-6` | `acceptance/cubistry-geometry-6/` | Cubistry: `No source application route for this arbitrary N profile; source geometry builder case.` |
| `cubistry-geometry-7` | `acceptance/cubistry-geometry-7/` | Cubistry: `No source application route for this arbitrary N profile; source geometry builder case.` |
| `cube-assembler-scanner-home` | `acceptance/cube-assembler-scanner-home/` | CubeAssembler: `/` |
| `cube-assembler-camera` | `acceptance/cube-assembler-camera/` | CubeAssembler: `/` |
| `cube-assembler-photo-upload` | `acceptance/cube-assembler-photo-upload/` | CubeAssembler: `/` |
| `cube-assembler-color-review` | `acceptance/cube-assembler-color-review/` | CubeAssembler: `/` |
| `cube-assembler-orientation-review` | `acceptance/cube-assembler-orientation-review/` | CubeAssembler: `/` |
| `cube-assembler-net-validity` | `acceptance/cube-assembler-net-validity/` | CubeAssembler: `/` |
| `cube-assembler-notation-input-output` | `acceptance/cube-assembler-notation-input-output/` | CubeAssembler: `/` |
| `cube-assembler-viewer-3d` | `acceptance/cube-assembler-viewer-3d/` | CubeAssembler: `/` |
| `cube-assembler-viewer-camera` | `acceptance/cube-assembler-viewer-camera/` | CubeAssembler: `/` |
| `cube-assembler-viewer-play` | `acceptance/cube-assembler-viewer-play/` | CubeAssembler: `/` |
| `cube-assembler-viewer-cancel` | `acceptance/cube-assembler-viewer-cancel/` | CubeAssembler: `/` |
| `cube-assembler-fixture-export` | `acceptance/cube-assembler-fixture-export/` | CubeAssembler: `/` |
| `cube-assembler-profiles-colors` | `acceptance/cube-assembler-profiles-colors/` | CubeAssembler: `/#profiles/colors` |
| `cube-assembler-profiles-cubes` | `acceptance/cube-assembler-profiles-cubes/` | CubeAssembler: `/#profiles/cubes` |
| `cube-assembler-profiles-transfer` | `acceptance/cube-assembler-profiles-transfer/` | CubeAssembler: `/#profiles` |
| `cube-assembler-settings` | `acceptance/cube-assembler-settings/` | CubeAssembler: `/#settings` |
| `cubelab-studio` | `acceptance/cubelab-studio/` | CubeLab: `/` |
| `cubelab-player` | `acceptance/cubelab-player/` | CubeLab: `/player` |
| `cubelab-workbench` | `acceptance/cubelab-workbench/` | CubeLab: `/workbench` |
| `cubelab-patterns` | `acceptance/cubelab-patterns/` | CubeLab: `/patterns` |
| `cubelab-academy` | `acceptance/cubelab-academy/` | CubeLab: `/academy` |
| `cubelab-timer` | `acceptance/cubelab-timer/` | CubeLab: `/timer` |
| `cubelab-mock-device` | `acceptance/cubelab-mock-device/` | CubeLab: `/dev/mock` |
| `cubelab-styles` | `acceptance/cubelab-styles/` | CubeLab: `/` |
| `cubelab-turns` | `acceptance/cubelab-turns/` | CubeLab: `/` |
| `cubelab-focus-guides` | `acceptance/cubelab-focus-guides/` | CubeLab: `/academy` |
| `cubelab-orientation-debug` | `acceptance/cubelab-orientation-debug/` | CubeLab: `/dev/mock` |
| `cubelab-orbit-lifecycle` | `acceptance/cubelab-orbit-lifecycle/` | CubeLab: `/` |
| `cubelab-capture` | `acceptance/cubelab-capture/` | CubeLab: `/` |
| `cubelab-manual-input` | `acceptance/cubelab-manual-input/` | CubeLab: `/` |
| `cubelab-pictures` | `acceptance/cubelab-pictures/` | CubeLab: `/academy` |
| `cubelab-drills` | `acceptance/cubelab-drills/` | CubeLab: `/academy` |
| `regrip-console` | `acceptance/regrip-console/` | Regrip: `/console/` |
| `regrip-replay` | `acceptance/regrip-replay/` | Regrip: `/console/` |
| `regrip-gizmo` | `acceptance/regrip-gizmo/` | Regrip: `/console/` |
| `regrip-sync` | `acceptance/regrip-sync/` | Regrip: `/console/` |
| `cube-assembler-viewer-2` | `acceptance/cube-assembler-viewer-2/` | CubeAssembler: `/` |
| `cube-assembler-viewer-3` | `acceptance/cube-assembler-viewer-3/` | CubeAssembler: `/` |
| `cube-assembler-viewer-4` | `acceptance/cube-assembler-viewer-4/` | CubeAssembler: `/` |
| `cube-assembler-viewer-5` | `acceptance/cube-assembler-viewer-5/` | CubeAssembler: `/` |
| `cube-assembler-viewer-6` | `acceptance/cube-assembler-viewer-6/` | CubeAssembler: `/` |
| `cube-assembler-viewer-7` | `acceptance/cube-assembler-viewer-7/` | CubeAssembler: `/` |
| `regrip-landing` | `acceptance/regrip-landing/` | Regrip: `/` |
| `regrip-docs` | `acceptance/regrip-docs/` | Regrip: `/docs/` |

| `cubistry-viewer-hidden` | `acceptance/cubistry-viewer-hidden/` | Cubistry: `No separate app route; production rotation binding exercised by viewer.` |

| `cube-assembler-orientation-gizmo` | `acceptance/cube-assembler-orientation-gizmo/` | CubeAssembler: `/` |

## Contract and decision register

| Item | Status | Required resolution |
| --- | --- | --- |
| Physical definition and state | Binding [wire-v1](../001-core-foundation/contracts/wire-v1.md); ReScript `core/res/PwCodec.resi`, `PwMove.resi` | Select identical real definition/state fixtures and legal action traces per case. `PwMove.applyToPose` does not enforce definition move policy; the policy-aware legality function is internal to `PwValidate`, and a public definition/state/move operation remains missing. Do not recreate policy in TypeScript. |
| Sticker appearance | Binding [appearance-v1](../001-core-foundation/contracts/appearance-v1.md) | Map actual appearance IDs, orientation and assets through a production integration. `test/helpers/appearance-reference.mjs` is a reference helper; a production ReScript appearance decoder has not been established. |
| Goal wire | **MISSING** | The typed in-memory `PwGoal` API exists; goal wire T013a is not implemented. Do not invent a wire format. |
| Shared viewer | `packages/viewer/src/index.ts#createCubeScene`, `CubeScene` and stage interfaces exist | Case-level wire/appearance-to-projection mapping and production call evidence remain missing. Existing viewer tests do not establish consumer parity. |
| Shared play controller | **MISSING** at the pinned PuzlWerk head | Specify and implement the production interface in a separately authorized phase. Existing Cubistry `src/apps/shared/playback.ts` and CubeLab `src/client/playback.ts` are separate implementations. Until then, play cases are blocked. |
| Original references and licenses | **UNKNOWN** per case | Pin reproducible original, source revision, asset provenance and hosting eligibility; unavailable or unlicensed originals block the comparison. |
| Route and build interface | Proposal | Routes are relative `acceptance/<id>/` under one configured base. Example `/puzlwerk/pr-preview/pr-72/acceptance/<id>/` is a hypothetical nested Pages path, not a live URL. Build command and manifest schema remain open. Test direct navigation, assets, workers and module imports at `/puzlwerk/` and `/puzlwerk/pr-preview/pr-72/`. One PR produces one preview, not one deployment per case. |
| Results | Proposal | Record architecture, functional and visual independently using `not implemented`, `not tested`, `passed`, `failed`, `blocked` or `owner approved`, with head, evidence and owner decision where applicable. Never infer owner approval. |
| Preview and production policy | Proposal; gate **UNKNOWN** | See [preview plan](acceptance-preview-plan.md). Variable read returned 403; do not infer false or absence. Preserve explicit `deploy=true` production dispatch. Preview events may combine only verified already-published root bytes with their namespace, never unpublished main. Storage and verification require an owner decision. |
| Acceptance record and approval | Owner decision open | Recommend versioned records with explicit attributable owner decision, exact case/head/fixture/scope and evidence. Local UI checks are observations, never owner approval; changed head or fixture invalidates the affected record. Architecture, functional and visual results stay separate. |
| Activation | Not authorized | No workflow, publication, Pages setting or preview activation follows from this proposal. |

Each case names source app and screen, exact original and prospective route, cube and definition/state, appearance, camera, actions, assets, source component and tests, production core/viewer/play references, license eligibility, normal and nested-base links, checklist, trace, evidence and separate statuses. Check each case independently; a success for one case does not approve another. Renderer diagnostics establish only the exercised renderer behavior, not application parity.

## Native fixture execution plan

The inventory above is not an executable comparison. The following families
must use identical source-native inputs and actions on the original and adapted
paths. Presentation, camera, lighting, layout, fonts, time and asset manifests
are separate from the closed wire-v1 and appearance-v1 documents. A native
application JSON file is not itself a wire or appearance document.

| Family | Required evidence | Current fixture status |
| --- | --- | --- |
| NxN and moves | A production native factory and state with stable piece and sticker IDs, orientations, and an action-by-action trace; compare actual original component, core state and shared viewer. Cover other sizes with their own source evidence. | Cubistry Playground classic 2×2 native print, assets, target and R U R' U' trace are recorded under `acceptance/fixtures/cubistry-playground-classic-2/`. The original viewer and its source packages and a native-ID wire export are packaged; executable paired-view verification remains open. No other size is established by this fixture. |
| Picture | Original six distinct licensed faces, registry and all 54 tiles with crop and up orientation, including C1 behavior; record source bytes and rights. | Blocked: source extraction, mappings, original and adapted views not demonstrated. Private upload rights are unknown. |
| Calendar 3 and 7 | Native JSON and fixed date; standard, names and names-any configurations, chain data and hashes; actual glyph generation, font files and licenses, metrics, palette, layout and banner geometry. Canvas runtime art is not an SVG atlas. | Blocked: reproducible source artwork, native configuration and paired views not packaged. |
| Clock and timer | Native fixed-time state and original application configuration, two- and three-cube layouts and synchronized actions; compare each cube and scene. | Blocked: native frozen state and synchronized paired scenes not packaged. |
| Regrip replay | Original GoCube and GAN JSONL, native replay actions, separate physical pose, virtual frame and presentation frame; identify replay UI as development-only. | GoCube and GAN native JSONL inputs and MIT notice are recorded under `acceptance/fixtures/regrip-replay/`. Source execution and frame adapter remain blocked; no live sensor claim. |

For every family record source revision, complete executed dependency closure,
asset hashes and applicable notices, fixture provenance, actual action trace,
conversion evidence and per-case architecture, functional and visual results.
Do not infer sticker identity from colors or infer full-family coverage from
one case. Original hosting and visual acceptance remain separate gates.
