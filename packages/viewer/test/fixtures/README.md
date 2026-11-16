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

`cubistry-smart-rotation.json` records source controller poses, anchors, phases,
return deadlines and speeds for smart, free, classic, reduced-motion and
suspend/reset sequences. Generate it from the pinned checkout using:

```sh
node packages/viewer/test/fixtures/generate-cubistry-rotation.mjs /path/to/cubistry
```

The generator checks the source SHA-256 before executing the source controller.

`cubistry-presentation-framing.json` records the source single-sphere fit,
far plane and presentation rotation at portrait, landscape and narrow aspects.
Regenerate against the hash-checked pinned checkout with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-framing.mjs /path/to/cubistry
```

`cubistry-presentation-drag.json` records the source drag lifecycle for a
threshold, overlapping contacts, cancellation and disposal. Regenerate with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-drag.mjs /path/to/cubistry
```

`cubistry-clock-framing.json` records source camera distance, pose-dependent
scale and world centers for two and three cubes. Regenerate with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-clock-framing.mjs /path/to/cubistry
```

`cubistry-weighted-exposure.json` records source exposure from actual source
scene lights, including a dark scene, across display orientations. Regenerate:

```sh
node packages/viewer/test/fixtures/generate-cubistry-exposure.mjs /path/to/cubistry
```

`cubistry-soft-shoulder.json` records the source curve samples and exact shader.
Regenerate with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-tone.mjs /path/to/cubistry
```

`cubistry-casters.json` records the pinned source studio's default caster
frusta and the actual Names-light key position. Regenerate with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-casters.mjs /path/to/cubistry
```

`cubistry-names-geometry.json` comes from the actual pinned PhysicalCubeScene
with the source Calendar7 Names layer profile, plus the source standard
RoundedBoxGeometry. It records body and sticker buffers, pose and anisotropic
scale. Regenerate with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-names-geometry.mjs /path/to/cubistry
```

`cubistry-stage-names-pixels.json` records five source browser samples from
Cubistry at the pinned revision using a synthetic asymmetric Canvas glyph and miter, Names light,
plasticity 0.6, Chromium SwiftShader, DPR 1 and a 1440×900 viewport. The stage
browser test checks each channel within six values. Cubistry
`src/apps/calendar7/names-exposure.ts:15-16` reports six for a different
source-fill-versus-token measurement at the default pose; this test compares
individual source-versus-stage pixels instead. It is a bounded sample, not a
claim of whole-image equality, source production-test execution or printed-calendar parity.

`cubistry-names-plasticity.json` records source material, shadow, floor and
exposure values for 0, 0.6 and 1. Regenerate with:

```sh
node packages/viewer/test/fixtures/generate-cubistry-plasticity.mjs /path/to/cubistry
```
