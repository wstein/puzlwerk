# Private capture recovery package

This is a local EUPL-1.2 package, not an npm publication or a CubeAssembler
production license decision. The application supplies camera/recognition input;
ReScript owns source-identity mapping. Candidate canonical mappings are evidence,
never an identification from equal colors. The root specification records scope.

`npm run build --workspace @puzlwerk/capture-recovery` builds compiler-generated
JavaScript and TypeScript declarations. `node scripts/verify-capture-package.mjs`
packs and installs the package in an isolated consumer, checks the generated
types, then recompiles the extracted source and compares compiled runtime bytes.

The tarball includes `source/`, including ReScript type dependencies erased from
runtime JavaScript, and a minimal `rescript.json`. With ReScript 12.3.1 available,
run `rescript build` in the extracted package root to regenerate the modules in
`source/`. No application or sibling-repository source is required. Install the
pinned `@rescript/runtime` dependency to execute them. `provenance.json` identifies
the actual source commit (or explicitly marks dirty input), each source hash,
compiled runtime hashes and compiler version. This is not a promise that an
uncommitted prototype is reproduced by its base commit.

Version 0.2.0 adds the compiler-generated `Recovery` namespace. Its explicit
bounded search and pure revision-checked wizard use the existing application's
named feasibility checker as a temporary bridge. Optional Core wire assessments
report only the supplied wire state and profile, not capture identity. Reviewed
color grids are separate revision-bound inputs and never rewrite raw observations.
Use returns an atomic review/confirmation value for the caller to install; the
caller owns external state, stale-event rejection and restoration on cancel.

Version 0.3.0 adds `Recovery.resumeReview` and `backAndResumeReview` for an
explicitly confirmed color-editor return. Their request actions are the respective
function names, with a new `searchId` and the expected previous review revision.
They carry only manually selected placements into the new enumeration before
candidate retention. Back removes the last manual constraint before searching;
ordinary `back` rejects a constraint baked into a resumed session.
`canBack` queries whether the open review has a manual decision to undo. Editor Cancel
keeps the previous review instead of calling either operation.

The result reports copied `carriedDecisions`, explicit retired-source or joint
constraint `conflicts`, and `status` (`candidatesAvailable`, `pending`, `conflicts`).
A capped empty pool or inconclusive checker remains pending. Complete declared-domain
rejection does not prove full NxN unreachability. A retake never rebinds an old
photo ID by slot. The summary separates full-candidate `evaluated` assessments,
`inconclusive` assessments, and prefix-node `workVisited` / `workLimit`. The latter
limit is `min(700064, 7 * maxEvaluated + 64)` after validating the assessment budget;
a work-limit stop also marks coverage truncated. Callers atomically install the
returned review/session and reject stale worker results against their current
capture context; pure values do not own external application state.
