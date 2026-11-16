# Native Cubistry Clock reference

Source code and data are copied from Cubistry revision
`efafcc1d97687eccea0cde87a230f447ce1b6c66`. `source-manifest.json`
records SHA-256 for every copied source and asset. Shared native cube packages
are supplied by the existing pinned `../cubistry` reference and verified by its
manifest. Program code is AGPL-3.0-or-later; the copied artwork and font notices
are retained with their assets. No publication is implied.

The test host uses the actual ClockStage, HsmController, native HSM and counter
design loaders and studio asset manifest. It configures three controllers to
00:00:00, corresponding to 2026-05-01T00:00:00Z, and verifies each native HSM
state against its target. It does not run the live clock mount or scheduler and
does not compare the shared viewer. Viewport, browser and screenshots are test
inputs, not owner visual acceptance.

Run `acceptance/test/cubistry-clock-source-browser.mjs` with Node 24,
`PLAYWRIGHT_MODULE` set to an installed Playwright `index.mjs`, and
`REFERENCE_SCRATCH` set to an existing writable scratch directory. If the repo's
`node_modules` is not populated, `REFERENCE_NODE_MODULES` may name an existing
directory containing Three.js and `@rescript/runtime`.
