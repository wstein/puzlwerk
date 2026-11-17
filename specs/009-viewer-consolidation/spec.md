# Viewer consolidation proposal

Status: bounded pilot authorized by the owner on 2026-11-15. The separate TypeScript viewer uses Three.js and Cubistry material under AGPL-3.0-or-later with retained MIT and Three.js notices. Core remains rendering-independent. The owner authorized the staged consumer implementation sequence on 2026-11-16, subject to the gates in VC5. Publication, a core license change, and an ADR remain separate decisions. [Cubistry #111](https://github.com/wstein/cubistry/issues/111) is the source proposal; this document makes its boundaries reviewable without replacing its authority. The [inventory](inventory.md) records the existing implementations and [license brief](license-package-proposal.md) records unresolved provenance and distribution questions.

## Objective and acceptance

A separately packaged viewer can present application-supplied cube projections and transitions without parsing notation or owning puzzle state. Core remains rendering independent; application adapters translate core state and move ASTs into viewer data. Scene geometry, camera, orbit, lighting, interpolation and rendering belong to the viewer; scan, device camera, validation, move input, solver, print and application UI remain with their applications. A first pilot must meet the gates below before any consumer replacement. The contracts in [wire-v1](../001-core-foundation/contracts/wire-v1.md) and [appearance-v1](../001-core-foundation/contracts/appearance-v1.md) retain their existing authority and meanings. Their IDs and appearance data are inputs to an application adapter, not a new physical-state serialization.

## Candidate contract

These TypeScript declarations describe the bounded pilot contract; they are not a promise of a final package API. All arrays and values are snapshots: a caller must not mutate them while in use. Coordinates are right-handed, in one adapter-selected scene frame, with +X right, +Y up, +Z front; distances share one unit. Quaternions are `[x,y,z,w]`, finite and normalized; positions, axes and angles are finite. IDs are nonempty and unique within a projection, stable across transition endpoints. These rendering numbers do not define canonical physical identities, frames, legality or state. The adapter maps canonical physical poses and appearance to this frame and validates legal transitions before calling the viewer.

```ts
type Vec3 = readonly [number, number, number];
type Quaternion = readonly [number, number, number, number];
type Result<T> = { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ViewerError };
type ViewerError = {
  readonly code: "InvalidProjection" | "InvalidTransition" | "UnresolvedAsset"
    | "Busy" | "Disposed" | "Unavailable" | "ContextLost" | "Cancelled";
  readonly message: string;
  readonly path?: string;
};
type Transform = { readonly position: Vec3; readonly rotation: Quaternion };
type Sticker = {
  readonly id: string; readonly transform: Transform;
  readonly size: readonly [number, number];
  readonly color: string; readonly imageId?: string;
};
type Piece = {
  readonly id: string; readonly transform: Transform;
  readonly stickers: readonly Sticker[];
};
type CubeProjection = { readonly pieces: readonly Piece[] };
type Transition = {
  readonly from: CubeProjection; readonly to: CubeProjection;
  readonly pieceIds: readonly string[];
  readonly axis: Vec3; readonly signedAngleRadians: number;
  readonly pivot: Vec3; readonly durationMs: number;
};
type AssetResolver = (imageId: string, signal: AbortSignal) => Promise<Result<CanvasImageSource>>;
type ViewerOptions = { readonly resolveAsset: AssetResolver };
interface CubeScene {
  setProjection(projection: CubeProjection): Promise<Result<void>>;
  transition(transition: Transition): Promise<Result<void>>;
  cancel(): Result<void>;
  invalidate(): Result<void>;
  dispose(): void;
}
declare function createCubeScene(host: HTMLElement, options: ViewerOptions): Result<CubeScene>;
```

A piece transform is relative to the scene, and each sticker transform is relative to its piece. A sticker's local +Z is its outward normal, local +Y is up, and its positive size is measured along local X and Y. Color is an application-resolved CSS color; image IDs are opaque and resolved by the application. The renderer may use those pixels but cannot use their colors or texture coordinates as physical identity. Asset resolver results remain caller-owned; viewer-owned GPU textures and scene resources are disposed by the viewer. The resolver must honor cancellation; a late completion after cancellation or disposal is ignored. A future implementation must specify supported image types, color space, alpha and texture origin before a pilot; those details are open, not implied by `CanvasImageSource`.

Transition axis is a nonzero unit vector and pivot is in scene coordinates. Positive angle follows the right-hand rule. The adapter supplies the complete intended signed rotation including 180°, 270°, and 360°; the viewer must never infer direction or number of revolutions from equivalent endpoint quaternions. Selected IDs must exist once in both endpoints; the nonselected pieces and all sticker definitions must be unchanged. For selected pieces the target transforms must match rotating the source around the pivot by the specified axis and angle within a documented numerical tolerance, and endpoint IDs must match. A transition with inconsistent endpoints is `InvalidTransition`; nonfinite data, duplicate IDs, invalid sizes or nonunit rotations are `InvalidProjection`. The adapter handles conversion from integer physical rotations, move notation and input semantics; the viewer verifies only projection/transition consistency, never legal moves. The viewer renders the exact target snapshot at completion, avoiding numerical drift.

Creation reports `Unavailable` if a context cannot be created. Asset resolution failure reports `UnresolvedAsset`; context loss reports `ContextLost` and leaves recovery to the application, which may dispose and recreate. Errors contain no partial state commit: an invalid or failed operation retains the last successfully presented projection. `setProjection` and `transition` are exclusive; a concurrent request returns `Busy`. A transition starts only if `from` equals the currently presented projection by IDs and values; otherwise it is `InvalidTransition`. On completion the viewer presents `to`; application/core state remains caller-owned throughout. `cancel` is idempotent, interrupts an active transition and pending asset work, restores its `from` projection and resolves that operation with `Cancelled`; it does not commit a target. The owner selected this pilot behavior on 2026-11-15; canonical state remains application-owned. `dispose` is idempotent, cancels pending work, removes listeners and viewer-owned resources; later operations return `Disposed`. A late asynchronous result cannot render or change state after cancellation/disposal. The application owns the host and asset source and keeps them valid until disposal; the viewer owns its canvas, context resources, render scheduling and listeners.

`invalidate` requests a coalesced render after external presentation changes; projection, camera/orbit, resize and transition changes also invalidate. The viewer must not continuously draw while idle, except during active animation or explicitly enabled motion. Context loss suspends drawing; the pilot pauses drawing and animation time while hidden and resumes without a jump. A future pilot must define resizing and external camera controls without granting them ownership of puzzle state. The pilot animation clock is monotonic and viewer-owned. Cancellation and disposal stop scheduled frames. No caller may advance canonical state based solely on an interpolated frame.

## Timing and easing decision

The [owner decision of 2026-11-10](https://github.com/wstein/whr-cubing/blob/16496b25c0dd4efbdc792f9ba0b12380d0b0d71f/chartroom/notes/Puzzle%20orientation%20belongs%20to%20core%20and%20application%2C%20display%20orientation%20to%20the%20viewer.md) assigns start, target and duration to the application; the viewer interpolates and owns easing. Cubistry retains its production animation clock, TimerController. This supersedes the November 5 open timing point in the source note; it does not approve implementation or migration.

The pilot `durationMs` is the total duration of this transition in milliseconds, a finite nonnegative number; zero requests an immediate target; negative or nonfinite values return `InvalidTransition`. The application computes the complete duration before calling the viewer, including any policy for half-turn versus quarter-turn duration. The viewer uses that value once and must not double it for a half-turn. The owner selected viewer-internal smoothstep easing (3t² − 2t³) on 2026-11-15 for this pilot. These bounds and zero behavior are proposal details, not additional owner decisions.

For this pilot, hidden animation time pauses and resumes without a visual jump. The owner selected application-supplied zero duration when reduced motion is requested on 2026-11-15; the viewer does not override duration. The application retains ownership of its state commit. Cubistry TimerController behavior is unchanged and consumer synchronization belongs to a separate migration. The cancellation behavior above is a candidate, not an accepted change to Cubistry's existing TimerController semantics.

## VC4: isolated extraction pilot

The [candidate source selection](source-selection.md) and `source-register.json` file register provide pilot-specific evidence; they do not authorize copying or implementation.

VC4 is a separately authorized PuzlWerk extraction pilot with one fixed scene and one animated turn. Existing applications and their viewers remain unchanged; the pilot replaces no consumer. The owner authorized this bounded pilot on 2026-11-15 with the registered Cubistry source and retained AGPL-3.0-or-later terms and MIT/Three.js notices. Consumer compatibility and distribution remain separately unresolved.

The focused pilot checks must compare the fixed reference scene's frame and sticker up direction, and the animated turn's axis and signed angle against that reference, including the direction ambiguity of 180°, 270° and 360° rotations. Check cancellation, asset resolution and disposal, including late asset completion. Record commands and results; results are **UNKNOWN until run**. Stop on a failed check or an unresolved provenance, contract or timing detail. Scan workflows and consumer parity are not pilot acceptance criteria.

## VC5: consumer migrations

On 2026-11-16, the owner authorized the implementation sequence in the session: first preserve and obtain visual acceptance of Cubistry presentation quality in the shared viewer, then migrate Cubistry, CubeAssembler, CubeLab, and Regrip in that order. This supersedes the earlier migration order. Each stage follows acceptance of its predecessor; unresolved concrete visual, license, and owner merge gates remain. Regrip includes a separate gyro, frame, and replay adapter and regression checks. The CubeAssembler migration must preserve 2×2–7×7 scan-to-view, validation, colors, view controls, turns, gestures, cancellation and error handling. Its acceptance includes browser and visual parity, owner live desktop and mobile touch acceptance, and rollback to the existing viewer without changing canonical scan/state data. Record actual devices, browsers, commands and results; parity remains **UNKNOWN until run**. Agree performance targets from measured before/after startup, frame time, idle rendering, memory and responsiveness; baseline and results are **UNKNOWN until measured**. Stop on failed parity or live acceptance, unacceptable regression or unresolved mapping; retain the existing viewer until the owner resolves the issue. Each consumer needs its own adapter, applicable regression and visual parity checks, live acceptance, license assessment, and rollback criteria.

The bounded pilot package and local demo are implemented; consumer migrations follow the authorized sequence and remain subject to the concrete gates above.

## Stage 1 source-extraction slice

The first source-extraction slice adapts the render builders from Cubistry
`PhysicalCubeScene` and their render-only dependency closure at revision `efafcc1d97687eccea0cde87a230f447ce1b6c66`.
Preserve the source rendering algorithms and profiles; replace core and application
imports at the boundary with explicit render data. Connect the existing 2×2
projection contract without making rendered poses authoritative. The adapter
must retain caller-owned assets, signed turns, exact endpoints, hidden-time
pause, cancellation restore, and disposal.

Acceptance requires source-versus-adapter fixtures with the same 2×2 frames,
profile and materials, comparing body and sticker transforms and sticker up;
quarter, half and multiple-revolution turn behavior; cancellation and resource
lifetime checks; targeted mutations of the new checks; and actual browser
captures. Record source files and revisions in NOTICE. Multi-cube, picture UV,
stickerless, and full HQ visual acceptance remain open until separately demonstrated; this slice does not migrate a consumer.

`PhysicalCubeScene` uses numeric IDs, discrete axis-aligned sticker frames, and
axis-indexed turns about the origin. `CubeScene` permits string IDs, arbitrary
unit quaternions, arbitrary unit axes, and nonzero pivots. The extraction must
preserve the latter contract: map IDs explicitly and adapt transforms, or extract
the source's render geometry and asset builders under the existing generic pose
and turn wrapper. Do not silently reject valid projections or introduce a second
parallel render engine. The bridge and any necessary contract extension require
review before code. Follow-up scope is tracked in [#68](https://github.com/wstein/puzlwerk/issues/68).

The adapter must preserve caller-supplied body poses and sticker-local poses
independently, including arbitrary offsets, sizes, and rotations, without
rounding or snapping them to a grid. Any string-to-numeric ID mapping is stable
and bijective within a projection. Use a source profile only when explicitly
supplied render data fits it, with no hidden normalization. Extract the original source geometry, artwork, material, and resource builders
under the existing generic pose and motion wrapper, preserving their algorithms
and recording the source-to-target diff. Source `sync` and `beginTurn` cannot
replace the public generic contract unchanged. The extraction uses one shared
builder and lifecycle for all valid projections.

Regression fixtures must include arbitrary IDs, non-axis-aligned sticker
rotation and turn axis, a nonzero pivot, a piece without stickers, and an empty
projection in addition to the source 2×2 comparison. These are existing valid
contract cases, not an expansion of the contract.

The public profile path adds optional per-piece render data
`geometry: { cellSize, outerSides }`: three finite cell extents strictly greater than the source gap (0.01), and
three pairs of boolean exterior-side flags. The data is snapshot-copied,
validated (including the gap boundary) and invariant between transition endpoints. It selects only the source
body geometry builder; it does not alter body or sticker poses, sticker sizes,
state, legality, or identity. When absent the same builder uses the existing
generic dimensions; no separate renderer or options-level ID map is introduced.

The geometry-profile slice did not establish core or sticker shadows. The following
model-profile slice addresses them; artwork, multi-cube and picture paths remain
open, and no full source parity follows from the profile comparisons.

## Stage 1 model profiles and core slice

Optional projection-level `presentation: { size, nominalEdge }` selects the
Cubistry size-dependent body and sticker radius rules. Size is an integer from
2 through 7 and nominalEdge is a positive finite scalar supplied by the caller.
Cubistry's default widened layers use nominalEdge equal to size; a custom layer
profile may instead use its explicit edge. Do not infer a grid or edge from
piece positions. Piece cell sizes and outer-side flags remain explicit.
Caller-supplied piece and sticker poses and sticker sizes stay unchanged. The
sticker radius is bounded by half the supplied size for existing generic
small-sticker inputs; native source fixtures must not need that bound.

Optional independent `core: { center, halfExtent }` specifies a finite center
in projection scene coordinates and a positive finite scalar. The original
Cubistry static sphere uses radius `0.8 * halfExtent`, source plastic material,
and SphereGeometry(1, 48, 24); it remains fixed during arbitrary pivots and is
viewer-owned. Sticker meshes cast and receive shadows as in the source. The
metadata is validated, deep-snapshotted and invariant during transitions; no
core is inferred for projections omitting it, including empty/free scenes.

Compare actual source fixtures for default 2×2, 3×3 and 7×7 and an unequal
profile with explicit nominal edge, including geometry, sticker radius and core
bounds. Prove validation, snapshot, turn invariance, shadow flags, ownership and
source formulas with targeted mutations. A public browser gallery captures the
same source and adapter setups, stationary and midturn as applicable. Record
settings, source revision and limits. Artwork, projected pictures, multiple
cubes and full owner HQ acceptance remain open; no consumer migration is implied.

## Stage 1 source artwork and picture slice

The viewer extracts Cubistry's original `body-artwork.ts`, `cut-faces.ts`,
`projected-uv.ts`, and the relevant material, construction and picture-builder
paths of `physical-scene.ts` at revision
`efafcc1d97687eccea0cde87a230f447ce1b6c66`. These run under the existing
generic snapshot and motion wrapper; the full PhysicalCubeScene class has not
been extracted. No application state, legality or notation is inferred.

Opt-in snapshot fields, with names fixed for this slice:

- `appearance?: { construction: 'stickered' | 'stickerless'; bodyColor?: string | null;
  coreColor?: string; frameColor?: string | null; miterCutFaces?: boolean; planarFaceUv?: boolean }`. Colors
  are six-digit hexadecimal; a null or omitted bodyColor selects source fallback.
  A null or omitted frameColor selects the original
  plastic color, distinct from cut-face bodyColor and stickerless coreColor.
  Source defaults apply to omitted optional fields.
  Without any new opt-in fields, legacy rendering is unchanged. If appearance
  is omitted while other opt-ins are present, construction defaults to
  stickered; explicit picture remains active.
- `Sticker.sourceFace?: { normal: Vec3; up: Vec3; color?: string; edgeColors?: FaceEdgeColors }`.
  Normal and up are perpendicular signed Cartesian unit axes in the piece-local
  construction frame. Their caller-supplied construction order is retained
  internally across reorder-equivalent transitions and live updates for the
  source cut-face fallback rule. Optional six-digit hexadecimal color is the source face
  color, independent of sticker image tint; absent uses the normalized sticker
  material color. Face color may change through setArtwork while the source
  normal/up stay fixed. Within one piece, annotated normals are unique. Edge
  names are `left`, `right`, `top`, `bottom`; a value is a six-digit hexadecimal
  color or a dense, nonempty array of `{to: number; color: string}` with finite
  `to`. Preserve source order and last-stop fallback; do not impose a fabricated
  range or coverage rule. Unannotated stickers keep legacy decal behavior and
  are never assigned source faces by inference.
- `picture?: { widths: readonly number[]; faces: { U: string; R: string;
  F: string; D: string; L: string; B: string } }` supplies six opaque image IDs
  and positive finite dense layer widths. If `presentation` exists, width count
  equals its size. `Sticker.picture?: { face: 'U' | 'R' | 'F' | 'D' | 'L' |
  'B'; layerIndex: Vec3 }` opts an annotated sticker into picture projection;
  indices are dense integers in `[0, widths.length)`. Its explicit sourceFace
  must match the source `PROJECTED_FACES` normal and up for that face. Picture
  metadata on a sticker requires projection picture data; picture data requires
  at least one participating sticker. Nonparticipating stickers retain legacy
  appearance; empty and sticker-free projections remain valid without picture.

Three body groups 0..5 mean +X, -X, +Y, -Y, +Z, -Z. The source face right
vector is up cross normal. Face IDs and indices refer to immutable construction
frames, not current world slots. Pose-only turns never rebind them. Body poses,
sticker local poses and sizes remain caller-provided. All new fields are
validated and deep-snapshotted before resolution, remain invariant between
transition endpoints, and participate in projection matching.

Picture face resolver results are caller-owned `CanvasImageSource` pixels in
the Cubistry bottom-left convention, already oriented like the source loader's
flipped ImageBitmap. Picture textures set `flipY=false`; do not add an implicit
second flip. Existing per-sticker imageId/Resolver semantics remain unchanged.
The viewer owns texture clones, cut textures, materials and geometries, never
closes or disposes caller images. Validate and stage all six assets and the
complete detached candidate before replacing the visible projection; errors,
cancellation, late resolution or disposal release the candidate only and keep
the previously committed projection. This boundary adapts source's
clear-before-demand sequence without changing its projection or miter formulas.

Acceptance: source-derived, hash-pinned identical-input fixtures and browser
captures for native 2×2, 3×3 and 7×7, representative unequal layers,
stickered and stickerless, multistop miter, asymmetric six-face picture,
rest and midturn, desktop and mobile. Test existing arbitrary free poses and
no-sticker/empty projections, atomic asset failure/cancel/late completion,
picture removal and resource ownership. Every new behavioral check needs a
targeted mutation that fails for the intended reason. Multi-viewport, consumer
migration and full owner HQ acceptance remain separate open work.

Activation: sourceFace alone is valid immutable body-art metadata. Edge colors
affect cut faces only when miterCutFaces is enabled; planarFaceUv affects only
the source stickerless path. Sticker.picture requires both projection.picture
and sourceFace. Incompatible new field combinations fail atomically with
InvalidProjection; never infer their flags from poses.

### Live appearance during a turn: proposed contract for review

Cubistry permits appearance, picture mode and per-sticker image override changes
while a turn is active. The shared viewer needs an independent `setArtwork`
operation; removing the existing setProjection Busy guard is not sufficient.
The operation accepts a complete decoration replacement: projection appearance
and picture data plus per-sticker `{id, color, imageId?, sourceFace?, picture?}` for
all currently presented sticker IDs. The app selects opaque IDs; the viewer does
not interpret facelets, notation or puzzle state. Piece IDs, piece geometry,
body poses, sticker IDs, local poses and sticker sizes cannot change. Validate
the complete result using the same projection checks and snapshot it before any
asset resolution. Return the existing Result form asynchronously.

On success the new decoration is part of the committed source projection and,
if a turn is active, both that turn's stored source and target projections. The
caller can reconstruct the next `transition.from` by applying the successful
replacement to the corresponding physical endpoint; there is no invisible
render-only equality state. A successful change remains on turn completion or
cancel, while cancel restores the exact physical source pose. Existing cancel
behavior with no live change remains identical. Projected picture mode keeps
its cloned projected surfaces when a base tile image is overridden; the updated
base tile appears when projected mode is later removed, as in Cubistry.

Exactly one live decoration operation may be pending. Without a committed
projection, setArtwork returns InvalidProjection; while setProjection or its
asset build is pending, it returns Busy. During a turn it is permitted. A second one, a new
setProjection or a new transition returns Busy while it resolves; an already
active turn continues. If the turn finishes during loading, apply to its current
endpoint when resolution succeeds, preserving elapsed progress and endpoint.
`cancel` intentionally aborts both an active turn and any pending decoration;
`dispose` aborts and ignores late results. A failed, invalid or late update by
itself does not change visible materials or abort a turn. There is no implicit queue. Candidate
materials, geometry variants and cloned windows are built detached and
validated before one commit to the existing bodies and stickers, including those
under a pivot. No caller image is closed; replaced viewer-owned resources are
released exactly once without removing retained scene objects or their pivot.

Acceptance includes actual Cubistry timing-callback fixtures: change appearance,
picture mode and tile override at midturn, verify progress/poses and successful
completion, and verify successful decoration persists after turn cancellation.
Cover pending asset resolution across turn completion, explicit cancel/dispose,
late/failed resolution, two simultaneous updates, Busy interactions, repeated
replacement/resource counts, projected override restoration and next
transition.from equality. Each new behavior requires a targeted mutation for
its intended failure. This proposal needs independent review before live-code
implementation; the existing no-live API remains unchanged until then.

Live construction references: once a sourceFace normal/up has been committed for
a sticker, setArtwork cannot remove or alter it; edge colors and ordinary colors
may change. A legacy sticker may opt in to a sourceFace for the first time.
The first successfully committed picture widths and per-sticker face/layerIndex
are retained as validation-only construction references, including while picture
is off. Re-enabling picture must reuse established widths and bindings; it may
establish references not yet present. A failed, canceled or pending update does
not reserve references. A successful setProjection starts a new construction and
its references. The registry does not supply hidden render state: visible data
and transition equality still come solely from the explicit snapshots.

## Stage 1 shared stage, display and lighting slice

This slice adapts the source display and studio behavior at Cubistry revision
`efafcc1d97687eccea0cde87a230f447ce1b6c66`. A viewer-owned stage has one canvas,
renderer, scene, camera, studio and scheduler; each child uses the same physical
builder and CubeScene operations, including the separately reviewed artwork API.
The existing `createCubeScene(host, options)` is a one-child wrapper preserving
its signature, FOV 35, camera position [4,3,5], preset, lack of input binding,
errors and visibility/cancel semantics. New stages opt into display controls.
Child operations are exclusive per child but independent across children. Child
IDs are scoped locally. Child disposal cancels its work and removes its own
resources; stage disposal cancels all children and releases shared resources
once. Context loss is stage-wide, late asset completions cannot commit, and the
caller disposes and recreates as in the current contract.

### View, input and scheduling contract

The application supplies child-local placements and a synchronous pure view
policy receiving an immutable snapshot of aspect, FOV, zoom, presentation
quaternion and placements. Its result contains positive finite camera distance,
far plane and uniform group scale, with far greater than the camera near plane.
The stage validates a complete result before applying it; invalid results or a
thrown policy leave the last valid view intact and report `InvalidView` through
an explicit stage error callback. A synchronous setter that triggers the policy
returns that error; asynchronous resize or input reports it through the callback
and stops repeated evaluation until a new invalidation or input. No callback
receives Three objects or scheduling control. Camera refit follows resize, zoom
or layout changes; group scale is recalculated for relevant display poses. Empty
stages retain a valid camera and skip caster fitting. Clock source helpers may be
adapted as render-only functions: the source default-orientation camera distance
and per-pose `min(1, defaultDistance / requiredDistance)` scale must both be
preserved. No fixed encompassing radius substitutes for that policy.

A caller supplies a positive finite common caster radius and nonnegative finite
clearance in stage-local units; stage transforms child centers by placement,
display quaternion and scale, and scales radius and clearance before fitting.
This expresses the source clock's equal-cube envelope, not inferred puzzle
bounds or a claim for unequal caster radii. Child placements and display
transforms never modify caller projection or transition coordinates; the core
follows its child and stage but remains stationary relative to its layer turns.

The stage owns source SmartRotation initial/anchor/reset behavior, smart/free/
classic modes, drag threshold, inertia, zoom and reduced motion. A caller may
register its own UI interaction elements and call `interact()`; ownership,
markup, storage and preferences remain with the app. Preserve source panel and
canvas pointer overlap blocking until every contact ends, pointer cancellation,
settings/wheel interaction, focus and visibility suspension. Reset returns to
the source initial/anchor semantics without changing puzzle poses. Do not add an
unproven arbitrary orientation setter or picking, export or overlay API.

One monotonic stage clock and one coalesced RAF serve all children. Coasting,
returning and leveling request frames; `awaiting-return` schedules at most one
earliest wake timer for the source return deadline, converting its seconds to
stage milliseconds. Idle requests neither RAF nor timer. Pointer, setting,
visibility and disposal changes reschedule or cancel wakeups. Hidden child
transitions retain the existing pause-without-jump behavior. Stage renders at
most once per scheduled frame, including concurrent child turns, and endpoint
completion does not commit application state.

### Light and material contract

The stage owns its source studio and effective ambient, hemisphere, key, fill,
rim and shadow-fill roles, with bounded finite color, intensity, visibility,
position and target render values and optional non-shadow directionals. It owns
contact shadow, floor opacity, fine-shadow and color-temperature configuration.
Shadow intensity and floor opacity are set against saved base values, never
compounded across updates. Caster fitting uses the effective configured key and
shadow-fill directions; switching Names light on and off must not let the
studio's construction-time directions overwrite them.

A stage-wide tone selection offers source neutral and the source soft-shoulder
custom tone mapping (shoulder .95), not arbitrary shader injection. Install the
fixed source shader chunk idempotently before the first dependent program is
compiled; neutral stages remain neutral and separate stages must not overwrite
one another's shader definition. Stage-wide exposure is a positive finite value
or a synchronous pure policy evaluated after view and effective lights and
before drawing. The policy receives an immutable numerical light, display
quaternion, camera position and shadow-map snapshot; source-equivalent pure
weighted-face exposure helpers may be reused. Invalid exposure or policy failure
retains the last valid frame and reports `InvalidLighting` through the same
synchronous/asynchronous error channels. Re-evaluate on relevant light, view,
shadow or material changes, never in an otherwise idle loop. One render pass
has one stage-wide tone and exposure; mixed per-child operators are not claimed.

Child material render values cover source plasticity's specular intensity,
roughness, clearcoat and receive-shadow behavior, including the core and affected
artwork surfaces. Application-owned mapping chooses those values; no calendar
layout, URL or settings model enters core or viewer. Coordinate this setter with
the accepted artwork API and use its single builder and resource ownership.
No raw renderer, mutable Three light/camera or shader callback is exposed.

### Evidence and boundaries

Acceptance compares the actual pinned source and extraction for Clock two and
three children in portrait and landscape, rest, mid-turn, drag, zoom and reset:
camera distance/far, group scale, transformed caster centers and shadow frusta.
Names on/off, color temperature, light visibility and plasticity 0/.6/1 require
source material, floor, exposure and shader comparisons including simultaneous
caster fitting. Browser captures cover desktop and mobile viewport settings;
physical devices remain separately reported. Tests cover overlapping contacts,
return wakeups, one render per frame, idle zero work, independent child operations,
asset cancellation, context loss and exact resource disposal, with targeted
mutations for each new check. The actual Artwork implementation and public API
must be frozen and reviewed before integrating scene ownership; no parallel
builder is introduced. Source motion timing revisions, absolute deadlines and
hidden-time interaction remain a separate Phase 2 decision. This slice neither
migrates consumers nor claims full HQ acceptance or publication.

### Stage API shape and atomic presentation

The following is the contract shape for review, not an implementation or a
change to the existing `ViewerError` union. Numeric vectors and quaternions use
the existing readonly tuple types; snapshots and their nested arrays are copied.
The separately reviewed `CubeScene` interface, including its artwork operation,
is inherited rather than duplicated.

```ts
type StageError = ViewerError | { readonly code: 'InvalidView' | 'InvalidLighting'; readonly message: string };
type StageResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: StageError };
type Placement = Readonly<{ position: Vec3 }>;
type StageView = Readonly<{ aspect: number; fovDegrees: number; zoom: number;
  orientation: Quaternion; placements: readonly Placement[] }>;
type FrameFit = Readonly<{ distance: number; far: number; groupScale: number }>;
type ViewPolicy = (view: StageView) => FrameFit;
type CasterEnvelope = Readonly<{ radius: number; clearance: number }>;
type DirectionalData = Readonly<{ color: string; intensity: number; visible: boolean;
  position: Vec3; target: Vec3 }>;
type LightSnapshot = Readonly<{ ambient: number;
  hemispheres: readonly Readonly<{ up: Vec3; sky: number; ground: number }>[];
  directionals: readonly Readonly<{ to: Vec3; amount: number }>[] }>;
type ExposureSnapshot = Readonly<{ lights: LightSnapshot; orientation: Quaternion;
  cameraPosition: Vec3; shadowMapEnabled: boolean }>;
type ExposurePolicy = (snapshot: ExposureSnapshot) => number;
type StageLighting = Readonly<{
  ambient: Readonly<{ color: string; intensity: number; visible: boolean }>;
  hemisphere: Readonly<{ sky: string; ground: string; intensity: number; visible: boolean; position: Vec3 }>;
  key: DirectionalData; fill: DirectionalData; rim: DirectionalData; shadowFill: DirectionalData;
  extraDirectionals: readonly DirectionalData[];
  keyShadowStrength: number; shadowFillStrength: number; floorOpacity: number;
  contactShadow: boolean; fineShadowEdges: boolean; colorTemperature: boolean;
  toneMapping: 'neutral' | 'softShoulder'; exposure: number | ExposurePolicy;
}>;
type ChildMaterial = Readonly<{ specularIntensity: number; roughness: number;
  clearcoat: number; receiveShadow: boolean }>;
type StageOptions = Readonly<{ resolveAsset: AssetResolver; fovDegrees: number; zoom: number;
  initialOrientation: Quaternion; mode: 'smart' | 'free' | 'classic'; sensitivity: number;
  dragThreshold: number; reducedMotion: boolean; viewPolicy: ViewPolicy;
  casterEnvelope: CasterEnvelope; lighting?: StageLighting;
  onError?: (error: StageError) => void; onViewChanged?: (view: StageView) => void }>;
interface StageChild extends CubeScene {
  setPosition(position: Vec3): StageResult<void>;
  setMaterial(material: ChildMaterial): StageResult<void>;
}
interface CubeStage {
  addCube(placement: Placement): StageResult<StageChild>;
  setViewPolicy(policy: ViewPolicy): StageResult<void>;
  setCasterEnvelope(envelope: CasterEnvelope): StageResult<void>;
  setZoom(zoom: number): StageResult<void>;
  setLighting(lighting: StageLighting): StageResult<void>;
  setRotationMode(mode: 'smart' | 'free' | 'classic'): StageResult<void>;
  setReducedMotion(enabled: boolean): StageResult<void>;
  resetDisplayOrientation(): StageResult<void>;
  interact(): StageResult<void>;
  registerInteractionSurface(element: HTMLElement): StageResult<() => void>;
  invalidate(): StageResult<void>;
  dispose(): void;
}
declare function createCubeStage(host: HTMLElement, options: StageOptions): StageResult<CubeStage>;
```

For every presentation update, prepare candidate display pose, placements,
view fit, effective lights, material values and exposure; the exposure policy
reads the candidate view and candidate effective lights. Validate the entire
candidate before committing any camera, group, lighting, material or rendered
state. A synchronous setter failure keeps the previously accepted configuration
and returns the error. An asynchronous input or resize can advance internal
controller time, but on failure it retains the last presented configuration,
reports the error once and does not cause an error-driven RAF loop. A later
input or invalidation retries from a coherent candidate. `onViewChanged` runs
only after a successful commit; it observes a copy and does not own the frame.
The callback cannot mutate a candidate being evaluated.

### Source body and sticker shape extension for Stage 1 (review candidate)

The pinned Calendar7 source has two additional render-only geometry paths. Its
Names `layerProfileFor` uses widths [1.6,1,1,1,1,1,1.6] (edge 8.2), subtracts
`0.01 / (66.5 / 8.2)` scene units from each cell extent, and calls the same
source two-radius builder with outer radius `.055 * 8.2 / 3`, inner radius
`0.6 * outer`, and two bevel segments. Its source profile has no sticker
factory: the default N=3 sticker geometry (.87 square, corner radius .055,
curve segments 4) is independently scaled in its local right/up axes by the
corresponding cell extents, and offset is `.502 - .5 + normalCell / 2`.
The standard Calendar7 fallback instead uses the source Three.js
`RoundedBoxGeometry(.99,.99,.99,1,.055)`. Names uses the existing miter and
planar-face-UV artwork options. Those source calls are distinct from the
current default preset and cannot be represented exactly by changing N alone.

Proposed minimal optional render data, independent of puzzle state:

```ts
type BodyProfile =
  | Readonly<{ kind:'twoRadius'; gap:number; bevelSegments:number }>
  | Readonly<{ kind:'roundedBox'; gap:number; radius:number; bevelSegments:number }>;
// CubeProjection gains optional geometryProfile: { body: BodyProfile }.
// Sticker gains optional geometry: { referenceSize: readonly [number, number]; cornerRadius:number }.
```

For either body profile each piece supplies its existing explicit cell geometry
and outer sides, and body size is `cellSize - gap`. The `twoRadius` variant also
requires explicit projection `presentation`; it uses its existing size and
nominal-edge source radius rules and passes both radii and bevel segments to the
same source builder. The `roundedBox` variant uses Three.js's source
RoundedBoxGeometry with the explicit radius and bevel segments. Gap is finite
and nonnegative; each cell extent exceeds it. Radius is finite and positive;
segments is a positive safe integer. Empty projections remain valid. Profiles
are opt-in: without them all current inputs and geometry behavior remain valid,
with no grid or core inference and no change to caller piece transforms.

Sticker `geometry` describes a source base rounded sticker, not final pose or
size: `referenceSize` is a pair of positive finite extents and `cornerRadius`
is finite, nonnegative and at most half its smaller extent. Build the source
rounded geometry with four curve segments and scale the mesh locally by
`sticker.size / referenceSize`. This preserves explicit caller size and pose,
source anisotropic corner scaling and source UVs. Without `geometry`, the
current preset sticker radius and geometry behavior remain unchanged. The
application supplies source offsets and final sticker sizes; the viewer never
reconstructs them from free projections. Profile and shape data are validated,
deep-snapshotted and invariant across transitions, including live artwork
updates and cancellation. Existing `appearance.planarFaceUv` and miter options
remain the only associated UV and cut-face controls.

Before claiming source parity, compare actual pinned source position, normal,
UV and index buffers for Names two-radius bodies and standard rounded boxes;
compare visible non-square sticker geometry, local scale, offsets and UVs from
the real PhysicalCubeScene. Include caller-owned assets, planar/miter artwork,
rest and mid-turn desktop/mobile views, invalid data, default-path regressions,
resource lifetime and targeted mutations of each profile field. Stage lighting
captures with the old preset profile demonstrate lighting only, not Names
geometry parity. Consumer migration and full owner HQ acceptance remain open.

## Proposed acceptance suite and inventory gate

The [acceptance inventory](acceptance-matrix.md), [preview plan](acceptance-preview-plan.md) and `acceptance-routes.json` route manifest
are a planning inventory. They do not establish parity, activate a
preview, authorize implementation, or replace VC5. Before suite implementation, review the inventory, source-native fixtures,
reference eligibility, per-case checklists, and open decisions recorded there.
Resolve missing production mappings and fixture exports before claiming parity.
Reserved routes are not deployed URLs.

Each case requires an independent owner decision, evidence and the exact tested
head. Architecture, functional and visual results are distinct; a pass or owner
approval for one case implies nothing about another. An unavailable original or
an unresolved license blocks comparison; do not substitute a fabricated visual
reference. Wire definition/state and appearance remain governed by their
existing contracts. The ReScript core is authoritative for physical puzzle
state and moves; viewer projections and interpolated frames are not. The suite
must use the production shared viewer and, once available, a shared production
play controller; a parallel TypeScript mechanics engine or simulated play does
not demonstrate this architecture.


## Orientation indicator acceptance

The acceptance inventory includes source-specific orientation indicators and
controls: CubeAssembler's noninteractive X/Y/Z overlay follows the view and its
virtual face frame; Regrip's labelled axes receive physical quaternion and virtual
frame data; CubeLab's orientation calculations and replay have a separate case.
The [acceptance inventory](acceptance-matrix.md) and route manifest specify native
setups and observed expectations. View orbit and display reset must not silently
change canonical puzzle state; physical turns, gyro/replay events and virtual
frame changes are compared in their own frames and must not apply a regrip twice.

For an actual production gizmo integration, demonstrate that display drag/orbit,
resize and reset keep any rendered indicator synchronized with the stage's
`StageView`, while preserving physical state. Check pointer cancellation, disposal
and touch only against the corresponding actual source and implemented control;
CubeAssembler's overlay passes pointer events through and its separate canvas
accepts touch. A clickable or draggable gizmo control is **UNKNOWN**, not an
established source feature. The current shared stage exposes `onViewChanged`,
`resetDisplayOrientation` and interaction surfaces; a production gizmo and its
binding to physical/virtual frames have not been established and remain BLOCKED.
No rendered diagnostic, replay or single source case alone proves app parity,
live hardware behavior or owner visual acceptance.

## Proposed capture-recovery application contract

Status: **proposal for the full envelope; bounded WI1/WI2 domain runtime is recorded below**. The owner requested this
contract and an acceptance case on 2026-11-16. The workflow below remains a UX
proposal; the separately authorized WI1/WI2 domain boundary below does not approve
a general recovery engine, consumer migration or publication. CubeAssembler owns camera acquisition, recognition, guide
provenance, photo inspection and the review/commit workflow. Pure mapping,
candidate constraints and legality belong in ReScript domain functions; the
viewer presents application-supplied projections and owns no authoritative
recovery or puzzle state. Package placement, license compatibility and any
extraction require a separate decision.

### Inspected interfaces and limits

The source baseline is [CubeAssembler PR #56](https://github.com/wstein/cube-assembler/pull/56),
Draft and unmerged when inspected, at `bab97177a0d4b860d47308f57df20963dfdc9946`.
Its [CaptureFaceMapping.resi](https://github.com/wstein/cube-assembler/blob/bab97177a0d4b860d47308f57df20963dfdc9946/src/core/capture/CaptureFaceMapping.resi)
exposes source-slot placements, quarter turns, `validateMapping` and
`captureFrame`; [SpatialOrientationWizard.resi](https://github.com/wstein/cube-assembler/blob/bab97177a0d4b860d47308f57df20963dfdc9946/src/core/capture/SpatialOrientationWizard.resi)
exposes retained candidates, `truncated`, `fullCubeValidityKnown`,
`generateForProtocol` and canonical-target choices. These are CubeAssembler APIs,
not existing PuzlWerk recovery exports. Its [CaptureRecovery.res](https://github.com/wstein/cube-assembler/blob/bab97177a0d4b860d47308f57df20963dfdc9946/src/core/capture/CaptureRecovery.res)
keeps persisted mapping/capture-frame data separate and marks inconsistent or
missing current-guide evidence as incomplete. That guard is intentional; this
proposal does not remove it or turn a conflict into automatic fallback search.

PuzlWerk's [PwCodec.resi](https://github.com/wstein/puzlwerk/blob/f6140a9899456df797e9cc136d0ddd68872793af/core/res/PwCodec.resi) decodes opaque structurally
validated definition/state values. [PwValidate.resi](https://github.com/wstein/puzlwerk/blob/f6140a9899456df797e9cc136d0ddd68872793af/core/res/PwValidate.resi)
separates structural checks, named necessary invariants and reachability evidence;
`assess`, `assessAssuming` and policy-aware `applyMove` have explicit assumptions.
Complete face-turn methods are scoped to N=2 and N=3; larger sizes need a verified
replay certificate for a positive reachability verdict. A valid mapping or
structural pass supplies no complete NxN legality claim. The existing
[core/viewer bridge](https://github.com/wstein/puzlwerk/blob/f6140a9899456df797e9cc136d0ddd68872793af/packages/core-viewer-bridge/src/index.mjs) `open` and
`createPlayer`, [viewer contract](https://github.com/wstein/puzlwerk/blob/f6140a9899456df797e9cc136d0ddd68872793af/packages/viewer/src/contract.ts)
`CubeScene.setProjection`/`transition`/`cancel`, and
[consumer fixture manifests](acceptance-matrix.md#cubeassembler-native-22-comparison)
are integration evidence, not a capture-recovery implementation. In particular,
the native color-only 2×2 fixture does not supply physical piece/sticker identity.

### Proposed envelope and port semantics

The working name `CaptureRecoveryEnvelope`, revision `proposal-1`, denotes a
versioned **application-facing** exchange separate from
[wire-v1](../001-core-foundation/contracts/wire-v1.md) and
[appearance-v1](../001-core-foundation/contracts/appearance-v1.md). These proposed
records and operations are descriptive shapes, not exported, typechecked or
runtime-tested declarations. They do not introduce another canonical puzzle
model or change either binding contract.

| Proposed record | Required meaning |
| --- | --- |
| `RawObservation` | Stable `photoId`, source slot, observation revision, immutable recognized `sourceGrid`, original photo asset reference/hash, and recorded photo transform/mirror convention. Record guide protocol/version, step, displayed arrow and mirror mode per observation, plus producer revision and source provenance. Absent/unknown provenance stays absent/unknown. Photo identity is never inferred from equal colors. |
| `RecoveryDraft` | Capture ID/revision, draft revision, selected observation IDs/revisions, a separate existing-editor color-correction overlay/revision if present, photo-to-logical-face mapping and absolute quarter turns (0..3), selected candidate ID and search revision, canonical transform and its convention/version. Six selected observations form a bijection onto F/R/B/L/U/D when complete; a partial mapping remains a draft. Retakes append new observation identities and supersession links; they do not overwrite historical observations. |
| `CandidateEvidence` | Candidate feasibility (`passesAvailableChecks`, `failsAvailableChecks`, `unknown`) with named checks, profile, method/revision and issues; independent reachability evidence (`verified`, `disproved`, `unknown`) with certificate/method and assumptions; independent search coverage (`completeForDeclaredDomain`, `truncated`, `cancelled`, `unknown`) with domain, limits and retained count. A retained singleton is not proof of uniqueness; an empty truncated search is not proof of impossibility. |
| `ConfirmedState` | Application-owned checked assembly, source mapping and canonical transform, referenced draft/observation revisions and validation evidence, created only by explicit Use. A canonical definition/state projection requires an established identity mapping and successful existing Core checks; retain `unknown` reachability when no complete method or certificate applies. Do not fabricate IDs from color equality. |
| `CaptureRecoveryEnvelope` | Schema name/revision, capture identity/revision, puzzle size, color-profile identity/revision and definition/profile references when known, immutable observations and asset/provenance manifest, optional draft, candidate evidence and optional confirmed reference/projection. Confirmed and unconfirmed material have distinct fields; an envelope is not a valid wire cube. |

The photo transform maps recorded image coordinates to the immutable sampled
grid; the mapping's quarter turns map that grid onto a logical face. The canonical
transform maps the assembled capture frame into the canonical puzzle frame and
must name one of the 24 proper cube rotations using a pinned convention; it
cannot contain a reflection. Camera orbit and display transforms are separate
presentation data. A mirrored live view or photo inspector never mirrors grid
values to produce a puzzle state or changes recorded historical mirror mode.

The proposed application port has five operations: `inspect` reports guide
consistency and supported size/profile/check/search capabilities; explicit
`findMatchingCube` requests constrained whole-face permutations and quarter
turns using the existing search where applicable; `select` updates only a draft;
`cancel` invalidates pending work and discards the unconfirmed transaction;
`use` atomically commits the exact displayed draft after rechecking revisions,
source identity, the complete mapping and available legality checks. Every
request/result names capture, observation, draft and search revisions as
applicable. A retake, changed draft, new search or changed definition/profile
invalidates affected candidates. A stale candidate returns a conflict and cannot
commit. Failed validation, cancellation or a late result leaves the previously
confirmed state unchanged. Cancel restores the prior approval candidate, page
and notices without reranking; an initial recovery dialog simply closes.

Capability negotiation states supported sizes, odd-center constraints,
even-face assignment, named feasibility checks, reachability methods/profiles and
search domain/limits independently. An unsupported size or method is explicit;
calling a candidate "matching" never upgrades its validation evidence.
The proposed envelope uses closed records: unknown fields or unsupported schema,
transform or method revisions block interpretation/commit with a diagnostic;
original imported bytes may be retained for raw reexport without treating them
as understood. Asset references resolve to pinned original bytes and rights
metadata; missing assets block photo/visual acceptance and are not replaced by
invented photos. Import validates references and revisions before changing any
current draft or confirmed state.

Backward compatibility for CubeAssembler `capture.faceRecovery` v1, fixture
metadata, raw export/reimport and any future envelope export is **open**: specify
lossless mappings and version negotiation before implementation. Do not silently
upgrade v1/v2 guide history to v3, reuse the current Mirror setting as historical
evidence, or promise that an older importer understands the envelope. A partial
or invalid capture must remain an application envelope/raw export; it cannot be
emitted as a valid `puzlwerk.state` or substituted for the last confirmed wire
projection. Existing wire-v1 and appearance-v1 remain unchanged authorities for
that projection.

### Proposed conflict workflow and acceptance gate

On a guide conflict, keep the recorded guide claim and show an explicit
**Find a matching cube** action. Only that action may search beyond the failed
guide-derived seed. Search considers whole captured faces and quarter turns,
with fixed-center constraints for odd sizes and a face bijection for even sizes;
it does not offer a free face/sticker editor or change recognized colors. Review
feasible retained choices progressively in Front → Right → Back → Left → Up →
Down order, skipping resolved faces; symmetric choices must not invent ambiguity
or erase distinct source identities. Net and 3D preview use the same draft.
Photos appear on demand through explicit source links. Returning from the
existing detected-color editor restores recovery context; any corrections are
separate draft edits, never changes to raw images or recognized source grids,
and invalidate affected search evidence. **Use this cube** is a separate explicit
commit; previewing or answering a face cannot commit automatically.

The [capture-recovery acceptance case](acceptance-matrix.md#cubeassembler-capture-recovery-proposal)
keeps all runtime, parity and owner results unestablished until exercised. This
specification authorizes neither implementation nor activation, deployment or
consumer replacement.

### Authorized WI1/WI2 implementation boundary (2026-11-16)

The owner explicitly started WI1 and WI2 with the instruction “logic in rescript
puzlwerk”. This authorizes the bounded ReScript photo-identity/mapping and explicit
constrained-search/wizard domain slices, their private package and thin
CubeAssembler integration. It does not approve the proposed full exchange format,
consumer viewer migration, publication, deployment or merge.

The first local slice is `core/res/PwCapture.resi`, with compiler-generated
`PwCapture.gen.ts`, distributed through private `@puzlwerk/capture-recovery`.
Capture snapshots and candidate handles are distinct from `PwCodec.state`.
The supported capture/mapping range is N=2..8, preserving existing CubeAssembler
recovery scope; this does not certify complete reachability above N=3.
Candidates require explicit canonical source-ID mappings. `createCandidateFromSlots`
resolves producer-supplied slots against the immutable snapshot, never colors.
`canonicalTransform` and the optional legacy transform index record provenance;
they are not applied again to a mapping already in the canonical frame. Missing
provenance stays unknown. Only an additional proper display matrix passed to
`projectMapping` changes its presentation. Unknown association returns no photo.
`replaceObservation` assigns core-owned revisions and retains prior raw source
records; `invalidateCapture` invalidates drafts without altering observations.
No photo bytes, recognition or color-correction engine is implemented here.

The core license decision (EUPL-1.2 on 2026-11-12, `EUPL-1.2 OR AGPL-3.0-or-later` on 2026-11-17) is SM11 in `specs/006-shared-model/plan.md`.
Ported CubeAssembler decision logic retains its pinned MIT notice. Private local
build/pack verification does not decide production licensing with the MIT
application. The package includes its compiled import closure, generated types,
ReScript source and source/runtime hashes; no solver or viewer is included.
The transitional feasibility checker reuses named existing CubeAssembler
ReScript checks with source revision and scope. It does not make those checks a
PuzlWerk reachability proof. Future retirement of that bridge requires separately
authorized canonical identity/conformance mappings and equivalent Core checks;
no second permanent puzzle engine is introduced.

The additive local `PwRecovery.resi` slice is exposed as the `Recovery` namespace
of private package version 0.2.0. `findMatchingCube` requires that explicit action,
complete current observations, finite evaluation/retention budgets and odd-size
center-color constraints. It enumerates whole-face bijections and quarter turns;
source bindings remain distinct even for identical grids. A truncated retained
set does not prove uniqueness or impossibility. No symmetry reduction discards
photo bindings. The legacy deterministic guide/unknownness guard stays in the
application; this separate operation never starts itself as fallback.

Optional `reviewedGrids` bind the existing application review/calibration result
to the current capture revision and all six photo IDs. They are snapshotted;
raw observations are unchanged. Center constraints, checker projections and
wizard previews consume those reviewed grids. There is no color editor or color
mutation in this domain package. Existing application edits invalidate the
capture revision before a new search. The wizard asks unresolved canonical
F/R/B/L/U/D choices and preserves source ambiguity; Back and Cancel operate on
revision-checked pure review values. Use rechecks the exact current capture,
selected retained ID and named feasibility checker. The caller atomically
installs the returned closed review and confirmation with its current UI state;
reusing a superseded pure handle is not an external commit. Cancel changes no
previously confirmed application cube and the app restores its approval context.

Private package version 0.3.0 adds revision-checked `resumeReview` and
`backAndResumeReview` for a confirmed color-editor return. Only explicit manual
placements become pre-enumeration constraints; automatically resolved faces stay
automatic. Back removes the last manual constraint before a new bounded search,
including choices outside the unconstrained retention prefix. Retired source IDs
produce explicit conflicts without slot rebinding. Empty capped pools and
inconclusive checks remain pending; complete declared-domain rejection is distinct
from full NxN impossibility. Prefix-node work has its own finite reported limit
alongside assessment counts. Editor Cancel retains the previous review unchanged.
The generated interface and [package reference](../../packages/capture-recovery/README.md)
define the operation actions, new search IDs and atomic caller installation.

A checker pass must name its source revision and scope. Optional wire evidence
is decoded and assessed by `PwCodec`/`PwValidate`; `scope=providedWireOnly` and the
explicit profile travel with its result. It proves no capture-to-wire identity
relation. No wire document is synthesized from capture colors. Invalid or
Core-disproved supplied wire states cannot be committed. Other NxN reachability
stays unknown without an applicable complete method. Full envelope decoding,
backward-compatible export, device behavior and application acceptance remain
open. The informational recovery route remains unimplemented and blocked.

Regression coverage is in `test/capture-identity.test.mjs` and
`test/capture-recovery.test.mjs`; `npm run check` runs these through the existing
Node test glob. The existing `npm run test:package` also runs
`scripts/verify-capture-package.mjs` for isolated runtime/types and extracted
source rebuild. These tests do not establish browser or physical-cube acceptance.
