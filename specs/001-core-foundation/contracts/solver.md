# Proposed Cubacle solver contract v1

Status: Proposed; requires PuzWerk and Cubacle maintainer approval. No current Cubacle protocol support is asserted. Related: [ADR 0004](../../../docs/adr/0004-versioned-solver-boundary.md).

## Boundary and versioning

PuzWerk owns definitions, states, goals, move application and final verification. Cubacle owns search, pruning, heuristics and its resource accounting. A transport adapter invokes an explicitly configured executable; no arbitrary shell strings. Initial proposed transport: one bounded UTF-8 JSON request on stdin and one JSON response on stdout per process; diagnostics on stderr. A capability probe is a separate process request. Streaming progress and binary transport are deferred.

Every envelope contains `protocol: "puzwerk.solver"`, `version: {major:1,minor:0}`, and an opaque request ID echoed exactly. Major mismatch rejects; minor is negotiated to the highest mutually advertised revision and never inferred. Unknown fields in a negotiated schema are errors; additive fields require a new advertised minor revision. Unknown enum values/features always reject.

Canonical JSON is UTF-8, lexicographically sorted object keys, no insignificant whitespace, integer numeric values in their schema bounds, no duplicate keys, no negative zero, and ID-keyed arrays sorted by ID. Semantic arrays (move sequence, matrix rows, goal-child sequence) preserve order. Wire strings use JSON escaping, ASCII IDs, and Unicode metadata without normalization. Hashes are SHA-256 of those canonical bytes, lowercase hexadecimal, prefixed `sha256:`. Hash fields are excluded from their own hashed document. Definition/state/goal identity uses canonical documents, never process-specific object hashes.

## Capability probe

Example (envelopes abbreviated only by omitting no required fields):

```json
{"protocol":"puzwerk.solver","version":{"major":1,"minor":0},"requestId":"cap-1","kind":"capabilities"}
```

Response payload must advertise backend name/version/source revision, protocol revisions, coordinate convention IDs, supported size ranges, move-policy features, goal node kinds, sticker/pose symmetry support, fixed/global goal frames, reachability checks, metrics, budget/cancellation support and input/output limits. An empty supported set is valid. Never infer rich goal support from generic NxN or color solving support.

## Solve request

```json
{
  "protocol":"puzwerk.solver",
  "version":{"major":1,"minor":0},
  "requestId":"solve-1",
  "kind":"solve",
  "profile":"cube-shell-v1",
  "definitionHash":"sha256:<64 lowercase hex digits>",
  "stateHash":"sha256:<64 lowercase hex digits>",
  "goalHash":"sha256:<64 lowercase hex digits>",
  "definition":{},
  "initialState":{},
  "goal":{},
  "metric":"layer-turn",
  "limits":{"wallTimeMs":1000,"nodeCount":100000,"memoryBytes":67108864,"maxMoves":1000},
  "seed":0
}
```

This is a **shape illustration, not a valid conformance fixture**: placeholder hashes and empty domain objects must be replaced by the complete data-model schema and matching canonical hashes in milestone M1. Definition includes allowed move policy; goal includes global frame policy. Missing required domain fields reject. Limits are positive safe integers (seed nonnegative); a backend must reject unsupported hard limits rather than claim to enforce them. Adapter also enforces wall time externally; requested memory limits require an OS/backend enforcement mechanism, not a serialized-size estimate. Layer-turn metric counts each AST move as one, including a 180° turn; disjoint-layer selection is one move only if advertised by this move policy. Any other metric is separately named and negotiated.

## Outcomes and errors

Every result echoes request ID, negotiated version, backend identity, all three request hashes, outcome, elapsed milliseconds, expanded nodes if measured (otherwise null), and effective limits/metric. `solved` adds canonical moves, final-state hash and optimality `proven|notProven`; proven requires the advertised exhaustive optimization method and metric. Zero moves is a valid already-satisfied solution. PuzWerk recomputes both the final hash and goal truth; a backend assertion alone is never success.

- `unsatisfiable`: only a complete algorithm covering the exact definition, state, legal move set, frame and goal, with named method/version and completeness scope. Search cutoffs, unsupported features and bounded-depth exhaustion return `unknown` instead. A declared complete method requires a separately audited conformance record; no unverifiable generic “UNSAT” claim is accepted as proof.
- `unknown`: reason `timeout|nodeLimit|memoryLimit|depthLimit|cancelled|incompleteMethod`; no implication about existence.
- `unsupported`: stable feature paths and capability mismatch list; no search and no downgraded goal.
- `invalid`: stable codes and JSON paths, such as `INVALID_STATE`, `INVALID_MOVE`, `INVALID_GOAL`, `HASH_MISMATCH`, `SCHEMA_VERSION`, `RESOURCE_LIMIT`.
- `error`: backend/internal/transport failure, never mathematical UNSAT.

Malformed or truncated output, mismatched IDs/hashes, extra stdout, invalid final state and illegal returned moves are adapter failures (`BACKEND_PROTOCOL` or `REPLAY_FAILED`). Do not expose a solution before verification. Exit status 0 means a well-formed response, including unsupported/unknown; nonzero or a killed process means transport/backend failure unless the adapter itself initiated timeout/cancel and reports its own `unknown` reason. Bound output bytes and maxMoves before replay.

## Cancellation, determinism and replay

The proposed process adapter cancels by terminating its owned child process, then force-terminating after a documented 250 ms grace period; discard partial output. It never kills unrelated processes. Capability lists whether backend-native cancellation exists; absent it, adapter cancellation still works. No response after cancellation is accepted as solved.

Identical inputs must decode, transform, serialize and evaluate identically. A seed supports reproducible search only when backend advertises it; no promise of identical parallel search timing or move selection. Replaying the same returned AST must always produce the same complete physical state, including invisible identities/upframes. Adapter frame conversions and their inverses are exact and round-trip tested. Rotation-quotiented solver output needs an explicit frame-restoration sequence legal under the requested policy, or is unsupported for fixed-frame requests.

## Conformance suite (planned, not executed)

1. Complete 2×2 home fixture: zero-move fixed-frame exact goal; all hashes independently reproduced in Rust/ReScript.
2. Known scramble with exact inverse; independently replay every pose and immutable sticker.
3. Legacy color-only fixture retains original solved convention and definitions.
4. Equal-color swapped IDs; color goal passes, identity goal fails.
5. Correct position/wrong up; C1/C2/C4 truth table and wrong-normal rejection.
6. Version/unknown-field/hash/type/duplicate-key errors and bounded input/output rejection.
7. Unsupported exact goal or size returns unsupported; no search fallback.
8. Time/node/memory/cancel outcomes never UNSAT; fake solved response rejected on replay.
9. Fixed-frame versus global-rotation goals, wide/inner mapping, and all-layer rotation rejection when forbidden.
10. A genuinely complete tiny restricted problem may establish UNSAT conformance; no new solver is required in PuzWerk.

Compatibility fixtures and a machine-readable schema are future approved tasks. This document defines their semantics; examples must not be mistaken for a deployed protocol.
