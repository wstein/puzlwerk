# Acceptance suite inventory and decisions

Status: source inventory and route proposal, initially pinned at PuzlWerk head `277bf5b89a4b139e3188b85cb7d8358b2a28d4bc`; implementation, functional and visual parity, hosted references and owner approvals are not established. The machine-readable `acceptance-routes.json` is the case-level authority for routes, source pins, native setup, actions, source tests, production interfaces, blockers and independent checklists. Source test references establish coverage intent, not a passing result. The 101 entries (54 Cubistry, 25 CubeAssembler, 16 CubeLab and 6 Regrip) comprise registry modes, public entry aliases and distinct functional, renderer or source-library variants; entry aliases are not additional proof of functional coverage.

## Source pins and coverage boundaries

| Source | Revision | Inventory |
| --- | --- | --- |
| Cubistry | `efafcc1d97687eccea0cde87a230f447ce1b6c66` | 14 registry modes; all 15 Vite HTML inputs; source library, presentation, artwork, picture, calendar, timing and size-profile variants. Registry routing and defaults are in `src/apps/mode-catalog.ts`, `src/apps/routes.ts`, `src/apps/param-specs.ts` and `src/chronocube.mjs`; absent or unknown mode falls back to clock. The Playground only plays 2×2; sizes 3–7 are disabled and fall back to 2. Gesture primitives are library evidence, not a demonstrated application binding. |
| CubeAssembler | `8ac10f5ae65f68e56a08bad5bdb738efe0e5bd4f` | Scanner, capture, validation, profile and settings routes; 2D/3D, size 2–7, gestures and cancellation. Source already uses ReScript; compare its native core with an actual PuzlWerk bridge. Camera/touch acceptance needs real devices. |
| CubeLab | `5ab482719a31b894bd32d78ea76c64609b89acb2` | Astro routes `/`, `/academy`, `/workbench`, `/patterns`, `/timer`, `/player`, `/dev/mock`; viewport, playback, overlays, device and lifecycle cases. Its native WebGL viewport remains in use until its migration. |
| Regrip | `ebe7d32d0fd1f0b74c528cd38618afda3f5a991e` | Landing, console, docs, bundled replay, gyro/frame, TwistyPlayer and Three gizmo. Replay is not hardware evidence. |

Cases reflect identified screens and distinct flows; the manifest explicitly names unexported source fixtures and unresolved integration. Asset licensing, legal hosting, exact cross-system fixture exports and actual visual results remain per-case gates. For 7×7 names use the real source `geometry.ts`, `layerProfileFor`, `unitGridTileOf` and pinned `public/calendar7/chain-c/` data; no generic approximation is a reference. The default outer factors for 2–7 are 1, 1, 1, 1.1, 1.3 and 1.6 respectively. Names 7×7 has widths `[1.6,1,1,1,1,1,1.6]`; standard has unit pitch.

## Case index

Each listed route is relative to one configured base and has its own checklist and owner decision in the manifest. These are reserved routes, not deployed pages. The local address is `http://127.0.0.1:4174/` plus the route.

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
| `cubistry-playground-classic-2` | `acceptance/cubistry-playground-classic-2/` | Cubistry: native Playground classic 2×2 comparison |
| `cube-assembler-solved-2` | `acceptance/cube-assembler-solved-2/` | CubeAssembler: native solved 2×2 viewer comparison |
| `cube-assembler-capture-recovery` | `acceptance/cube-assembler-capture-recovery/` | CubeAssembler: proposed explicit recovery from capture/guide conflicts; not implemented |

## Contract and decision register

