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
| Dynamic calendars and text | Cubistry `src/apps/calendar/viewer.ts`, `src/apps/calendar7/{layout,geometry,font-art,fonts}.ts` implement Calendar3 and Calendar7; standard and names differ; names-any displays the names layout with print B for every date. Names uses real font metrics and nonuniform geometry. Other apps: UNKNOWN. | App supplies date, layout and font-derived artwork; scene accepts regenerated assets, geometry and per-sticker placement without embedding calendar or font policy. Fixed date, font and asset provenance are needed for comparison. |
| Clock, timer and multiple cubes | Cubistry `src/apps/clock/stage.ts` and `framing.ts` provide the stage; `src/ms-timer.mjs` constructs one with three cubes, while `src/chronocube.mjs` constructs stages with three and two cubes in different flows. Other apps' equivalent multicube behavior: UNKNOWN. | Scene/stage supports independently addressed children, shared camera and synchronized scheduling, with independent transitions and cancellation. App owns time and timer state; deterministic comparisons supply frozen time, initial states and camera. A frozen test is not evidence of live timing. |
| View, play and animation | Cubistry `packages/cube-viewer/src/index.ts` and `play-gesture*.ts` contain rendering and gesture code; gesture integration in production CubeViewer is UNKNOWN. CubeAssembler `src/client/view3d/useCube{Camera,Turns,Gestures}.ts`, CubeLab `src/client/{cube-gl,playback}.ts` and Regrip `src/adapters/three/sceneView.ts` have distinct interactions. | Shared Scene owns view, touch/orbit and interpolation; shared Play must request policy-checked physical moves from Core, report commit, reject, busy and cancel explicitly, and restore the prior state on cancellation. Preserve source gesture behavior where evidenced; camera gestures must not mutate physical state. No per-app compatibility layer or second mechanics engine. |
| Orientation gizmo | CubeAssembler `src/client/view3d/axisGizmo.tsx` and `src/core/view/AxisGizmo.res` display axes and frame; its overlay passes pointer events through. Regrip `src/adapters/three/sceneView.ts` renders an indicator with frame and physical orientation, scale 0.38 and an anchor position compensated by the inverse parent rotation. Cubistry native gizmo and CubeLab equivalent control: UNKNOWN. | Shared gizmo must support the source indicator scale and anchoring and follow the presented view and relevant physical/frame inputs through orbit, resize and reset, without changing canonical state. An interactive gizmo is a new requirement, not established source parity; define and test pointer/touch cancellation and disposal for its implemented controls. |
| Physical, solver and presentation frames | Regrip `src/adapters/three/sceneView.ts` applies physical quaternion to the scene and a separate virtual-frame quaternion to the indicator. CubeAssembler's `initialFrame` and turn callback in `cubeView3D.tsx` expose its color frame. Other apps' corresponding solver-frame semantics: UNKNOWN. | Preserve physical cube quaternion, solver/virtual frame and presentation/camera orientation as distinct inputs. Frame updates must not alter Core poses; applying a physical regrip, frame rename or view change twice is invalid. Replay evidence is not live sensor evidence. |

The existing acceptance inventory enumerates cases and their evidence gates; it
is not proof that a universal Scene or Play API already satisfies these rows.
Native facelet colors alone do not establish sticker identity or up. Mapping
ambiguities and unverified asset rights remain explicit until resolved from
source and contract evidence.

## Shared play and orientation indicator: proposed contracts

These contracts are preparation for the later shared Play/Gizmo stage. They do
not authorize migration or replace the owner's live acceptance of the extracted
Cubistry viewer. The APIs below describe the intended boundary, not an existing
implementation.

