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
zero completes immediately and smoothstep easing uses that duration once. The
browser clock uses `performance.now`; reduced motion completes visually
immediately. A successful visual completion does not commit application state.

CanvasImageSource assets remain caller-owned; textures are viewer-owned. Images
use sRGB and Three.js texture defaults (including its default vertical flip),
with alpha enabled for image stickers. Applications own the host and assets.
The viewer disposes its geometry, materials and textures and ignores late asset
results after cancellation. Context loss requires disposal and recreation. The
host size is observed when ResizeObserver is available; `invalidate` requests
one coalesced frame. No continuous frames run while idle. See NOTICE for source
and license provenance. Visibility policy is pending the owner decision.