| Item | Status | Required resolution |
| --- | --- | --- |
| Physical definition and state | Binding [wire-v1](../001-core-foundation/contracts/wire-v1.md); ReScript `core/res/PwCodec.resi`, `PwMove.resi` | Select identical real definition/state fixtures and legal action traces per case. `PwMove.applyToPose` does not enforce definition move policy; the existing `PwValidate.applyMove` is the policy-aware public operation. `PwValidate.assess` separates structural, invariant and reachability evidence. Do not recreate policy in TypeScript. |
| Sticker appearance | Binding [appearance-v1](../001-core-foundation/contracts/appearance-v1.md) | Map actual appearance IDs, orientation and assets through a production integration. `test/helpers/appearance-reference.mjs` is a reference helper; a production ReScript appearance decoder has not been established. |
| Goal wire | **MISSING** | The typed in-memory `PwGoal` API exists; goal wire T013a is not implemented. Do not invent a wire format. |
| Shared viewer | `packages/viewer/src/index.ts#createCubeScene`, `CubeScene` and stage interfaces exist | Case-level wire/appearance-to-projection mapping and production call evidence remain missing. Existing viewer tests do not establish consumer parity. |
| Shared play controller | **MISSING** at the pinned PuzlWerk head | Specify and implement the production interface in a separately authorized phase. Existing Cubistry `src/apps/shared/playback.ts` and CubeLab `src/client/playback.ts` are separate implementations. Until then, play cases are blocked. |
| Original references and licenses | **UNKNOWN** per case | Pin reproducible original, source revision, asset provenance and hosting eligibility; unavailable or unlicensed originals block the comparison. |
| Route and build interface | Proposal | Routes are relative `acceptance/<id>/` under one configured base. Use `npm run dev` to serve the local suite and test direct navigation, reloads, assets, workers and module imports under `http://127.0.0.1:4174/`. |
| Results | Proposal | Record architecture, functional and visual independently using `not implemented`, `not tested`, `passed`, `failed`, `blocked` or `owner approved`, with head, evidence and owner decision where applicable. Never infer owner approval. |
| Local review and production policy | Local comparisons | Run `npm run dev` and use the loopback routes in the manifest. Production documentation remains a separate explicit `deploy=true` dispatch. The [preview plan](acceptance-preview-plan.md) is historical. |
| Acceptance record and approval | Owner decision open | Recommend versioned records with explicit attributable owner decision, exact case/head/fixture/scope and evidence. Local UI checks are observations, never owner approval; changed head or fixture invalidates the affected record. Architecture, functional and visual results stay separate. |
| Publication | Separate owner decision | Local comparisons do not publish or approve production documentation. |
| Capture recovery | [Proposed application envelope/port](spec.md#proposed-capture-recovery-application-contract); **not implemented** | Keep immutable observations, draft mappings and explicitly confirmed state separate; negotiate feasibility, reachability and search completeness independently. Existing wire/appearance contracts stay unchanged. Export compatibility and extraction/package placement remain open. |

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
| Regrip replay | Original GoCube and GAN JSONL, native replay actions, separate physical pose, virtual frame and presentation frame; identify replay UI as development-only. | Blocked: replay inputs, source execution and frame adapter not packaged; no live sensor claim. |

For every family record source revision, complete executed dependency closure,
asset hashes and applicable notices, fixture provenance, actual action trace,
conversion evidence and per-case architecture, functional and visual results.
Do not infer sticker identity from colors or infer full-family coverage from
one case. Original hosting and visual acceptance remain separate gates.

### CubeAssembler native 2×2 comparison

The bounded case `cube-assembler-solved-2` starts from the pinned production
`createSolvedCube(2)` and applies the native R U R' U' trace. Its original side
uses the pinned `CubeView3D` component, Preact, its native hooks and CSS. The
fixture's candidate wire IDs label known solved home slots; CubeAssembler's
color-only `CubeState` supplies no physical piece IDs, sticker IDs or sticker
orientations. The visible facelet projection follows the pinned native face
indexing. A local Core test compares the 24 visible colors after each action;
it does not establish hidden physical identity or scan-to-view parity. Cookie
preferences must be fixed for reproducible browser comparison. Original and
candidate rendering, touch, visual acceptance and independent review remain
open. The 7×7 orientation-recovery workflow is outside this case.

**Current status: blocked.** The shared native scene rejects source mesh profiles
(`Independent mesh profiles require a shared native capability`), so the case
page shows `BLOCKED: source mesh requires a shared native geometry capability.`
and no candidate rendering or facelet comparison runs. CI asserts this block with
`acceptance/test/cube-assembler-blocked-browser.mjs`. The earlier browser checks
`cube-assembler-browser.mjs` (facelet equality after each move) and
`cube-assembler-appearance-browser.mjs` are kept in the repository but are not run
by CI; they are to be restored with a follow-up issue that adds source mesh
support to the shared scene. No parity with CubeAssembler is claimed.

### CubeAssembler capture-recovery proposal

Case `cube-assembler-capture-recovery` reserves one informational inventory route
for the [proposed envelope and application port](spec.md#proposed-capture-recovery-application-contract).
Implementation: **not implemented**; architecture: **blocked**; functional,
visual and owner acceptance: **not tested / UNKNOWN**. There is no recovery runtime
or hosted original on this route. A bounded local ReScript domain package for
WI1/WI2 is recorded in the specification; its unit and package evidence does not
implement this application comparison. The following scenarios are proposed checks,
not claims that existing source tests implement or pass them.

Source evidence: [CubeAssembler PR #56](https://github.com/wstein/cube-assembler/pull/56),
Draft/unmerged at `bab97177a0d4b860d47308f57df20963dfdc9946`, contains
`CaptureRecovery`, `CaptureFaceMapping`, `SpatialOrientationWizard` and their
browser bindings, plus `test/captureRecoveryPersistence.test.ts`,
`test/captureFaceMapping.test.ts`, `test/spatialOrientationWizard.test.ts`,
`test/guidedCaptureProtocol.test.ts`, `e2e/capture-recovery.spec.ts` and
`e2e/spatial-orientation.spec.ts`. Those files were inspected as coverage intent,
not executed here. The existing native 2×2 comparison above and its
`acceptance/fixtures/cube-assembler-solved-2/provenance.json` are a different case;
they establish neither captured physical identity nor capture recovery.

| Scenario | Required observable result/evidence |
| --- | --- |
| CR1 Correct guide capture, mirrored and unmirrored | Preserve all six source observations and protocol/step/mirror provenance; use the checked guide seed without silent alternative ranking. Verify all five transitions with marked facelets and canonical versus capture-frame mapping. |
| CR2 Wrong order or face rotation | Guide failure stays visible. Search starts only after Find a matching cube; retained choices permute whole faces and quarter turns without changing colors. Preview/selection never commits. |
| CR3 Even-size whole-face mapping | On real 4×4 and a separately pinned 2×2/6×6 input, assign every selected source photo exactly once to all six logical faces; no center-color inference. Record the original-to-canonical transformation and source IDs. |
| CR4 Odd fixed centers | On separately pinned 3×3/5×5/7×7 inputs, constrain by the actual fixed centers and profile; conflicting/duplicate centers are explicit. Do not infer full large-cube reachability from those constraints. |
| CR5 Missing, retaken or mixed observations | Incomplete guide data, inconsistent mirror mode and retakes retain uncertain provenance and the existing incomplete-capture guard. No automatic legacy reinterpretation; explicit recovery cannot manufacture missing face data. Retakes invalidate affected candidate revisions. |
| CR6 No, multiple, symmetric or truncated candidates | Keep feasibility, reachability and search coverage separate. Zero retained candidates under a cap is inconclusive; one retained candidate is not necessarily unique. Distinct source mappings remain identifiable through symmetry reduction; show limits and allow cancel. |
| CR7 Immutable identity and raw roundtrip | Before/after hashes and exact grids match for original photos and recognized observations. Export/reimport preserves source IDs, guide history, absolute rotations and unknown provenance; raw export carries no approved cube when none exists. Unknown fields/revisions and unresolved assets yield explicit diagnostics without partial import. |
| CR8 Explicit search, Use and cancel | Search requires the explicit action; progressive F/R/B/L/U/D questions skip resolved faces. Net/3D agree on the same draft. Use atomically commits the displayed checked revision; duplicate activation, stale/late candidate results and failed checks cannot commit. Cancel restores previous confirmed state and prior approval context without reranking. |
| CR9 Photos and detected-color editor return | Hover/focus/tap opens the linked source photo for that displayed face. Editor return restores the recovery draft/context; corrections remain separate from raw detected data, invalidate affected evidence and are discarded with the unconfirmed transaction on cancel. No unrestricted mapping/color editor is added by recovery. |
| CR10 Canonical frame and mirrored presentation | For all 24 proper canonical rotations, Back/cap orientations and mirror display modes, net, 3D and photo inspector agree on explicit source links. Orbit/display reset changes presentation only; no reflection enters canonical state and no historical mirror flag is rewritten. |

Use the original owner 4×4 metadata at workspace-relative
`projects/cube-assembler/test/fixtures/cube-4x4-2026-11-16T19-08-19/meta.json`
(SHA-256 `f76e61a0aa8bafd12db3b378b033d910853267e3ddea5d7387d19482bfc5f65c`)
and its byte-identical committed
[assembly-only regression](https://github.com/wstein/cube-assembler/blob/bab97177a0d4b860d47308f57df20963dfdc9946/test/fixtures/cube-4x4-2026-11-16T19-08-19.assembly.json).
The original directory is local untracked evidence, not a PuzlWerk-hosted asset;
the committed metadata alone does not provide photographs. Its conflicting v2
seed and owner-reported Up/Down interpretation exercise different explicit
claims, not permission to relabel history. Pin actual photos, source revisions,
asset rights and hashes before visual comparison; do not fabricate or relocate
photos. Other sizes/scenarios need their own identified fixtures.

Acceptance requires exact-head architecture, function and visual evidence,
raw/draft/confirmed revision traces, available Core validation evidence and an
explicit owner decision. Export backward compatibility, canonical identity
mapping, package/license placement, real-device camera/touch and physical-cube
acceptance remain **open / UNKNOWN**. No full NxN legality, production recovery
port or consumer migration is established by this proposal.
