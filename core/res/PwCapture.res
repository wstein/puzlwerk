// SPDX-License-Identifier: EUPL-1.2
// Source identity is evidence supplied by the candidate producer, not inferred from pixels/colors.
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
type capture = {data: input, fingerprint: string, history: array<observation>}
type candidate = {data: candidateInput, captureId: string, fingerprint: string}
let faces: array<face> = [U, R, F, D, L, B]
let copyGrid = (grid: grid) => grid->Array.map(Array.copy)
let copyObservation = (photo: observation) => {...photo, sourceGrid: copyGrid(photo.sourceGrid)}
let snapshot = (capture: capture) => {
  ...capture.data,
  observations: capture.data.observations->Array.map(copyObservation),
}
let describeCandidate = (candidate: candidate) => {
  ...candidate.data,
  canonicalTransform: candidate.data.canonicalTransform->Option.map(Array.copy),
  legacyTransform: candidate.data.legacyTransform->Option.map(value => {
    convention: value.convention,
    index: value.index,
  }),
  mapping: candidate.data.mapping->Array.map((entry: placement) => {
    photoId: entry.photoId,
    observationRevision: entry.observationRevision,
    target: entry.target,
    quarterTurns: entry.quarterTurns,
  }),
}
let integer = n => {
  let f = Int.toFloat(n)
  Float.isFinite(f) && Math.floor(f) == f
}
let nonnegative = n => integer(n) && n >= 0
let identityTransform = () => PwOrientation.toArray(PwOrientation.identity)
let createCapture = (data: input) => {
  if (
    data.captureId == "" ||
    !nonnegative(data.revision) ||
    !integer(data.size) ||
    data.size < 2 ||
    data.size > 8
  ) {
    Rejected({error: "InvalidCapture"})
  } else if (
    Array.length(data.observations) > 6 ||
      data.observations->Array.some(photo =>
        photo.photoId == "" ||
        photo.slot == "" ||
        !nonnegative(photo.revision) ||
        data.observations
        ->Array.filter(other => other.photoId == photo.photoId || other.slot == photo.slot)
        ->Array.length != 1 ||
        Array.length(photo.sourceGrid) != data.size ||
        photo.sourceGrid->Array.some(row =>
          Array.length(row) != data.size || row->Array.some(color => color == "")
        )
      )
  ) {
    Rejected({error: "InvalidObservation"})
  } else {
    let data = {...data, observations: data.observations->Array.map(copyObservation)}
    // Include all immutable evidence, including source IDs, revisions and guide history.
    let fingerprint = JSON.stringifyAny(data)->Option.getOrThrow
    Accepted({value: {data, fingerprint, history: data.observations->Array.map(copyObservation)}})
  }
}
let createCandidate = (capture: capture, data: candidateInput) => {
  if (
    data.candidateId == "" ||
    data.captureRevision != capture.data.revision ||
    data.mappingFrame != "canonical"
  ) {
    Rejected({error: "StaleOrUnprovenCandidate"})
  } else if (
    data.canonicalTransform->Option.mapOr(false, m => PwOrientation.make(m)->Result.isError) ||
      data.legacyTransform->Option.mapOr(false, value =>
        value.convention != "cube-geometry-orientations/v1" ||
        !integer(value.index) ||
        value.index < 0 ||
        value.index > 23
      )
  ) {
    Rejected({error: "InvalidCanonicalTransform"})
  } else if (
    Array.length(capture.data.observations) != 6 ||
    Array.length(data.mapping) != 6 ||
    faces->Array.some(target =>
      data.mapping->Array.filter(entry => entry.target == target)->Array.length != 1
    ) ||
    data.mapping->Array.some(entry =>
      !integer(entry.quarterTurns) ||
      entry.quarterTurns < 0 ||
      entry.quarterTurns > 3 ||
      data.mapping->Array.filter(other => other.photoId == entry.photoId)->Array.length != 1 ||
      !(
        capture.data.observations->Array.some(photo =>
          photo.photoId == entry.photoId && photo.revision == entry.observationRevision
        )
      )
    )
  ) {
    Rejected({error: "InvalidBijection"})
  } else {
    let data = {
      ...data,
      canonicalTransform: data.canonicalTransform->Option.map(Array.copy),
      legacyTransform: data.legacyTransform->Option.map(value => {
        convention: value.convention,
        index: value.index,
      }),
      mapping: data.mapping->Array.map((entry: placement) => {
        photoId: entry.photoId,
        observationRevision: entry.observationRevision,
        target: entry.target,
        quarterTurns: entry.quarterTurns,
      }),
    }
    Accepted({value: {data, captureId: capture.data.captureId, fingerprint: capture.fingerprint}})
  }
}
let normal = (face): PwShell.vec =>
  switch face {
  | U => {x: 0, y: 1, z: 0}
  | R => {x: 1, y: 0, z: 0}
  | F => {x: 0, y: 0, z: 1}
  | D => {x: 0, y: -1, z: 0}
  | L => {x: -1, y: 0, z: 0}
  | B => {x: 0, y: 0, z: -1}
  }
