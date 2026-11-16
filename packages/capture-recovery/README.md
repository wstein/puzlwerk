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