A shared `PlayController` owns one Core state and a scene, and exposes
`preview(move)`, `commit()`, `cancel()` and `dispose()`. A move identifies an
axis, legal layers and quarter turns using Core conventions. `preview` requests a
policy-checked Core transition and renders its intermediate state without
committing; `commit` accepts only the current preview and publishes the new Core
state once. Results distinguish `ok`, `rejected`, `busy`, `cancelled` and
`disposed`. Cancellation or a failed transition restores the prior committed
state and scene. The view gesture binding drives the shared scene and never
changes Core state; concurrent move input must not silently replace a pending
move. The API must preserve separate app-owned deadlines where relevant.

Acceptance traces cover legal and rejected turns, busy input, preview then
commit, preview then cancel, interruption and disposal, state identity before and
after each result, and mouse/touch camera gestures that leave physical state
unchanged. Source input traces from CubeAssembler and CubeLab are comparison
oracles; source behavior not established in this table remains UNKNOWN.

A shared orientation indicator accepts separate `physicalOrientation`,
`solverFrame` and `presentationOrientation` inputs and a viewport anchor. It
exposes `update(inputs)`, `resize(viewport)`, `reset()` and `dispose()`. The
indicator is informational: pointer and touch events pass through to the view,
and it does not request a regrip or mutate a Core state. Its anchoring accounts
for parent presentation rotation, following the cited Regrip source; scale is an
explicit option rather than a puzzle rule.

Acceptance traces cover independent changes to each orientation, orbit and
reset, resize, anchor compensation, input pass-through and disposal. Tests must
show that indicator updates do not mutate the puzzle or apply any orientation
twice. Clickable regrips are not part of this source-backed contract.

The local 2×2/3×3 play profile uses Core `any` policy explicitly. On 3×3,
`M`, `E` and `S` select the middle layer in the directions of `L`, `D` and `F`;
`x`, `y` and `z` rotate every layer in the directions of `R`, `U` and `F`.
A separate six-face color frame follows CubeAssembler `AxisGizmo.res` at
`91fc2144cbcf2734f84ee3a93c70b8ed503a5151`: whole-cube moves permute it;
on odd cubes, any selected block containing the middle layer also permutes it.
Odd initial frames use the actual current center colors where unambiguous;
image-only or missing centers are unknown unless the caller explicitly provides
a reference. Even cubes require an explicit standard scheme. The Picture demo
explicitly uses the standard scheme; it does not infer colors from picture pixels.
The indicator maps frame R/U/F to X/Y/Z. Logical whole-cube moves change Core
poses and the color frame once, without a second physical-orientation update.
View orbit changes presentation only; physical sensor and solver inputs remain
separate. The default passive indicator is 64 CSS pixels square, inset 8 pixels
from the host’s bottom and right edges.

The shared Classic view mode extends the pinned Cubistry behavior: after a
recent drag it uses the existing damped coast while retaining upright pitch
limits and no Smart auto-return. Cancellation and reduced motion stop it. This
is an intentional behavior change, not a claim of unchanged source parity.

Play feedback is presentation-only: mouse hover outlines the picked sticker,
contact keeps it outlined with a grabbing cursor, and a Core-accepted layer lock
outlines the selected layer. Touch has no hover. Lines must respect occlusion,
follow turn poses, ignore picking, preserve artwork and clear on cancellation,
mode changes and viewer lifecycle events. View mode shows no layer hint.

In Play mode, a second touch cancels any in-progress single-layer preview.
The pair locks once to a pinch or tilt using the CubeAssembler thresholds. A
tilt whose starting midpoint is on the cube previews and commits one whole-cube
Core move; a midpoint outside the cube rotates the presentation. A pinch adjusts
zoom. After either contact lifts, the remaining contact is inert until release.
These pair gestures do not change the separate View-mode input behavior.

In Play mode, pixel-mode trackpad wheel swipes over the cube use one
Core-validated whole-cube preview and commit per gesture burst. Control-modified
pinch, line/page wheel input and vertical mouse-wheel notches remain zoom input.
Outside the cube the trackpad swipe rotates the presentation. View-mode wheel
behavior remains unchanged. Browser wheel-event checks do not establish physical
trackpad compatibility or owner acceptance.
