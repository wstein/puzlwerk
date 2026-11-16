// SPDX-License-Identifier: EUPL-1.2
// Wizard filtering adapts CubeAssembler SpatialOrientationWizard.res at 91fc2144; MIT notice retained.
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
  coverage: string,
  truncated: bool,
  candidates: array<retained>,
}
@genType
type choice = {placement: PwCapture.placement, grid: PwCapture.grid, candidateIds: array<string>}
type item = {
  value: PwCapture.candidate,
  projection: array<PwCapture.projection>,
  feasibility: check,
  wireReport: option<wireReport>,
}
type session = {
  capture: PwCapture.capture,
  searchId: string,
  evaluated: int,
  truncated: bool,
  candidates: array<item>,
  reviewedGrids: option<reviewed>,
}
type review = {session: session, revision: int, decisions: array<PwCapture.placement>, closed: bool}
@genType
type confirmation = {
  candidate: PwCapture.candidate,
  projection: array<PwCapture.projection>,
  feasibility: check,
  wireReport: option<wireReport>,
}
@genType type committed = {review: review, confirmed: confirmation}
let faceOrder: array<PwCapture.face> = [U, R, F, D, L, B]
let questionOrder: array<PwCapture.face> = [F, R, B, L, U, D]
let integer = n => {
  let f = Int.toFloat(n)
  Float.isFinite(f) && Math.floor(f) == f
}
let copyCheck = (check: check) => {...check, issues: Array.copy(check.issues)}
let assessWire = (input: wireInput): wireReport => {
  let report = (structural, reachability, method) => {
    structural,
    reachability,
    method,
    profile: input.faceTurnsAssumed ? "faceTurnsAssumed" : "definitionPolicy",
    scope: "providedWireOnly",
  }
  switch PwCodec.decodeDefinition(input.definitionJSON) {
  | Error(_) => report(false, "unknown", "structurally-invalid-definition")
  | Ok(definition) =>
    switch PwCodec.decodeState(definition, input.stateJSON) {
    | Error(_) => report(false, "unknown", "structurally-invalid-state")
    | Ok(state) =>
      let assessed = input.faceTurnsAssumed
        ? PwValidate.assessAssuming(definition, state, Some(PwValidate.FaceTurns), None)
        : PwValidate.assess(definition, state, None, None)
      switch assessed.reachability {
      | VerifiedByReplay(_) => report(true, "verified", "core-replay")
      | VerifiedComplete(method) => report(true, "verified", method)
      | Disproved(method) => report(true, "disproved", method)
      | Unknown(_) => report(true, "unknown", "no-applicable-complete-method")
      }
    }
  }
}
let projectReviewed = (capture, candidate, reviewedGrids) =>
  switch PwCapture.projectMapping(capture, candidate, PwCapture.identityTransform()) {
  | PwCapture.Rejected(error) => PwCapture.Rejected(error)
  | PwCapture.Accepted({value}) =>
    PwCapture.Accepted({
      value: value->Array.map(photo => {
        let grid =
          reviewedGrids
          ->Option.flatMap(reviewed =>
            reviewed.grids->Array.find(grid => grid.photoId == photo.photoId)
          )
          ->Option.mapOr(photo.grid, grid => PwCapture.rotateGrid(grid.grid, photo.quarterTurns))
        {...photo, grid}
      }),
    })
  }
