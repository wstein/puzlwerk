# Shared notation API proposal

Status: architecture proposal, 2026-11-15. No implementation or package is authorized. The [inventory](inventory.md), [standards audit](standards-matrix.md), and [source register](sources.md) bound the evidence. SM9 already selects `PwMove.t` as the sole semantic move target; Q2's existing bounded `PwNotation.parse` remains unchanged.

## Ownership and representation

Place the eventual single formatting and compatibility policy alongside PuzlWerk Core's `PwMove`, initially as a module in the existing source tree rather than a new package. It depends on Core, never on CubeLab, Cubistry or a viewer. This is a location proposal, not a published API or a license grant. `PwMove.t` already carries size, axis, selected layers and signed turns; do not add a second canonical move representation. Core determines legal state transitions. A notation adapter must check its own profile's representability without redefining legality. Since `PwMove` permits arbitrary layer selections, a noncontiguous selection can be legal yet not expressible as one token: return a typed `UnsupportedSelection`, not an invented token or silent split.

A move selecting every layer can describe the same physical transformation as a cube rotation, but the caller must identify whether it represents an actual puzzle rotation; camera motion is not a `PwMove`. Formatting alone must not infer a recorded rotation from a camera orbit. The frame and the mapping from typed layers and signs to face-relative notation must be explicitly supplied and checked; do not silently borrow CubeLab's world-frame convention. Solve and replay use the same frame after rotations. A size disagreement between descriptor and move is an error.

## Conceptual interface

The following describes behavior, not final ReScript syntax or an existing export:

| Operation | Input | Output and obligations |
| --- | --- | --- |
| `formatMove` | `PwMove.t`, puzzle descriptor and physical frame, display profile, explicit physical-rotation intent | One token or typed error: invalid descriptor/frame, size mismatch, illegal move, unsupported selection or unsupported profile. Deterministic for identical inputs. |
| `formatAlgorithm` | Ordered typed moves and the same context | Ordered tokens or indexed typed error; never silently omit an unsupported move. This is a flat execution trace, not a structured algorithm serializer. |
| `parseCompatibility` | Text, descriptor, frame, explicitly selected source dialect and version | Located diagnostics or a structure containing move leaves converted to `PwMove.t`; unsupported syntax and unrepresentable semantic conversions fail explicitly. This is a separate adapter; it does not expand Q2's `PwNotation.parse`. |
| `assessCompatibility` | Source text plus explicit dialect or a generated token plus profile | Separate spelling/grammar assessments and reasons for WCA and named external dialects. It does not certify competition legality. |
| `serializeStructured` | Structured algorithm and declared serialization dialect | Structure-preserving output or typed unsupported/loss report. Preserve groups, commutators, conjugates, repeats and supported annotations; do not convert pauses or comments into moves. Retain original source separately where exact text or discarded trivia matters. |

CubeLab `MoveTypes.alg` carries structure beyond a list of physical moves. An integration must retain that structure and its source context; only executable leaves bridge to `PwMove.t`. The adapter must distinguish preserved structure from expanded replay, enforce expansion limits, and report any unsupported node. It must not silently discard comments, pauses or source spelling. Existing CubeLab parsing and serializer behavior stays available during migration; an eventual single owner requires a reviewed compatibility transition, not indefinite duplicate policy implementations.

The proposed default output and size rules are in the [matrix](standards-matrix.md); the profile, opposite-face tie break and rotation intent need owner decisions. A compatibility parser accepting rotations or interior ranges is a separately scoped adapter, not a change to the approved Q2 core text parser. Do not infer legacy dialects from ambiguous strings.

## TypeScript boundary

Core currently emits `.res.mjs` and has ReScript `.resi` interfaces; direct test imports do not establish a supported TypeScript contract. Before exposing this proposal, define and verify generated or maintained TypeScript declarations at the actual public boundary. The declaration must express opaque validated move handles, typed result/error variants and descriptor/frame inputs; do not rely on consumers constructing ReScript runtime variants by hand or on `unknown` casts. Cross-language tests must exercise actual emitted bindings and rejection of invalid inputs. Packaging and publication require separate authorization. The viewer accepts animation data and remains independent of notation semantics; applications request shared formatting for display.

## Reuse and license boundary

Reuse CubeLab's documented dialect evidence, test vectors and structure requirements. `MoveParser`, `MoveTransform`, and `MoveExecutor` are candidates for a targeted adapter or extraction only after source dependency and license review: their own AST, sticker state and 2–5 guard do not make them drop-in `PwMove` implementations. CubeLab's AGPL and the recorded EUPL core decision require an explicit compatibility determination and provenance before copying code; no conclusion is assumed. Prefer one final policy owner in Core while retaining external compatibility behind adapters. No source movement is authorized by this proposal.

## Illustrative typed contract

The following signatures are a proposed design, not current exports or implementation approval. Exact names and the physical-frame mapping require design review against Core. The caller supplies a validated descriptor and a frame; Core owns validation and move semantics. The frame identifies the physical axes relative to the notation faces, not the viewer camera or solved-state equivalence. A rotation-intent marker is explicit for an all-layer move; it cannot turn a camera orbit into a puzzle move.

