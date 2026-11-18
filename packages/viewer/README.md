# Viewer pilot

This private AGPL-3.0-or-later package presents caller-owned projections with
Three.js 0.187.0. It does not parse moves or maintain canonical puzzle state.
The demo adapts the existing ReScript shell and orientation functions for one
2×2 turn. Applications have not been migrated.

From the repository root, run `npm ci`, `npm run build`, then
`npm run dev --workspace @puzlwerk/viewer`. Open the printed localhost URL.
The existing root `npm run check` includes the viewer unit suite; `npm run test:package` includes its typecheck and build. The optional browser smoke
uses an installed Playwright module and Chromium: with the demo server running,
set `PLAYWRIGHT_MODULE` to the absolute path of Playwright's `index.mjs` and run
`node packages/viewer/test/browser-smoke.mjs`. It tests desktop and mobile
viewport sizes, not physical devices.

The API and validation rules follow spec 009. Scene coordinates are right-handed;
sticker local +Z points outward and +Y points up. The numerical tolerance for
unit lengths, rotated positions and quaternion equivalence is 1e-6. Inputs are
copied at operation start. IDs and sticker definitions remain stable across a
transition. The application supplies the full signed angle and total duration;
zero completes immediately and smoothstep easing uses that duration once. The demo passes zero duration when the system requests reduced motion; the viewer does not override the supplied duration. The
browser clock uses `performance.now`; a zero duration completes visually
immediately. A successful visual completion does not commit application state. Cancellation restores the source projection, returns `Cancelled`, and does not commit the target. The owner selected the pilot visibility, reduced-motion, easing, and cancellation policies on 2026-11-15.

CanvasImageSource assets remain caller-owned; textures are viewer-owned. Images
use sRGB and Three.js texture defaults (including its default vertical flip),
with alpha enabled for image stickers. Applications own the host and assets.
The viewer disposes its geometry, materials and textures and ignores late asset
results after cancellation. Context loss requires disposal and recreation. The
host size is observed when ResizeObserver is available; `invalidate` requests
one coalesced frame. No continuous frames run while idle. See NOTICE for source
and license provenance. When the document is hidden, rendering and animation time pause; on return the transition resumes without a jump. This does not change Cubistry TimerController behavior; consumer synchronization remains a separate migration concern.


The pilot uses Cubistry's 2×2 presentation values: a maximum body width of
0.99, outer bevel radius 0.03, inner radius 0.018 (60%), three bevel
segments, and rounded sticker corners with radius 0.055 and four curve segments.
Without explicit geometry the adapter keeps caller-supplied piece positions and bounds body width to 0.94–0.99, preserving the pilot's earlier 0.471 sticker offset. Optional piece geometry supplies three cell extents and three pairs of exterior-side flags to the source profile; each extent must exceed the source gap. This changes only body geometry, leaves poses and sticker data untouched, and must remain unchanged across a transition. Cubistry's native 2×2 profile instead uses 1.012 outer layers, 1.002 bodies, and shifted stickers. The demo uses Cubistry's 0.502 offset and 0.87 sticker width. The plastic
uses the Classic palette's #1b2431, roughness 0.45 and clearcoat 0.18;
stickers use roughness 0.65 and clearcoat 0.12. The studio uses Cubistry's
ambient, hemisphere, key, fill, rim and shadow-fill lights, two 1024-pixel
shadow maps and the contact shadow. Renderer output uses sRGB, neutral tone
mapping and a device pixel ratio capped at 2. See NOTICE for pinned sources.

The model gallery is at `packages/viewer/demo/gallery.html` on the demo server.
It shows native 2×2, 3×3 and 7×7 and an unequal [0.7, 1, 1.4] profile at
rest and mid-turn. `presentation` supplies the explicit size and nominal edge;
optional `core` supplies a scene-space center and positive half extent. These
are render-only snapshot data, invariant across a transition. No core is inferred.
The source-versus-adapter captures use Chromium with SwiftShader at DPR 1,
300×300 drawing buffers, camera (4,3,5) scaled by max(1, edge/2), and the
pinned studio. Desktop and mobile viewport captures are local test artifacts,
not physical-device or full HQ acceptance. The model-profile slice did not
include artwork or picture projection; the subsequent artwork slice is described
below. Multiple cubes remain open.