let up = (face): PwShell.vec =>
  switch face {
  | U => {x: 0, y: 0, z: -1}
  | D => {x: 0, y: 0, z: 1}
  | _ => {x: 0, y: 1, z: 0}
  }
let cross = (a: PwShell.vec, b: PwShell.vec): PwShell.vec => {
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
}
let equal = (a: PwShell.vec, b: PwShell.vec) => a.x == b.x && a.y == b.y && a.z == b.z
let rec turnedUp = (v, n, turns) => turns == 0 ? v : turnedUp(cross(v, n), n, turns - 1)
let rotateGrid = (grid: grid, turns) => {
  let n = Array.length(grid)
  Array.fromInitializer(~length=n, row =>
    Array.fromInitializer(~length=n, col =>
      switch turns {
      | 0 => grid->Array.getUnsafe(row)->Array.getUnsafe(col)
      | 1 => grid->Array.getUnsafe(n - 1 - col)->Array.getUnsafe(row)
      | 2 => grid->Array.getUnsafe(n - 1 - row)->Array.getUnsafe(n - 1 - col)
      | _ => grid->Array.getUnsafe(col)->Array.getUnsafe(n - 1 - row)
      }
    )
  )
}
let projectMapping = (capture: capture, candidate: candidate, transform) => {
  if capture.data.captureId != candidate.captureId || capture.fingerprint != candidate.fingerprint {
    Rejected({error: "StaleOrUnprovenCandidate"})
  } else {
    switch PwOrientation.make(transform) {
    | Error(_) => Rejected({error: "InvalidDisplayTransform"})
    | Ok(rotation) =>
      Accepted({
        value: candidate.data.mapping->Array.map(entry => {
          let source =
            capture.data.observations
            ->Array.find(photo => photo.photoId == entry.photoId)
            ->Option.getOrThrow
          let targetNormal = PwOrientation.apply(rotation, normal(entry.target))
          let target =
            faces->Array.find(face => equal(normal(face), targetNormal))->Option.getOrThrow
          let targetUp = PwOrientation.apply(
            rotation,
            turnedUp(up(entry.target), normal(entry.target), entry.quarterTurns),
          )
          let quarterTurns =
            [0, 1, 2, 3]
            ->Array.find(q => equal(turnedUp(up(target), normal(target), q), targetUp))
            ->Option.getOrThrow
          {
            photoId: source.photoId,
            slot: source.slot,
            observationRevision: source.revision,
            target,
            quarterTurns,
            sourceHash: source.sourceHash,
            grid: rotateGrid(source.sourceGrid, quarterTurns),
          }
        }),
      })
    }
  }
}
let photoForFace = (capture, candidate, face) =>
  switch candidate {
  | None => None
  | Some(candidate) =>
    switch projectMapping(capture, candidate, identityTransform()) {
    | Rejected(_) => None
    | Accepted({value}) => value->Array.find(photo => photo.target == face)
    }
  }

let createCandidateFromSlots = (capture: capture, data: slotCandidateInput) => {
  let mapping = data.mapping->Array.filterMap(entry =>
    capture.data.observations
    ->Array.find(photo => photo.slot == entry.slot)
    ->Option.map(photo => {
      photoId: photo.photoId,
      observationRevision: photo.revision,
      target: entry.target,
      quarterTurns: entry.quarterTurns,
    })
  )
  if Array.length(mapping) != Array.length(data.mapping) {
    Rejected({error: "UnknownSourceSlot"})
  } else {
    createCandidate(
      capture,
      {
        candidateId: data.candidateId,
        captureRevision: data.captureRevision,
        mappingFrame: data.mappingFrame,
        canonicalTransform: data.canonicalTransform,
        legacyTransform: data.legacyTransform,
        mapping,
      },
    )
  }
}

