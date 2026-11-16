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
The adapter keeps caller-supplied piece positions and bounds body width to 0.94–0.99, preserving the pilot's earlier 0.471 sticker offset. Cubistry's native 2×2 profile instead uses 1.012 outer layers, 1.002 bodies, and shifted stickers. The demo uses Cubistry's 0.502 offset and 0.87 sticker width. The plastic
uses the Classic palette's #1b2431, roughness 0.45 and clearcoat 0.18;
stickers use roughness 0.65 and clearcoat 0.12. The studio uses Cubistry's
ambient, hemisphere, key, fill, rim and shadow-fill lights, two 1024-pixel
shadow maps and the contact shadow. Renderer output uses sRGB, neutral tone
mapping and a device pixel ratio capped at 2. See NOTICE for pinned sources.