Optional appearance, source-face and picture metadata select the source
stickerless, miter and projected-picture builders. Picture faces use opaque
asset IDs whose returned pixels are already in Cubistry's bottom-left
orientation; legacy per-sticker imageId behavior is unchanged. Source-face
frames and picture indices are immutable construction references, not current
world positions. Optional source-face color is independent of sticker image tint;
omitting it uses the normalized sticker color. `setArtwork` applies a complete decoration replacement
during a turn without changing physical poses; successful updates survive
cancellation. Asset failure and late completion leave the committed scene
unchanged. See spec 009 for validation, ownership and concurrency rules.

The local `artwork-gallery.html` shows 2×2, 3×3, 7×7 and unequal profiles
in tile, plain stickerless, miter, picture-sticker and picture-body modes. It
renders each view with WebGL, copies the finished frame to a display canvas and
releases the context before rendering the next view. This gallery does not
establish full Stage 1 HQ acceptance or migrate any application.

The shared-stage demo is at `packages/viewer/demo/stage.html`. `createCubeStage`
creates one renderer, studio and camera for independently operated child
scenes; `createCubeScene` retains its single-child interface. Stage view policies
and lighting receive or supply render-only data. Applications own layouts,
assets, appearance policy and state. Registered interaction surfaces remain
caller-owned. Disposal removes the canvas and releases its WebGL context.

The demo uses two and three source-framed cubes and a 7×7 source Names geometry
and lighting setup with a synthetic asymmetric Canvas glyph and miter, not calendar print data.
Its browser test uses `PLAYWRIGHT_MODULE` as above and
`node packages/viewer/test/stage-browser-smoke.mjs` with the demo server running.
It checks desktop/mobile viewport sizes, source-derived sample colors, input,
turns, artwork updates, idle rendering, context loss and disposal. Browser
viewports are not physical-device or full HQ acceptance.

## Bridge subpath and CubeAssembler state

`@puzlwerk/viewer/bridge` ships the Core-to-viewer bridge, and `@puzlwerk/viewer/bridge/cube-state` the CubeState translation, with the compiled Core modules they import
(`npm run build --workspace @puzlwerk/viewer` copies them to `dist/bridge`; the packed tarball is
self-contained apart from `three` and `@rescript/runtime`). The latter adds `cubeStateDocuments(size, cube, palette)`,
which turns CubeAssembler's CubeState (six facelet arrays, sizes 2 to 64; 2 to 15 are tested and accepted) into wire-v1 definition, home state,
appearance and `open` options with the standard layer widths; `cubeStateFromWire` reads the facelets back after
turns; `faceStickerIds(size, face)` lists the viewer sticker IDs of one face. A facelet-only state has no piece
identity, so the appearance carries each slot's color. `CubeStage.setStickerHighlight(child, ids)` outlines those
stickers (static view; reapply it after `setProjection`).
`createCubeStage` takes `appearanceControls: 'hidden'` for hosts that supply their own controls (default
`'floating'`); the panel is still created, only not shown.

## Cube sizes 2 to 15

The viewer is general for cubes from 2x2 to 15x15 (owner decision 2026-11-18). Tests, screenshots and the performance
figure cover 2..15 (`ACCEPTED_MAX_SIZE`, the one acceptance constant in `size-range.ts`); the structure stays open up to
Core's `PwShell.maxSize` (64) and larger sizes are not rejected, only not accepted. Layer widths: up to 7x7 the table of
`standardLayerWidths` (4x4 1.1, 5x5 1.2, 6x6 1.4, 7x7 1.6); 8x8 and larger hold the 7x7 factor 1.6, an estimate
(`LARGE_CUBE_OUTER_FACTOR_ESTIMATE`, `isEstimatedStandardFactor`). `cubeStageFit(halfExtent)` gives the view policy and caster
envelope for any size. `setPlayTarget` takes any size and optional `layerWidths` (the gesture core then maps hits with the real
layer boundaries). The `presentation-preset` radius rule (2x2 and 3x3 keep their radii, larger cubes scale with the edge) is
size-independent; the bridge caps the body radius at the profile limit, which only matters from about size 25.

`CubeStage` setters for hosts with their own controls: `setViewPreset(name)` (`VIEW_PRESETS`: up, right, front, down, left, back,
isometric, iso-back; the CubeAssembler poses, zoom unchanged) and `setDisplayOrientation(q)` (both report through `onViewChanged`
and become the smart-mode return target; outside free mode a rolled pose is projected to upright pitch and yaw),
`setAppearance({construction, frameColor})` with `getAppearance()` (stickerless), `setInteractionMode('view'|'play')` with
`getInteractionMode()`. Nothing set from outside is stored.

