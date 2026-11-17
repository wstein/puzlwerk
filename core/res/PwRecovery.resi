// SPDX-License-Identifier: EUPL-1.2 OR AGPL-3.0-or-later
// EUPL-1.2; pure application recovery transactions, not a physical puzzle state.
@genType type center = {target: PwCapture.face, color: string}
@genType type reviewedGrid = {photoId: string, grid: PwCapture.grid}
@genType type reviewed = {captureRevision: int, grids: array<reviewedGrid>}
@genType
type request = {
  action: string,
  searchId: string,
  maxEvaluated: int,
  maxCandidates: int,
  centers: array<center>,
  reviewedGrids: option<reviewed>,
}
@genType
type check = {
  status: string,
  checkerId: string,
  sourceRevision: string,
  scope: string,
  issues: array<string>,
}
@genType type wireInput = {definitionJSON: string, stateJSON: string, faceTurnsAssumed: bool}
@genType type assessment = {feasibility: check, wire: option<wireInput>}
@genType
type wireReport = {
  structural: bool,
  reachability: string,
  method: string,
  profile: string,
  scope: string,
}
@genType
type retained = {
  candidate: PwCapture.candidateInput,
  feasibility: check,
  wireReport: option<wireReport>,
}
@genType
type summary = {
  searchId: string,
  evaluated: int,
  workVisited: int,
  workLimit: int,
  inconclusive: int,
  coverage: string,
  truncated: bool,
  candidates: array<retained>,
}
@genType
type choice = {placement: PwCapture.placement, grid: PwCapture.grid, candidateIds: array<string>}
@genType type session
@genType type review
@genType
type confirmation = {
  candidate: PwCapture.candidate,
  projection: array<PwCapture.projection>,
  feasibility: check,
  wireReport: option<wireReport>,
}
@genType type committed = {review: review, confirmed: confirmation}
@genType let assessWire: wireInput => wireReport
// Only action="findMatchingCube" enters the bounded whole-face/quarter-turn domain.
// The transitional checker must name its source and scope; its pass is never reachability evidence.
@genType
let findMatchingCube: (
  PwCapture.capture,
  request,
  (PwCapture.candidateInput, array<PwCapture.projection>) => assessment,
) => PwCapture.outcome<session>
@genType let describeSession: session => summary
@genType let beginReview: session => review
@genType let revision: review => int
// Whether a manual undo is available; pre-enumeration constraints require backAndResumeReview.
@genType let canBack: review => bool
@genType let nextTarget: review => option<PwCapture.face>
@genType let choices: review => array<choice>
@genType let select: (review, int, PwCapture.placement) => PwCapture.outcome<review>
// Back rejects a pre-enumeration constraint; use backAndResumeReview to reopen that domain.
@genType let back: (review, int) => PwCapture.outcome<review>
@genType let cancel: (review, int) => PwCapture.outcome<review>
@genType let selectedCandidate: review => option<PwCapture.candidateInput>
// Pure CAS-style transaction: caller installs the returned review/confirmation together.
@genType
let useCandidate: (
  PwCapture.capture,
  review,
  int,
  string,
  (PwCapture.candidateInput, array<PwCapture.projection>) => assessment,
) => PwCapture.outcome<committed>

@genType let projectCandidate: (session, string) => option<array<PwCapture.projection>>

// Resume only after confirmed editor OK. Cancel retains the previous review unchanged.
// Only manual decisions are carried before bounded enumeration/retention; Back removes the last.
// A new searchId, action matching the operation, and expected previous revision are required.
// Conflicts describe the declared domain, never full NxN impossibility.
@genType type resumeConflict = {decision: option<PwCapture.placement>, reason: string}
@genType
type resumed = {
  session: session,
  review: review,
  carriedDecisions: array<PwCapture.placement>,
  conflicts: array<resumeConflict>,
  status: string,
}
@genType
let resumeReview: (
  PwCapture.capture,
  review,
  int,
  request,
  (PwCapture.candidateInput, array<PwCapture.projection>) => assessment,
) => PwCapture.outcome<resumed>
@genType
let backAndResumeReview: (
  PwCapture.capture,
  review,
  int,
  request,
  (PwCapture.candidateInput, array<PwCapture.projection>) => assessment,
) => PwCapture.outcome<resumed>