let evaluate = (capture, candidate, reviewedGrids, checker) => {
  try {
    switch projectReviewed(capture, candidate, reviewedGrids) {
    | PwCapture.Rejected(_) => None
    | PwCapture.Accepted({value}) =>
      let checked: assessment = checker(
        PwCapture.describeCandidate(candidate),
        value->Array.map(photo => {...photo, grid: photo.grid->Array.map(Array.copy)}),
      )
      let check = checked.feasibility
      if (
        check.status != "pass" ||
        check.checkerId == "" ||
        check.sourceRevision == "" ||
        check.scope == ""
      ) {
        None
      } else {
        let wireReport = checked.wire->Option.map(assessWire)
        if (
          wireReport->Option.mapOr(false, report =>
            !report.structural || report.reachability == "disproved"
          )
        ) {
          None
        } else {
          Some({value: candidate, projection: value, feasibility: copyCheck(check), wireReport})
        }
      }
    }
  } catch {
  | _ => None
  }
}
let findMatchingCube = (capture, request: request, checker) => {
  let data = PwCapture.snapshot(capture)
  let request = {
    ...request,
    centers: request.centers->Array.map(center => {target: center.target, color: center.color}),
    reviewedGrids: request.reviewedGrids->Option.map(reviewed => {
      ...reviewed,
      grids: reviewed.grids->Array.map(grid => {
        photoId: grid.photoId,
        grid: grid.grid->Array.map(Array.copy),
      }),
    }),
  }
  let reviewedInvalid =
    request.reviewedGrids->Option.mapOr(false, reviewed =>
      reviewed.captureRevision != data.revision ||
      Array.length(reviewed.grids) != 6 ||
      reviewed.grids->Array.some(grid =>
        reviewed.grids->Array.filter(other => other.photoId == grid.photoId)->Array.length != 1 ||
        !(data.observations->Array.some(photo => photo.photoId == grid.photoId)) ||
        Array.length(grid.grid) != data.size ||
        grid.grid->Array.some(
          row => Array.length(row) != data.size || row->Array.some(color => color == ""),
        )
      )
    )
  if request.action != "findMatchingCube" {
    PwCapture.Rejected({error: "ExplicitSearchRequired"})
  } else if (
    request.searchId == "" ||
    !integer(request.maxEvaluated) ||
    request.maxEvaluated < 1 ||
    request.maxEvaluated > 100000 ||
    !integer(request.maxCandidates) ||
    request.maxCandidates < 1 ||
    request.maxCandidates > 256
  ) {
    PwCapture.Rejected({error: "InvalidSearchBudget"})
  } else if reviewedInvalid {
    PwCapture.Rejected({error: "InvalidReviewedGrids"})
  } else if Array.length(data.observations) != 6 {
    PwCapture.Rejected({error: "IncompleteCapture"})
  } else if (
    mod(data.size, 2) == 1 &&
      (Array.length(request.centers) != 6 ||
      faceOrder->Array.some(face =>
        request.centers->Array.filter(center => center.target == face)->Array.length != 1
      ) ||
      request.centers->Array.some(center =>
        center.color == "" ||
          request.centers->Array.filter(other => other.color == center.color)->Array.length != 1
      ))
  ) {
    PwCapture.Rejected({error: "OddCenterProfileRequired"})
  } else {
    let captureKey = PwSha256.hex(JSON.stringifyAny(data)->Option.getOrThrow)
    let evaluated = ref(0)
    let truncated = ref(false)
    let candidates: array<item> = []
    let rec visit = (depth, mapping: array<PwCapture.placement>) => {
      if !truncated.contents {
        if depth == 6 {
          if (
            evaluated.contents >= request.maxEvaluated ||
              Array.length(candidates) >= request.maxCandidates
          ) {
            truncated := true
          } else {
            let index = evaluated.contents
            evaluated := index + 1
            switch PwCapture.createCandidate(
              capture,
              {
                candidateId: request.searchId ++ "/" ++ captureKey ++ "/" ++ Int.toString(index),
                captureRevision: data.revision,
                mappingFrame: "canonical",
                canonicalTransform: None,
                legacyTransform: None,
                mapping,
              },
            ) {
            | PwCapture.Rejected(_) => ()
            | PwCapture.Accepted({value}) =>
              switch evaluate(capture, value, request.reviewedGrids, checker) {
              | None => ()
              | Some(item) => candidates->Array.push(item)
              }
            }
          }
        } else {
          let target = faceOrder->Array.getUnsafe(depth)
          data.observations->Array.forEach(photo => {
            let middle = data.size / 2
            let centerAllowed =
              mod(data.size, 2) == 0 ||
                request.centers->Array.some(center =>
                  center.target == target &&
                    request.reviewedGrids
                    ->Option.flatMap(
                      reviewed => reviewed.grids->Array.find(grid => grid.photoId == photo.photoId),
                    )
                    ->Option.mapOr(photo.sourceGrid, grid => grid.grid)
                    ->Array.getUnsafe(middle)
                    ->Array.getUnsafe(middle) == center.color
                )
            if centerAllowed && !(mapping->Array.some(entry => entry.photoId == photo.photoId)) {
              for quarterTurns in 0 to 3 {
                visit(
                  depth + 1,
                  [
                    ...mapping,
                    {
                      photoId: photo.photoId,
                      observationRevision: photo.revision,
                      target,
                      quarterTurns,
                    },
                  ],
                )
              }
            }
          })
        }
      }
    }
    visit(0, [])
    PwCapture.Accepted({
      value: {
        capture,
        searchId: request.searchId,
        evaluated: evaluated.contents,
        truncated: truncated.contents,
        candidates,
        reviewedGrids: request.reviewedGrids,
      },
    })
  }
}
let describeSession = (session: session): summary => {
  searchId: session.searchId,
  evaluated: session.evaluated,
  truncated: session.truncated,
  coverage: session.truncated ? "truncated" : "completeForDeclaredDomain",
  candidates: session.candidates->Array.map((item: item): retained => {
    candidate: PwCapture.describeCandidate(item.value),
    feasibility: copyCheck(item.feasibility),
    wireReport: item.wireReport->Option.map(report => {
      structural: report.structural,
      reachability: report.reachability,
      method: report.method,
      profile: report.profile,
      scope: report.scope,
    }),
  }),
}
let beginReview = session => {session, revision: 0, decisions: [], closed: false}
let revision = (review: review) => review.revision
let agrees = (a: PwCapture.placement, b: PwCapture.placement) =>
  a.photoId == b.photoId &&
  a.observationRevision == b.observationRevision &&
  a.target == b.target &&
  a.quarterTurns == b.quarterTurns
