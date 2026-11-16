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
