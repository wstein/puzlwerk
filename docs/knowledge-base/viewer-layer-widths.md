# Viewer: standard layer widths of real cubes

Status: helper implemented in `@puzlwerk/viewer`; no default changes. The values
are PuzlWerk's general knowledge of real cubes (owner decision 2026-11-17); every
app may override them.

## API

`standardLayerWidths(n, options?)` in `packages/viewer/src/layer-widths.ts`
returns `[f, 1, ..., 1, f]` (an inner layer is 1, `f` the factor of the two outer
layers), the same list as `thickOuterLayerWidths(n, f)`.

- `n` must be an integer from 2 to 7; anything else throws
  `No standard layer widths for N = ...`. There is no extrapolation.
- `options.outer` replaces the table factor for that call (finite, at least 1).
- `options.variant` is reserved for manufacturer profiles. Only `"standard"`
  exists; another name throws `Unknown cube variant`.
- The viewer default stays `uniformLayerWidths` (every layer 1). Calling the
  helper is the only way the widths change; switching the default is a separate
  owner decision.

## Overriding

- Per call: `standardLayerWidths(n, { outer })`.
- Per app: pass explicit widths as `presentation.layerWidths` (the
  `profile.layerWidths` option of `packages/core-viewer-bridge/src/index.mjs`);
  the helper is then not involved.
- The Calendar7 acceptance cases in
  `specs/009-viewer-consolidation/acceptance-routes.json` use `outer=1.8`
  explicitly and are unaffected.

## Table

| N | Outer factor | Basis |
| --- | --- | --- |
| 2 | 1 | no inner layer |
| 3 | 1 | estimate, unchanged from before; to be replaced when measured |
| 4 | 1.10 | measured, scaled |
| 5 | 1.20 | measured, scaled |
| 6 | 1.40 | estimate (interpolated); to be replaced when measured |
| 7 | 1.60 | measured, set by the owner |

## Measurements

Owner measurements of 2026-11-17. The unit is assumed to be mm and is not
confirmed. Data: `STANDARD_CUBE_MEASUREMENTS`.

| Cube | Inner | Outer | Factor |
| --- | --- | --- | --- |
| 4x4 A | 14.5 | 15.6 | 1.076 |
| 4x4 B | 13.1 | 15.2 | 1.160 |
| 5x5 A | 10.6 | 13.5 | 1.274 |
| 5x5 B | 11.1 | 13.4 | 1.207 |
| 7x7 | 7.2 | 12.5 | 1.736 |

Mean overhang (factor - 1) per size: 4x4 0.118, 5x5 0.240, 7x7 0.736.

## Scaling

The owner does not adopt the real factors in full (balance) and sets 7x7 to 1.6.
Scale s = 0.6 / 0.736 = 0.8152: 4x4 = 1 + s * 0.118 = 1.096, rounded to 1.10;
5x5 = 1 + s * 0.240 = 1.196, rounded to 1.20. 6x6 was not measured: its overhang
is interpolated linearly between 5x5 and 7x7 (0.488), scaled 0.398, giving 1.40.
The test derives 4x4, 5x5, 6x6 and 7x7 from the measurements with tolerance 0.005.

## Related

Cubistry holds the same table as `OUTER_LAYER_WIDTH` in
`src/apps/calendar7/geometry.ts` until it is switched to this helper.
