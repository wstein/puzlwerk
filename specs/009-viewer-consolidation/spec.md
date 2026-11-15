# Viewer consolidation proposal

Status: proposal for owner review. This specifies an interface candidate and a pilot plan; it approves no package, implementation, migration, publication, license, or ADR. [Cubistry #111](https://github.com/wstein/cubistry/issues/111) is the source proposal; this document makes its boundaries reviewable without replacing its authority. The [inventory](inventory.md) records the existing implementations and [license brief](license-package-proposal.md) records unresolved provenance and distribution questions.

## Objective and acceptance

A separately packaged viewer can present application-supplied cube projections and transitions without parsing notation or owning puzzle state. Core remains rendering independent; application adapters translate core state and move ASTs into viewer data. Scene geometry, camera, orbit, lighting, interpolation and rendering belong to the viewer; scan, device camera, validation, move input, solver, print and application UI remain with their applications. A first pilot must meet the gates below before any consumer replacement. The contracts in [wire-v1](../001-core-foundation/contracts/wire-v1.md) and [appearance-v1](../001-core-foundation/contracts/appearance-v1.md) retain their existing authority and meanings. Their IDs and appearance data are inputs to an application adapter, not a new physical-state serialization.

## Candidate contract

These TypeScript declarations are a design proposal, not implemented or a promise of final package API. All arrays and values are snapshots: a caller must not mutate them while in use. Coordinates are right-handed, in one adapter-selected scene frame, with +X right, +Y up, +Z front; distances share one unit. Quaternions are `[x,y,z,w]`, finite and normalized; positions, axes and angles are finite. IDs are nonempty and unique within a projection, stable across transition endpoints. These rendering numbers do not define canonical physical identities, frames, legality or state. The adapter maps canonical physical poses and appearance to this frame and validates legal transitions before calling the viewer.

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
  readonly pivot: Vec3;
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

Creation reports `Unavailable` if a context cannot be created. Asset resolution failure reports `UnresolvedAsset`; context loss reports `ContextLost` and leaves recovery to the application, which may dispose and recreate. Errors contain no partial state commit: an invalid or failed operation retains the last successfully presented projection. `setProjection` and `transition` are exclusive; a concurrent request returns `Busy`. A transition starts only if `from` equals the currently presented projection by IDs and values; otherwise it is `InvalidTransition`. On completion the viewer presents `to`; application/core state remains caller-owned throughout. `cancel` is idempotent, interrupts an active transition and pending asset work, restores its `from` projection and resolves that operation with `Cancelled`; it does not commit a target. `dispose` is idempotent, cancels pending work, removes listeners and viewer-owned resources; later operations return `Disposed`. A late asynchronous result cannot render or change state after cancellation/disposal. The application owns the host and asset source and keeps them valid until disposal; the viewer owns its canvas, context resources, render scheduling and listeners.

`invalidate` requests a coalesced render after external presentation changes; projection, camera/orbit, resize and transition changes also invalidate. The viewer must not continuously draw while idle, except during active animation or explicitly enabled motion. Visibility and context loss suspend drawing. A future pilot must define resizing and external camera controls without granting them ownership of puzzle state. The real-time clock is monotonic and viewer-owned for an accepted duration-based animation; it must not accumulate hidden-tab time into a jump unless an owner-approved timing policy explicitly requires it. Cancellation and disposal stop scheduled frames. No caller may advance canonical state based solely on an interpolated frame.

## Timing and easing decision

The owner has not decided timing or easing. Alternatives: (1) application supplies duration and easing while viewer schedules frames; (2) application supplies normalized progress from its clock while viewer renders; (3) viewer owns duration, easing and clock with application-selected presets. Recommend option 1 for an initial pilot: callers retain synchronization and user preference policy, viewer retains interpolation and frame scheduling. Cost: a stable easing representation and rules for reduced motion, pause/visibility, cancellation and coordinated UI commits must be agreed. Option 2 gives the application direct synchronization but adds a per-frame interface and scheduling burden; option 3 is simpler for clients but makes cross-view synchronization harder. The declarations above intentionally omit timing parameters until the owner selects a policy; they are incomplete for implementation. Reduced motion and completion semantics must be decided alongside the timing policy.

## VC4: isolated extraction pilot

VC4 is a separately authorized PuzlWerk extraction pilot with one fixed scene and one animated turn. Existing applications and their viewers remain unchanged; the pilot replaces no consumer. Before a go: select the source files and package license, complete the file-level provenance and compatibility assessment in the [license brief](license-package-proposal.md), decide timing/easing and asset/render details, approve this interface and obtain an explicit owner implementation-phase go. Stop if any prerequisite is unresolved.

The focused pilot checks compare the fixed reference scene's frame and sticker up direction, and the animated turn's axis and signed angle against that reference, including the direction ambiguity of 180°, 270° and 360° rotations. Check cancellation, asset resolution and disposal, including late asset completion. Record commands and results; results are **UNKNOWN until run**. Stop on a failed check or an unresolved provenance, contract or timing decision. Scan workflows and consumer parity are not pilot acceptance criteria.

## VC5: consumer migrations

Each consumer migration requires a separate owner go, in the intended order CubeAssembler, Cubistry, then CubeLab. The CubeAssembler migration must preserve 2×2–7×7 scan-to-view, validation, colors, view controls, turns, gestures, cancellation and error handling. Its acceptance includes browser and visual parity, owner live desktop and mobile touch acceptance, and rollback to the existing viewer without changing canonical scan/state data. Record actual devices, browsers, commands and results; parity remains **UNKNOWN until run**. Agree performance targets from measured before/after startup, frame time, idle rendering, memory and responsiveness; baseline and results are **UNKNOWN until measured**. Stop on failed parity or live acceptance, unacceptable regression or unresolved mapping; retain the existing viewer until the owner resolves the issue. Subsequent consumers need their own applicable parity, live acceptance and rollback criteria and separate go.

No baseline, demo, test suite, package or implementation is created by this proposal.
