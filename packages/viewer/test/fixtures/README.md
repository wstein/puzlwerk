# Cubistry 2×2 source fixtures

Both fixtures come from the actual Cubistry viewer at commit
`efafcc1d97687eccea0cde87a230f447ce1b6c66`. The generators verify the
SHA-256 of the selected source files before loading them. Use Node 24 and a
checkout of that revision with its dependencies installed:

```sh
node packages/viewer/test/fixtures/generate-cubistry-profile.mjs /path/to/cubistry/packages/cube-viewer/src/presentation-preset.ts
node packages/viewer/test/fixtures/generate-cubistry-poses.mjs /path/to/cubistry
```

The profile fixture hashes the actual position, normal, UV, and index buffers
for the native 2×2 outer corner. The pose fixture executes `PhysicalCubeScene`
and records the eight body positions and local sticker positions and rotations;
the corresponding sticker up vectors are checked from those rotations. Native
outer cell widths are 1.012, body centers are ±0.506, and local sticker offsets
are ±0.508. These fixtures do not establish whole-scene or image parity.

The model-profile fixture executes the same pinned builder for sizes 2–7 and
custom widths [0.7, 1, 1.4] and [0.7, 1, 1, 1, 1, 1, 1.4]. Default profiles
pass nominalEdge=N; the custom profiles pass the respective width sums 3.1 and 7.1. It records position, normal, UV and index
buffers and the source sticker side and radius.

`cubistry-artwork-builders.json` records source-generated UV, miter texture and
unequal-layer picture-window results. Regenerate it from a checkout of the same
revision with dependencies installed:

```sh
node packages/viewer/test/fixtures/generate-cubistry-artwork.mjs /path/to/cubistry
```

The generator checks each direct viewer source hash before evaluating it.

`cubistry-stickerless-miter.json` and `cubistry-picture-windows.json` are
produced by `generate-cubistry-stickerless.mjs` and
`generate-cubistry-picture.mjs`, each accepting the pinned Cubistry checkout
path. They execute the actual PhysicalCubeScene with hash-checked source files.
