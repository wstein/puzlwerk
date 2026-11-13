# Proposed solver stream contract (committed move blocks)

Status: Proposed; owner approval and Cubacle maintainer approval required. Extends the [solver contract](solver.md) (Q3, ADR [0004](../../../docs/adr/0004-versioned-solver-boundary.md)), which defers "streaming progress". State is [wire-v1](wire-v1.md) (SM1, [shared model plan](../../006-shared-model/plan.md)). Nothing here is implemented or deployed. Markers: **O** owner decision, **V** verified in a file at the revision named, **P** proposed here, **U** UNKNOWN. Vectors: `test/fixtures/solver-stream/vectors.json`; reference check: `test/solver-stream.test.mjs`.

## 1. Purpose and the one rule

**O** (2026-11-13, owner): a universal beam solver enters the GUI and plays moves while it still searches. A beam search knows no final solution early. A move is **committed** when every candidate that can still become the answer starts with it. Only committed prefixes are streamed, so the GUI never has to rewind a streamed move.

**P** Rule 1: a solver emits `committed` for move `i` only if every solution it can still return (all beam candidates, restarts and fallbacks included) has the same first `i+1` moves. Emitting later than possible is always allowed; emitting earlier is a contract violation. Rule 2: a committed prefix is never revoked, shortened or changed, including after `failed`.

## 2. Request

**P** Additive to solver.md 1.0 in the sense of its own rule (additive fields need an advertised minor): protocol minor 1, so version 1.1 (**O** 2026-11-13), adds the request field `mode: "stream"`, the goal kinds below, `limits.edgeLength`, the events of section 3 and the capability `stream` (section 8). Every other field of the solve request keeps its solver.md name and meaning: `profile`, `definitionHash`, `stateHash`, `goalHash`, `definition`, `initialState`, `goal`, `metric`, `limits`, `seed`. A solver without the capability returns `unsupported` and does not stream. Not additive and therefore **U**: the transport. solver.md has one JSON response per process; a stream is one JSON object per line on stdout, which needs its own negotiation (section 8).

```json
{"protocol":"puzlwerk.solver","version":{"major":1,"minor":1},"requestId":"r1","kind":"solve","mode":"stream",
 "profile":"cube-shell-v1","definitionHash":"sha256:...","stateHash":"sha256:...","goalHash":"sha256:...",
 "definition":{},"initialState":{},"goal":{"kind":"state","frame":"fixed","state":{}},"metric":"layer-turn","seed":0,
 "limits":{"wallTimeMs":5000,"nodeCount":1000000,"memoryBytes":67108864,"maxMoves":30,"edgeLength":12}}
```

Shape illustration, not a valid fixture (placeholder hashes). `definition` and `initialState` are complete wire-v1 documents; `initialState` is the actual current state of the caller, not the original scramble.

### 2.1 Goals

| `goal.kind` | Content | Success test (the caller recomputes it) |
| --- | --- | --- |
| `state` | `state`: wire-v1 target; `frame`: `fixed` or `any-rotation` (solver.md frames) | final state equals the target under the frame rule |
| `predicate` | `id`: name from a registry the solver advertises; `params`: object | the registered predicate is true on the final state |
| `subgoal` | `id`: label; `goal`: any goal above | the inner goal holds; the label is echoed, nothing else changes |

**P** `predicate` covers goals such as "the front shows month M" without a full target state; the predicate is data named by ID, never code in the request. An unadvertised `id` returns `unsupported`; it is never weakened to a color or state goal. A `subgoal` is a stage of a larger task (for example one edge of a chain): its final state is the state of the next request.

**U** The goal document schema is milestone M2 and not written; the three kinds above are the stream-level shape only. **U** The predicate registry (IDs, parameter schemas) and who evaluates a predicate in PuzlWerk for replay.

### 2.2 Budget (`limits`)

The budget is the `limits` object of solver.md plus `edgeLength`. All values are positive safe integers; every field is optional; an omitted field means the solver default, which `capabilities` states.