```rescript
// Schematic interface: PwFrame is a proposed validated Core frame type.
type descriptor = {size: PwShell.size, frame: PwFrame.t}
type displayProfile = WcaWithExplicitLayers
type sourceDialect = Modern | LegacyInner | Ruwix | Sse | Acube
type sourceVersion = string
type rotationIntent = OrdinaryMove | PhysicalRotation

type notationError =
  | SizeMismatch
  | InvalidFrame
  | IllegalMove
  | UnsupportedSelection
  | UnsupportedProfile
  | RotationIntentRequired
  | UnsupportedStructure(string)
type locatedDiagnostic = {start: int, stop: int, code: string, message: string}
type compatibility = {wcaTokens: bool, dialectCompatible: bool, reasons: array<string>}

let formatMove: (descriptor, displayProfile, rotationIntent, PwMove.t) =>
  result<string, notationError>
let formatAlgorithm: (descriptor, displayProfile, array<(rotationIntent, PwMove.t)>) =>
  result<string, (int, notationError)>
let parseCompatibility: (descriptor, sourceDialect, sourceVersion, string) =>
  result<StructuredAlgorithm.t, array<locatedDiagnostic>>
let assessCompatibility: (descriptor, sourceDialect, sourceVersion, string) =>
  result<compatibility, array<locatedDiagnostic>>
let serializeStructured: (descriptor, sourceDialect, StructuredAlgorithm.t) =>
  result<string, notationError>
```

`StructuredAlgorithm.t` is a proposed structure-bearing compatibility type: executable leaves hold validated `PwMove.t` plus explicit rotation intent, while groups, repeats and supported annotations retain their structure and order. Its constructors and handling of unsupported nodes require a separate design; it is not the existing CubeLab type or a second semantic move model. The source version is mandatory for stored/imported data; unknown provenance needs an explicit user choice before calling the adapter. Offsets are UTF-16 code-unit offsets with an exclusive `stop`, consistent with the existing Core parser's documented offsets. `formatAlgorithm` consumes an executed flat sequence and identifies the first failing move by zero-based index. `serializeStructured` must return `UnsupportedStructure` if it cannot preserve a node; exact source text and discarded trivia need separate storage.

For TypeScript, use a thin hand-authored adapter around generated ReScript JavaScript and declarations validated against the generated runtime. This avoids exposing compiler-specific variant encoding or allowing a consumer to construct a `PwMove` by assertion; it is a proposed boundary, not a currently available export. Its branded values come only from validated Core constructors or adapters. A future generator can replace the hand adapter if it provides the same contract and is verified against the emitted runtime.

```ts
declare const moveBrand: unique symbol;
declare const frameBrand: unique symbol;
declare const algorithmBrand: unique symbol;
type Move = { readonly [moveBrand]: true };
type PhysicalFrame = { readonly [frameBrand]: true };
type StructuredAlgorithm = { readonly [algorithmBrand]: true };
type Descriptor = { readonly size: number; readonly frame: PhysicalFrame };
type RotationIntent = "ordinaryMove" | "physicalRotation";
type DisplayProfile = "wcaWithExplicitLayers";
type SourceDialect = "modern" | "legacyInner" | "ruwix" | "sse" | "acube";
type SourceVersion = string;
type NotationError =
  | { readonly kind: "sizeMismatch" | "invalidFrame" | "illegalMove" }
  | { readonly kind: "unsupportedSelection" | "unsupportedProfile" | "rotationIntentRequired" }
  | { readonly kind: "unsupportedStructure"; readonly detail: string };
type Diagnostic = { readonly start: number; readonly stop: number; readonly code: string; readonly message: string };
type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
type Compatibility = { readonly wcaTokens: boolean; readonly dialectCompatible: boolean; readonly reasons: readonly string[] };
type ExecutedMove = { readonly move: Move; readonly intent: RotationIntent };

declare function formatMove(d: Descriptor, p: DisplayProfile, m: ExecutedMove): Result<string, NotationError>;
declare function formatAlgorithm(d: Descriptor, p: DisplayProfile, moves: readonly ExecutedMove[]): Result<string, { readonly index: number; readonly error: NotationError }>;
declare function parseCompatibility(d: Descriptor, dialect: SourceDialect, version: SourceVersion, text: string): Result<StructuredAlgorithm, readonly Diagnostic[]>;
declare function assessCompatibility(d: Descriptor, dialect: SourceDialect, version: SourceVersion, text: string): Result<Compatibility, readonly Diagnostic[]>;
declare function serializeStructured(d: Descriptor, dialect: SourceDialect, alg: StructuredAlgorithm): Result<string, NotationError>;
```

The adapter must validate a descriptor's integer size against Core's `PwShell.size` constructor and reject a mismatched move size; TypeScript's `number` alone is not validation. Its construction functions and detailed compatibility result need final design before implementation. Adapters report malformed input without throwing across the public boundary. Compatibility reports distinguish token syntax from competition legality; supported dialect names and version identifiers are illustrative and do not narrow existing CubeLab imports. Tests must compile these declarations and exercise real generated values, malformed JavaScript input and each result variant. Q2's existing `PwNotation.parse` remains separate and unchanged.
