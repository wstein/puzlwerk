# Native Cubistry Calendar7 references

Source code, assets and font files are copied from Cubistry revision
`efafcc1d97687eccea0cde87a230f447ce1b6c66`. `source-manifest.json`
records SHA-256 for every copied source and asset. Shared native cube packages
are supplied by the existing pinned `../cubistry` reference and verified by its
manifest. Program code is AGPL-3.0-or-later; calendar data and original fonts
retain their accompanying CC BY-SA 4.0 and OFL notices. No publication is implied.

The test host calls the original Calendar7Viewer, state parser, Noto font loader
and source `stateDigest`. It renders the native May 2026 root separately for
standard, names and names-any, verifying each digest and actual loaded font.
Names-any is the original Print B research candidate and is not frozen. These
are viewer-root baselines, not the full calendar mount, a shared-viewer
comparison or owner visual acceptance.

Run `acceptance/test/cubistry-calendar7-source-browser.mjs` with Node 24,
`PLAYWRIGHT_MODULE` set to an installed Playwright `index.mjs`, and
`REFERENCE_SCRATCH` set to an existing writable scratch directory. If the repo's
`node_modules` is not populated, `REFERENCE_NODE_MODULES` may name an existing
directory containing Three.js and `@rescript/runtime`.