let remaining = (review: review) =>
  review.closed
    ? []
    : review.session.candidates->Array.filter(item =>
        review.decisions->Array.every(decision =>
          PwCapture.describeCandidate(item.value).mapping->Array.some(
            entry => agrees(entry, decision),
          )
        )
      )
let options = (review: review, target) => {
  let groups: array<choice> = []
  remaining(review)->Array.forEach(item => {
    let candidate = PwCapture.describeCandidate(item.value)
    switch candidate.mapping->Array.find(entry => entry.target == target) {
    | None => ()
    | Some(entry) =>
      switch groups->Array.findIndex(group => agrees(group.placement, entry)) {
      | -1 =>
        switch projectReviewed(review.session.capture, item.value, review.session.reviewedGrids) {
        | PwCapture.Rejected(_) => ()
        | PwCapture.Accepted({value}) =>
          groups->Array.push({
            placement: entry,
            grid: (value->Array.find(photo => photo.target == target)->Option.getOrThrow).grid,
            candidateIds: [candidate.candidateId],
          })
        }
      | index => (groups->Array.getUnsafe(index)).candidateIds->Array.push(candidate.candidateId)
      }
    }
  })
  groups
}
let nextTarget = review =>
  questionOrder->Array.find(target => Array.length(options(review, target)) > 1)
let choices = review => nextTarget(review)->Option.mapOr([], target => options(review, target))
let select = (review: review, expectedRevision, decision) => {
  if review.closed || review.revision != expectedRevision {
    PwCapture.Rejected({error: "StaleOrClosedReview"})
  } else if !(choices(review)->Array.some(choice => agrees(choice.placement, decision))) {
    PwCapture.Rejected({error: "ChoiceNotRetained"})
  } else {
    let decision: PwCapture.placement = {
      photoId: decision.photoId,
      observationRevision: decision.observationRevision,
      target: decision.target,
      quarterTurns: decision.quarterTurns,
    }
    PwCapture.Accepted({
      value: {...review, revision: review.revision + 1, decisions: [...review.decisions, decision]},
    })
  }
}
let back = (review: review, expectedRevision) => {
  if review.closed || review.revision != expectedRevision || Array.length(review.decisions) == 0 {
    PwCapture.Rejected({error: "StaleOrClosedReview"})
  } else {
    PwCapture.Accepted({
      value: {
        ...review,
        revision: review.revision + 1,
        decisions: review.decisions->Array.filterWithIndex((_, i) =>
          i < Array.length(review.decisions) - 1
        ),
      },
    })
  }
}
let cancel = (review: review, expectedRevision) => {
  if review.closed || review.revision != expectedRevision {
    PwCapture.Rejected({error: "StaleOrClosedReview"})
  } else {
    PwCapture.Accepted({value: {...review, revision: review.revision + 1, closed: true}})
  }
}
let selectedCandidate = review =>
  switch remaining(review) {
  | [item] => Some(PwCapture.describeCandidate(item.value))
  | _ => None
  }
let useCandidate = (capture, review: review, expectedRevision, candidateId, checker) => {
  if review.closed || review.revision != expectedRevision {
    PwCapture.Rejected({error: "StaleOrClosedReview"})
  } else {
    switch remaining(review) {
    | [item] if PwCapture.describeCandidate(item.value).candidateId == candidateId =>
      switch evaluate(capture, item.value, review.session.reviewedGrids, checker) {
      | None => PwCapture.Rejected({error: "CandidateNoLongerAdmissible"})
      | Some(checked) =>
        PwCapture.Accepted({
          value: {
            review: {...review, revision: review.revision + 1, closed: true},
            confirmed: {
              candidate: item.value,
              projection: checked.projection,
              feasibility: copyCheck(checked.feasibility),
              wireReport: checked.wireReport,
            },
          },
        })
      }
    | _ => PwCapture.Rejected({error: "UnresolvedOrStaleCandidate"})
    }
  }
}

let projectCandidate = (session: session, candidateId) =>
  session.candidates
  ->Array.find(item => PwCapture.describeCandidate(item.value).candidateId == candidateId)
  ->Option.flatMap(item =>
    switch projectReviewed(session.capture, item.value, session.reviewedGrids) {
    | PwCapture.Rejected(_) => None
    | PwCapture.Accepted({value}) => Some(value)
    }
  )