The demo `demo/size-range.html?n=9` shows a solved CubeState through the packaged bridge. `test/size-range-browser.mjs`
(`PLAYWRIGHT_MODULE`, demo server running, optional `CHROMIUM_PATH`, `SHOT_DIR`, `PERF=1`) checks sizes 2, 3, 7, 9 and 15 in a
browser: presets, stickerless, interaction mode and a Shift+drag turn. Its frame-time figure comes from software rendering and is
a rough upper bound, not a GPU measurement.

Play parity with the CubeAssembler main view (bridge `@puzlwerk/viewer/bridge/cube-state`, stage):
`cubeTurnToMove` and `moveToCubeTurn` translate CubeAssembler's `{face, depth, width, turns}` and Core's
`{axis, layers, turns}`. A definition with the default policy `outer-wide` rejects an inner single layer
(`2R`) and the whole cube; `cubeStateDocuments(n, cube, palette, {movePolicy: 'any'})` builds the definition
with the policy `any` that wire-v1 already defines. `paletteArtwork` gives the `setArtwork` argument for a
new palette without reopening the cube. `CubeStage.setShadowOpacity` sets the floor shadow strength (0..1)
without a complete lighting.

The definition id stays `cube<n>` for both policies; only the text, and so the hash, differs (`outer-wide` against `any`).
State and appearance documents of one are accepted with the other. The main-view play mode of CubeAssembler uses `any`
(inner single layers and whole-cube turns are playable there); the capture-review view keeps the default `outer-wide`.
The viewer enforces neither: the caller picks the policy when it builds the documents.

```js
const made = cubeStateDocuments(3, cube, palette, { movePolicy: 'any' });
const turn = cubeTurnToMove(3, { face: 'R', depth: 2, turns: 1 }); // "2R", an inner slice
const player = createPlayer(made.value.definition, made.value.state, made.value.appearance, made.value.options, scene);
await player.value.turn(turn.value.axis, turn.value.layers, turn.value.turns, 200);
```

The shadow strength is the lighting field `floorOpacity` (default 0.3). `setShadowOpacity(v)` is a thin shortcut that sets
that one value without a complete lighting; a later `setLighting` sets it again from its own `floorOpacity`. No new
contract field exists.

`cubeStateDocuments` returns `InvalidPolicy` when `options` is not an object (a string such as `'any'` included) or `movePolicy` is neither
`'outer-wide'` nor `'any'`; `cubeTurnToMove` accepts the capital face letters `U R F D L B` only (`InvalidTurn` otherwise).

Play events: `createCubeStage` takes `onPlayEvent(event)` with the typed `PlayEvent` union: `hover` (sticker ID, absent when the pointer leaves),
`turn-begin` (the selection: axis, layers and piece IDs about to turn, `source` is `drag`, or `pair` for a two-finger gesture), `turn-end` (`committed` with the
quarter turns -1, 1 or 2, or `cancelled`; exactly one per `turn-begin`, also when the stage ends the turn by `dispose`, a new play target, a mode change or blur; a committed
`turn-end` follows the `onCommit` of the play target the turn began on, so a handler may switch the target) and `error` (a rejected preview or move). A listener that throws does not
disturb the gesture. The wheel gesture does not emit events yet.

Seam-wide turns: `setPlayTarget({..., seamWide: true})` (or `{tolerance, lean, minPx}`) lets a swipe that starts on the seam between two
layers turn a wide block, as CubeAssembler's "wide turns near gaps", in the viewer's gesture model. The outer quarter of a sticker next to a
boundary is the seam (`tolerance` 0.25 of the touched layer's width); the block is both layers at the seam and every layer on one side,
chosen by the lean of the swipe along the layer axis (a lean below `lean` 0.1 of the swipe length does not choose and the half of the cube the touch lies in decides, as in CubeAssembler); a block of the whole cube switches to the other side. Difference
to CubeAssembler: on a 2x2 a seam swipe there turns the whole cube, the viewer has no seam on a 2x2. Shift keeps its meaning and wins. `minPx` widens the
tolerance of thin layers to that many screen pixels, never beyond half a layer (a 15x15 inner layer is 6.2 % of the edge). Off by default.
The side is decided when the turn axis is decided; CubeAssembler's later switching of the side while the pointer stays on the face is not copied.
Swipe tuning, the locked hint and the wide cue (sound, vibration) stay with the application, which can use the play events.

`indicatorColorsFromFrame(frame)` gives the X, Y and Z colors of `setOrientationIndicator` from `Player.colorFrame()` (R, U and F entries).