let observationHistory = (capture: capture) => capture.history->Array.map(copyObservation)
let replaceObservation = (capture: capture, expectedRevision, photo: observation) => {
  if expectedRevision != capture.data.revision {
    Rejected({error: "StaleCaptureRevision"})
  } else if capture.history->Array.some(old => old.photoId == photo.photoId) {
    Rejected({error: "PhotoIdentityReused"})
  } else {
    let revision =
      capture.data.observations
      ->Array.find(old => old.slot == photo.slot)
      ->Option.mapOr(0, old => old.revision + 1)
    let photo = {...photo, revision}
    let data = {
      ...capture.data,
      revision: capture.data.revision + 1,
      observations: [
        ...capture.data.observations->Array.filter(old => old.slot != photo.slot),
        photo,
      ],
    }
    switch createCapture(data) {
    | Rejected(error) => Rejected(error)
    | Accepted({value}) =>
      Accepted({value: {...value, history: [...capture.history, copyObservation(photo)]}})
    }
  }
}
let invalidateCapture = (capture: capture, expectedRevision) => {
  if expectedRevision != capture.data.revision {
    Rejected({error: "StaleCaptureRevision"})
  } else {
    switch createCapture({...capture.data, revision: capture.data.revision + 1}) {
    | Rejected(error) => Rejected(error)
    | Accepted({value}) => Accepted({value: {...value, history: capture.history}})
    }
  }
}

let sameObservation = (a: observation, b: observation) =>
  a.photoId == b.photoId &&
  a.slot == b.slot &&
  a.sourceHash == b.sourceHash &&
  a.guideProtocol == b.guideProtocol &&
  a.guideStep == b.guideStep &&
  a.mirrored == b.mirrored &&
  JSON.stringifyAny(a.sourceGrid) == JSON.stringifyAny(b.sourceGrid)
let synchronizeObservations = (capture: capture, expectedRevision, photos: array<observation>) => {
  if expectedRevision != capture.data.revision {
    Rejected({error: "StaleCaptureRevision"})
  } else if (
    photos->Array.some(photo =>
      capture.history->Array.some(old =>
        old.photoId == photo.photoId && !sameObservation(old, photo)
      )
    )
  ) {
    Rejected({error: "ImmutableObservationChanged"})
  } else if (
    photos->Array.some(photo =>
      capture.history->Array.some(old => old.photoId == photo.photoId) &&
        !(capture.data.observations->Array.some(old => old.photoId == photo.photoId))
    )
  ) {
    Rejected({error: "PhotoIdentityReused"})
  } else {
    let observations = photos->Array.map(photo =>
      switch capture.data.observations->Array.find(old => old.photoId == photo.photoId) {
      | Some(old) => copyObservation(old)
      | None => {
          ...copyObservation(photo),
          revision: capture.history
          ->Array.filter(old => old.slot == photo.slot)
          ->Array.reduce(-1, (n, old) => n > old.revision ? n : old.revision) + 1,
        }
      }
    )
    let changed =
      Array.length(observations) != Array.length(capture.data.observations) ||
        observations->Array.some(photo =>
          !(capture.data.observations->Array.some(old => old.photoId == photo.photoId))
        )
    if !changed {
      Accepted({value: capture})
    } else {
      switch createCapture({
        ...capture.data,
        observations,
        revision: capture.data.revision + 1,
      }) {
      | Rejected(error) => Rejected(error)
      | Accepted({value}) =>
        Accepted({
          value: {
            ...value,
            history: [
              ...capture.history,
              ...observations->Array.filter(photo =>
                !(capture.history->Array.some(old => old.photoId == photo.photoId))
              ),
            ],
          },
        })
      }
    }
  }
}
let verifySourceHash = (capture: capture, photoId, actualHash) =>
  String.length(actualHash) == 64 &&
  actualHash->String.split("")->Array.every(c => String.includes("0123456789abcdef", c)) &&
  capture.data.observations->Array.some(photo =>
    photo.photoId == photoId && photo.sourceHash == actualHash
  )
