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
