# ADR 0009: Appearance as a separate document per sticker ID

Status: Accepted (owner decision 2026-11-12: shape SM3 and the four points below)
Date: 2026-11-12

## Context

wire-v1 revision 1 has one optional `color` ID per sticker and "no image reference" ([#47](https://github.com/wstein/puzlwerk/issues/47)). Cubistry carries `assetId`, `materialId` and `equivalentQuarterTurns` per sticker and a Picture Cube that grows from the 2x2 to sizes 2 to 7; Cubacle carries `image` on fixed-frame stickers; Calendar schemes such as Rubik-Tint color a sticker by its home face. ADR 0003 and wire-v1 say appearance is metadata, never identity.

## Decision

1. Appearance is its own document `puzlwerk.appearance` revision 1, keyed by sticker ID and tied to a definition by `definitionId` ([contract](../../specs/001-core-foundation/contracts/appearance-v1.md)). It holds `color`, `image` and `symmetry` (C1, C2, C4).
2. wire-v1 revision 1 stays unchanged: no new field, no new hash for definitions or states.
3. Image bytes, crops, materials and rendering stay in the application. The document holds only an image ID.
4. Picture Cubes use the tile ID rule `tile-v1`: `<face>_<row>_<col>` derived from the home position, so every implementation names the same cell the same way.
5. Adapters map Cubistry `assetId`/`equivalentQuarterTurns`, the Picture Cube `FaceSet` and tile IDs, Calendar home-face colors and Cubacle `image` onto it (contract, "Adapters").

## Alternatives

- Add `image` and `symmetry` to wire-v1 stickers: needs revision 2 and ties every definition hash to artwork.
- Image bytes or crop rectangles in the document: a second place for resolution and licensing questions; the viewers already own them.
- Symmetry as quarter-turn arrays: the contract admits only groups, so `[0,1]` would be an error case; C1/C2/C4 cannot express it.

## Consequences

An application can change artwork without touching the definition or any state hash. Two cubes with the same definition may carry different appearances. The document does not pin image bytes, so equal image IDs with different art are possible; the application owns that check.

## Decisions on the field rules (owner, 2026-11-12)

6. Color precedence: appearance `color` overrides the definition `color`; a difference is not an error.
7. Image ID alphabet: the wire ID alphabet, at most 256 characters; Cubacle strings need a mapping.
8. Content pin: none in revision 1; an optional digest of the image set is possible only in revision 2.
9. `tile-v1` is a machine-checkable profile selected by `imageIds`.
