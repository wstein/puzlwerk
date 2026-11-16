# Universal viewer capability inventory

Status: requirements inventory for the authorized Cubistry → CubeAssembler →
CubeLab → Regrip sequence, not implementation or parity evidence. The
[viewer specification](spec.md), [acceptance matrix](acceptance-matrix.md),
[wire-v1](../001-core-foundation/contracts/wire-v1.md) and
[appearance-v1](../001-core-foundation/contracts/appearance-v1.md) retain their
respective authority. This inventory does not define another data contract or
change either schema. Each migration needs the actual source, state and visual
acceptance; a native source fact does not establish shared-viewer support.

Source pins, repository-relative paths below: Cubistry
`efafcc1d97687eccea0cde87a230f447ce1b6c66`; CubeAssembler
`e20295700d09ece727a065662a4656d606a18e34`; CubeLab
`5ab482719a31b894bd32d78ea76c64609b89acb2`; Regrip
`ebe7d32d0fd1f0b74c528cd38618afda3f5a991e`. Source inspection is not a runtime,
license, hardware or visual comparison. UNKNOWN means not established here.

| Capability | Source implementation and consumer need | Universal boundary requirement |
| --- | --- | --- |
| NxN and layers | Cubistry `packages/cube-viewer/src/physical-scene.ts`, `src/apps/calendar7/geometry.ts` include nonuniform Names layers; CubeAssembler `src/client/view3d/cubeView3D.tsx` takes `puzzleSize`; CubeLab `src/Render/CubeGeometry.res` generates 2–5; Regrip `src/adapters/cubing/twistyPlayer.ts` uses 3×3. | Core and wire-v1 retain physical identity, pose and legal layers. Scene accepts explicit geometry and layer extents without assuming uniform cells or deriving mechanics from pixels. Supported sizes must be demonstrated per source. |
| Sticker and body | Cubistry `packages/cube-viewer/src/physical-scene.ts` has stickerless body options; CubeAssembler `src/client/view3d/cubeView3D.tsx` exposes palette and stickerless; CubeLab `src/client/cube-gl.ts` receives palette and style. Regrip styling parity is UNKNOWN. | Appearance and scene inputs must express the evidenced colors, stickered/stickerless surfaces and render geometry independently of piece identity and canonical state; live changes must follow the spec's atomic artwork and cancellation rules. |
| Pictures, crop and up | Cubistry `src/apps/picture3/model.ts`, `images.ts` and `presets.ts` provide face/tile identity, up vectors and raster crops. Native picture textures for the other three apps are UNKNOWN. | Core/wire preserve identity and physical orientation; appearance-v1 maps appearance to sticker identity. Scene resolves app-owned image assets and crop data with correct local up and orientation, including after turns. Bytes and crops are not silently inserted into wire or appearance schemas. |
| Dynamic calendars and text | Cubistry `src/apps/calendar/viewer.ts`, `src/apps/calendar7/{layout,geometry,font-art,fonts}.ts` implement Calendar3 and Calendar7; standard, names and names-any have distinct layout or artwork. Names uses real font metrics and nonuniform geometry. Other apps: UNKNOWN. | App supplies date, layout and font-derived artwork; scene accepts regenerated assets, geometry and per-sticker placement without embedding calendar or font policy. Fixed date, font and asset provenance are needed for comparison. |
| Clock, timer and multiple cubes | Cubistry `src/apps/clock/stage.ts`, `framing.ts` and `src/apps/ms-timer/cube.ts` use a shared stage with three or two cubes respectively. Other apps' equivalent multicube behavior: UNKNOWN. | Scene/stage supports independently addressed children, shared camera and synchronized scheduling, with independent transitions and cancellation. App owns time and timer state; deterministic comparisons supply frozen time, initial states and camera. A frozen test is not evidence of live timing. |
| View, play and animation | Cubistry `packages/cube-viewer/src/index.ts` and `play-gesture*.ts` contain rendering and gesture code; gesture integration in production CubeViewer is UNKNOWN. CubeAssembler `src/client/view3d/useCube{Camera,Turns,Gestures}.ts`, CubeLab `src/client/{cube-gl,playback}.ts` and Regrip `src/adapters/three/sceneView.ts` have distinct interactions. | Shared Scene owns view, touch/orbit and interpolation; shared Play must request policy-checked physical moves from Core, report commit, reject, busy and cancel explicitly, and restore the prior state on cancellation. Preserve source gesture behavior where evidenced; camera gestures must not mutate physical state. No per-app compatibility layer or second mechanics engine. |
| Orientation gizmo | CubeAssembler `src/client/view3d/axisGizmo.tsx` and `src/core/view/AxisGizmo.res` display axes and frame; its overlay passes pointer events through. Regrip `src/adapters/three/sceneView.ts` renders an indicator with frame and physical orientation. Cubistry native gizmo and CubeLab equivalent control: UNKNOWN. | Shared gizmo must follow the presented view and relevant physical/frame inputs through orbit, resize and reset, without changing canonical state. An interactive gizmo is a new requirement, not established source parity; define and test pointer/touch cancellation and disposal for its implemented controls. |
| Physical, solver and presentation frames | Regrip `src/adapters/three/sceneView.ts` applies physical quaternion to the scene and a separate virtual-frame quaternion to the indicator. CubeAssembler's `initialFrame` and turn callback in `cubeView3D.tsx` expose its color frame. Other apps' corresponding solver-frame semantics: UNKNOWN. | Preserve physical cube quaternion, solver/virtual frame and presentation/camera orientation as distinct inputs. Frame updates must not alter Core poses; applying a physical regrip, frame rename or view change twice is invalid. Replay evidence is not live sensor evidence. |

The existing acceptance inventory enumerates cases and their evidence gates; it
is not proof that a universal Scene or Play API already satisfies these rows.
Native facelet colors alone do not establish sticker identity or up. Mapping
ambiguities and unverified asset rights remain explicit until resolved from
source and contract evidence.