| Field | Meaning |
| --- | --- |
| `wallTimeMs` | search time; the adapter also enforces it from outside (solver.md) |
| `nodeCount` | expanded nodes, if the backend measures nodes |
| `memoryBytes` | memory, enforced as in solver.md |
| `maxMoves` | maximum length of the whole answer, committed prefix plus tail |
| `edgeLength` | maximum length of one stage (one `subgoal` or one chain edge) |

**P** A solver that cannot enforce a hard budget field rejects the request (`unsupported`), as in solver.md. Budget exhaustion ends the stream with `failed` (section 5), never with a `final` that was not reached.

## 3. Event stream

One ordered sequence of events per request. Every event carries `protocol`, `version`, the request's `requestId` and `seq`, an integer that starts at 0 and grows by exactly 1. Events of another `requestId` are not part of this stream.

| Event | Fields | Meaning |
| --- | --- | --- |
| `committed` | `fromIndex`, `moves[]` | Moves `fromIndex` .. `fromIndex+len-1` of the answer are committed |
| `progress` | `depth`, `beamSize`, optional `lowerBound` with `lowerBoundMethod` | Search status; no claim about the answer except a bound |
| `final` | `moves[]`, `certificate` | The complete answer and what is known about it; terminal |
| `failed` | `reason`, optional `detail` | No complete answer; terminal |

A move is the canonical AST of the data model: `{"axis":"X|Y|Z","layers":[...],"turns":-1|1|2}`. **U** wire-v1 defines no move document (moves are outside v1); this object is the interim wire form and needs an owner decision with M2.

### 3.1 Rules

1. **Order.** `seq` is gapless and increasing. Exactly one terminal event (`final` or `failed`) ends the stream and nothing follows it. A closed transport without a terminal event is a transport failure (section 5).
2. **Continuity.** `fromIndex` of a `committed` event equals the number of moves committed so far (0 for the first). `moves` is nonempty. No gap, overlap or repetition.
3. **Legality.** Every committed move is legal under the definition's move policy on the state it applies to. The adapter applies each chunk on receipt and rejects an illegal one (`BACKEND_PROTOCOL`).
4. **Final extends committed.** `final.moves` begins with exactly the committed moves; the remainder is the tail. A `final` without any `committed` event is valid (the whole answer is the tail); this is also the form of a one-shot backend (section 7).
5. **Goal.** The caller replays `final.moves` on `initialState` and evaluates the goal itself. A backend assertion alone is never success (solver.md). A failed check ends the run as `REPLAY_FAILED`; the played prefix stays played.
6. **Length.** The committed count never exceeds `limits.maxMoves`, checked on every `committed` event, and `final.moves` never exceeds it.
7. **Progress.** `depth` (moves in the longest retained candidate) is at least the committed length; `beamSize` is at least 1. `lowerBound`, if present, is a proven lower bound on the answer length under the metric, needs `lowerBoundMethod` (an ID from `capabilities`), and never decreases between events. A search statistic without proof is not a `lowerBound`.
8. **Unknown values.** An unknown event kind, field, certificate kind or failure reason rejects (solver.md); additive fields need a new advertised minor.

**P** Terminal events (`final`, `failed`) may carry the result echo of solver.md as optional fields: `backend`, `definitionHash`, `stateHash`, `goalHash`, `elapsedMs`, `nodeCount`, `limits`, `metric`; `final` may add `finalStateHash`, which the caller compares with the hash of its own replayed state. The reference check verifies only `finalStateHash`; the other echo fields are accepted, not compared (**U** whether they become required). The solver.md field `optimality` (`proven|notProven`) is expressed by the certificate kind below.

### 3.2 Certificates

**P** `final.certificate.kind` is one of three. No number appears without the method that proves it.

| Kind | Fields | Claim |
| --- | --- | --- |
| `optimal` | `metric`, `method` | No shorter answer exists under `metric` (`layer-turn`), by the advertised exhaustive `method` |
| `bounded` | `lowerBound`, `lowerBoundMethod` | The answer has length L and L is at least `lowerBound`, proven by the method; `lowerBound` is at most L; no claim that L is minimal |
| `bestEffort` | none | The goal holds; nothing is claimed about length |

