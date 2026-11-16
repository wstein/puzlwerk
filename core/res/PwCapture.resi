// EUPL-1.2; canonical photo mapping, never inferred from color similarity.
@genType type face = | @as("U") U | @as("R") R | @as("F") F | @as("D") D | @as("L") L | @as("B") B
@genType type grid = array<array<string>>
@genType
type observation = {
  photoId: string,
  slot: string,
  revision: int,
  sourceGrid: grid,
  sourceHash: string,
  guideProtocol: option<string>,
  guideStep: option<int>,
  mirrored: option<bool>,
}
@genType
type input = {captureId: string, revision: int, size: int, observations: array<observation>}
@genType
type placement = {photoId: string, observationRevision: int, target: face, quarterTurns: int}
// canonicalTransform is provenance only: the mapping already targets the canonical frame.
@genType type legacyTransform = {convention: string, index: int}
@genType type slotPlacement = {slot: string, target: face, quarterTurns: int}
@genType
type slotCandidateInput = {
  candidateId: string,
  captureRevision: int,
  mappingFrame: string,
  canonicalTransform: option<array<int>>,
  legacyTransform: option<legacyTransform>,
  mapping: array<slotPlacement>,
}
@genType
type candidateInput = {
  candidateId: string,
  captureRevision: int,
  mappingFrame: string,
  canonicalTransform: option<array<int>>,
  legacyTransform: option<legacyTransform>,
  mapping: array<placement>,
}
@genType
type projection = {
  photoId: string,
  slot: string,
  observationRevision: int,
  target: face,
  quarterTurns: int,
  sourceHash: string,
  grid: grid,
}
@genType @tag("ok")
type outcome<'a> = | @as(true) Accepted({value: 'a}) | @as(false) Rejected({error: string})
@genType type capture
@genType type candidate
@genType let createCapture: input => outcome<capture>
@genType let snapshot: capture => input
@genType let createCandidate: (capture, candidateInput) => outcome<candidate>
@genType let describeCandidate: candidate => candidateInput
// Absent, malformed, stale or unrelated candidate evidence gives unknown (undefined).
@genType let photoForFace: (capture, option<candidate>, face) => option<projection>
@genType let projectMapping: (capture, candidate, array<int>) => outcome<array<projection>>
@genType let identityTransform: unit => array<int>

// Explicit producer slot evidence is resolved against this snapshot, never against colors.
@genType let createCandidateFromSlots: (capture, slotCandidateInput) => outcome<candidate>

// Core owns revision increments. Retakes require a new photoId; supplied observation revision is ignored.
@genType let replaceObservation: (capture, int, observation) => outcome<capture>
@genType let invalidateCapture: (capture, int) => outcome<capture>
@genType let observationHistory: capture => array<observation>

@genType let synchronizeObservations: (capture, int, array<observation>) => outcome<capture>
@genType let verifySourceHash: (capture, string, string) => bool

// Internal shared 2D projection primitive; no new application binding.
let rotateGrid: (grid, int) => grid
