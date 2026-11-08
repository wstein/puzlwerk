# Wire schema v1: definition and state

Status: Accepted (owner decision of 2026-11-08, see below); part of milestone M1, reviewed with the PR that adds the codec. It refines the canonical JSON rules of the [solver contract](solver.md) and the [data model](../data-model.md). Goals and the solver envelope are not part of v1 (M2, M3).

Owner decision of 2026-11-08: `movePolicy` is a required field with the values `"outer-wide"` and `"any"`; the convention `"cube-shell-v1"` is fixed for v1 (size 2..64); sticker `color` stays optional; `revision` is a per-schema integer that starts at 1 and increases by one with every incompatible change, and consumers reject unknown revisions with the stable error code `BadRevision`.

## Canonical bytes

UTF-8 JSON without insignificant whitespace, object keys sorted by code unit, integers only (no fraction, exponent, `-0`), no duplicate keys, ID-keyed arrays sorted by ID (`pieces`, `stickers`, `poses`); semantic arrays (vectors, matrices) keep their order. All strings in v1 are IDs: nonempty ASCII from `[A-Za-z0-9._:-]`. A hash is `sha256:` plus the lowercase hex SHA-256 of the canonical bytes. The decoder accepts any JSON whitespace and any array order, rejects duplicate keys, and re-encodes canonically; `encode(decode(x))` is the canonical form of x.

## Definition

Closed object, all fields required unless marked optional; unknown fields are errors.

- `schema`: `"puzlwerk.definition"`; `revision`: `1`.
- `id`: ID; `size`: integer 2..64; `convention`: `"cube-shell-v1"` (frame and doubled coordinates of ADR 0002); `movePolicy`: `"outer-wide"` or `"any"` (selections the definition permits; Q2 limits text notation, not the AST).
- `pieces`: one entry for every shell slot, none twice. Entry: `id` (ID, unique), `home` (shell slot `[x,y,z]`), `stickers`.
- Sticker: `id` (ID, unique in the definition), `normal` (outward unit axis vector of an exposed face of the home slot; the stickers of a piece cover exactly its exposed faces), `up` (unit axis vector perpendicular to `normal`), `color` (optional ID; appearance, never identity).

## State

- `schema`: `"puzlwerk.state"`; `revision`: `1`; `definitionId`: ID of the definition it belongs to.
- `poses`: exactly one entry per piece of the definition. Entry: `pieceId`, `position` (shell slot), `orientation` (nine integers, row-major O of ADR 0008).
- Structural checks on decode: positions are shell slots and pairwise distinct, O is a proper rotation, and `position = O * home` (ADR 0008, position rule). These checks do not prove reachability.

## Errors

A failure returns a stable code and the JSON path of the offending value (`$.poses[2].orientation[4]`). Codes: `Syntax`, `TooLarge`, `TooDeep`, `DuplicateKey`, `NotInteger`, `NegativeZero`, `WrongType`, `MissingField`, `UnknownField`, `BadSchema`, `BadRevision`, `BadId`, `BadValue`, `DuplicateId`, `DuplicateSlot`, `PieceMismatch`, `DefinitionMismatch`, `BadSticker`, `BadOrientation`, `PositionRule`. Limits: 16 MiB input, nesting depth 64.

Examples: `test/fixtures/wire/`, generated and checked independently by `scripts/wire-examples.py`.