A beam answer is `bestEffort` or `bounded`, never `optimal`, unless an audited exhaustive method says so. **P** "Best effort" in this contract never means a partly reached goal. A partly reached goal (the calendar's one-wrong-cell month) is a different goal given by the caller, and its certificate says what is true about that goal.

## 4. Cancel and budget

**P** The caller cancels with `{"kind":"cancel","requestId":"r1"}` on the same transport. The solver stops, emits the terminal event `failed` with `reason: "cancelled"` and no further `committed`. Committed events already in flight before the solver saw the cancel stay valid. A `final` that arrives after the cancel request is not accepted as solved (solver.md: "No response after cancellation is accepted as solved"); the caller ends the run as `cancelled` and keeps the moves it applied. The adapter may end the stream itself (terminate the child, solver.md) and synthesize `failed` with reason `cancelled` or `timeout`; it discards partial lines. **O** 2026-11-13: a verified `final` after cancel follows the rules of solver.md; this contract defines no second path.

## 5. Failure behavior

`failed.reason` uses the vocabulary of solver.md: `timeout`, `nodeLimit`, `memoryLimit`, `depthLimit`, `cancelled`, `incompleteMethod`, `unsupported`, `invalid`, `error`, and `unsatisfiable`. `unsatisfiable` needs `method` and `scope` naming a complete method (solver.md); without them it is a protocol violation. All other reasons carry no claim that a solution does or does not exist.

- Committed moves stay valid after any `failed`. The caller's state is the state after the moves it applied; it can request again from that state (section 6).
- Protocol violations (gap, repeated `fromIndex`, move after terminal, illegal move, prefix mismatch, unknown kind, wrong `requestId`) make the adapter cancel the run and report `BACKEND_PROTOCOL`; the moves applied before the violation stay applied.
- **P** Solver.md says "do not expose a solution before verification". A stream exposes moves before the goal is verified. This contract reads that sentence as: the complete answer is not presented as a solution until `final` verifies; each committed move is legal but the run is "unverified" in the GUI until then. **U** The owner confirms this reading or keeps the old rule (then `committed` events are held back until `final`, which removes the point of streaming).

## 6. How the GUI replans

**P** The GUI keeps its actual state `S` (wire-v1) and a queue of committed moves not yet animated.

1. Send `solve` with `initialState = S`. Animate and apply queued committed moves in order; each application updates `S`.
2. On `final`: append the tail, animate it, replay and verify the goal; show "solved" only after that.
3. On `failed`, cancel, a protocol violation or a user action (manual move, undo, edit, new target): stop and drop the unplayed queue. `S` is what was actually applied. A new request starts from `S` with a new `requestId`; events of the old `requestId` are ignored.
4. Undo by the user is a GUI move of the inverse; the solver never revokes. A stage goal (`subgoal`) is requested again from the new `S`, with the budget that is left.

Nothing is rewound because only committed moves were ever played.

## 7. Consumers

### 7.1 Cubacle WASM ABI

**V** Branches `feat/wasm-build-1` (`a5f02dcf6276b57917ec68d53dcedb25f7fe8b79`) to `feat/wasm-build-4` (`4741fbd1cf81eeeecfc0570bf4a746ab4f154887`), `crates/wasm/src/abi.rs` and `docs/wasm.md`: ABI 1 exports `cubacle_abi_version() -> 1`, `cubacle_alloc`, `cubacle_free`, `cubacle_result_len` and `cubacle_solve(size, ptr, len, max_moves)`. The call is synchronous and returns one buffer: 4 bytes length, one status byte (0 solved, 1 bad input, 2 no solution) and UTF-8 text. Input is a scramble in text notation for sizes 2 and 3. There is no cancel, no progress, no budget except `max_moves`, no wire-v1 and no certificate. `docs/wasm.md` itself states the module has no loading, cancel or pinning layer.

**P** ABI 1 maps to the degenerate stream: status 0 gives `final` with all moves as tail and `bestEffort`; status 1 gives `failed` `invalid`; status 2 gives `failed` `depthLimit` (the search with `max_moves` found nothing, which is not `unsatisfiable`). The adapter converts wire-v1 to the scramble text through the Cubacle fixed frame (**O** Q3) and replays the answer. **O** 2026-11-13: ABI 1 delivers no `optimal` certificate, only `bounded` or `bestEffort` as above (status 0 stays `bestEffort`; `docs/wasm.md` calls the 2x2x2 answer optimal but names no audited method). **U** Whether and when `optimal` certificates become available is not decided.

**O** 2026-11-13: Cubacle gets ABI 2 with a time-budget argument for `cubacle_solve` (`cubacle_abi_version() -> 2`). ABI 1 stays deliverable with a small default budget. Budget comes now, events later: streaming, cancel and progress are a separate, later ABI step, so a streaming module is a further ABI version, not part of ABI 2. The Cubacle change is not linked here (no Cubacle PR exists). **U** Not designed for the streaming step: how a synchronous WASM search yields events (a poll export plus cancel flag in linear memory, or a worker that posts events), the byte form of an event (the JSON of section 3 as UTF-8 is the proposal), and budget fields beyond the time budget. **U** Whether Cubacle's search exposes the common prefix of its candidates.

### 7.2 Calendar beam

**V** `research/calendar-7x7/row1-window-chain/window_chain.jl` on `research/chain-extend-2100` (`a8082419d875df9d255ae85db305e93b1751be1b`) in wstein/cubistry: Julia, library `L5`, `width` 40, `lambda` 3 (defaults), edge by edge from the retained state to the next month; the target is the month's front board (a best-effort month uses a board with one wrong cell); the beam falls back to a greedy orbit solver; a run stops on `max_edges`, `deadline`, `best_effort_unreachable` (a best-effort target no solver reaches) or `search_stalled` (an exact target no solver reaches; `stop_for_unreached` in `window_chain_lib.jl`, used at `window_chain.jl` line 159). The script writes finished edges to `chain.moves.tsv`; it emits nothing during an edge.

**P** One chain edge is one `subgoal` with a `predicate` or `state` goal (the month front). The end of an edge is a natural commit point: one retained state remains, so `committed` carries the whole edge. Within an edge the contract adds a commit only if the beam proves a shared prefix. **U** Whether `beam_edge.jl` keeps parent links so the shared prefix of the 40 candidates is cheap to compute (not read). **U** Mapping `edgeLength` and the stop reasons to `budget` and `failed` reasons (`deadline` is `timeout`; `search_stalled` and `best_effort_unreachable` have no counterpart yet: no solver reached the target, which is no budget stop and no proof of unsatisfiability, closest to `incompleteMethod`).

## 8. Capabilities and versioning

**P** The `capabilities` response (solver.md) gains `stream`: `{"events":["committed","progress","final","failed"],"certificates":[...],"goalKinds":[...],"predicates":[...],"lowerBoundMethods":[...],"cancel":"native|adapter"}`. A caller streams only what is listed. This contract is additive to protocol 1.x: a 1.0 peer never sees a stream. Breaking changes (event semantics, certificate meaning, rule 1) need a major version.

## 9. Conformance vectors

`test/fixtures/solver-stream/vectors.json` holds valid streams with expected outcomes and invalid streams, each naming the code the reference check must report. Initial and target states are the wire-v1 fixtures in `test/fixtures/wire/` (2x2x2 `state-2-scrambled.json` is R U F' from home). The reference check replays moves with the ReScript core (`PwMove`, `PwCodec`). Not covered: the solver.md request fields other than `goal` and `limits` and the echo fields other than `finalStateHash`, goal kind `predicate` (no registry, **U**), frame `any-rotation` (not evaluated), certificate method truth (method IDs in vectors are fixture placeholders, not audited methods), real solver output, the Cubacle ABI and the calendar beam (no run).

Open points (**U**): the stream transport (JSON lines against one response); whether the echo fields become required; the move wire form; the goal document (M2); the predicate registry; reading of "no exposure before verification" (section 5); the streaming ABI design (events, cancel, progress); shared-prefix access in both searches.
