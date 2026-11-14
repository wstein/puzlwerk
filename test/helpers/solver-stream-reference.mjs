// Reference check of the solver stream contract (specs/001-core-foundation/contracts/solver-stream.md).
// Replays committed moves and the final answer with the ReScript core on wire-v1 states. The check reports the
// first violated rule as a stable code. `disable` skips one named check; the test uses it to prove that every
// invalid vector fails for the rule it names and for no other reason.
import * as Codec from "../../core/res/PwCodec.res.mjs";
import * as Move from "../../core/res/PwMove.res.mjs";

export const FAIL_REASONS = ["timeout", "nodeLimit", "memoryLimit", "depthLimit", "cancelled", "incompleteMethod", "unsupported", "invalid", "error", "unsatisfiable"];
const GOALS = ["state", "predicate", "subgoal"];
const ECHO = ["backend", "definitionHash", "stateHash", "goalHash", "elapsedMs", "nodeCount", "limits", "metric"];
const BUDGET = ["wallTimeMs", "nodeCount", "memoryBytes", "maxMoves", "edgeLength"];
const isInt = (x, min) => Number.isSafeInteger(x) && x >= min;
const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const keysAre = (o, required, optional = []) =>
  isObj(o) && required.every((k) => k in o) && Object.keys(o).every((k) => required.includes(k) || optional.includes(k));

class Violation extends Error {
  constructor(code) { super(code); this.code = code; }
}
const gate = (opt, code, condition) => { if (!condition && opt.disable !== code) throw new Violation(code); };

export function checkRequest(request, opt = {}) {
  try {
    const goal = (g) => {
      gate(opt, "BadGoal", isObj(g) && GOALS.includes(g.kind));
      if (!isObj(g) || !GOALS.includes(g.kind)) return;
      // Closed key sets (contract section 2.1): state {kind, frame, state}; predicate {kind, id, params?}; subgoal {kind, id, goal}.
      if (g.kind === "state") gate(opt, "BadGoal", keysAre(g, ["kind", "frame", "state"]) && ["fixed", "any-rotation"].includes(g.frame) && isObj(g.state));
      if (g.kind === "predicate") gate(opt, "BadGoal", keysAre(g, ["kind", "id"], ["params"]) && typeof g.id === "string" && g.id !== "" && (!("params" in g) || isObj(g.params)));
      if (g.kind === "subgoal") {
        gate(opt, "BadGoal", keysAre(g, ["kind", "id", "goal"]) && typeof g.id === "string" && g.id !== "");
        if (isObj(g.goal)) goal(g.goal);
      }
    };
    goal(request.goal);
    const b = request.limits ?? {};
    gate(opt, "BadBudget", isObj(b) && Object.keys(b).every((k) => BUDGET.includes(k) && isInt(b[k], 1)));
    return { ok: true };
  } catch (e) {
    if (e instanceof Violation) return { ok: false, code: e.code };
    throw e;
  }
}

// ctx: { definition (JSON text), initial (JSON text), goal: { target: JSON text | null }, request, budget, closed }
export function checkStream(ctx, events, opt = {}) {
  const def = Codec.decodeDefinition(ctx.definition)._0;
  const size = Codec.size(def);
  const requestId = ctx.requestId;
  let state = Codec.decodeState(def, ctx.initial)._0;
  const inner = (g) => (g.kind === "subgoal" ? inner(g.goal) : g);
  const goal = inner(ctx.goal);
  const apply = (s, mv) => {
    const made = isObj(mv) && ["X", "Y", "Z"].includes(mv.axis) && Array.isArray(mv.layers) ? Move.make(size, mv.axis, mv.layers, mv.turns) : { TAG: "Error" };
    if (made.TAG !== "Ok") return null;
    const next = Codec.stateOfPoses(def, Codec.poses(s).map((p) => Move.applyToPose(made._0, p)));
    return next.TAG === "Ok" ? next._0 : null;
  };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const committed = [];
  let terminal = false, lastBound = -1, evaluated = null;
  try {
    events.forEach((e, i) => {
      gate(opt, "AfterTerminal", !terminal);
      // Echo fields are required on every event (contract section 3): a missing one is a protocol violation.
      gate(opt, "MissingEcho", isObj(e) && ["protocol", "version", "requestId", "seq"].every((k) => k in e) && isObj(e.version) && "major" in e.version && "minor" in e.version);
      gate(opt, "BadEnvelope", e.protocol === "puzlwerk.solver" && e.version?.major === 1 && e.requestId === requestId);
      gate(opt, "BadSeq", e.seq === i);
      const head = ["event", "protocol", "version", "requestId", "seq"];
      if (e.event === "committed") {
        gate(opt, "UnknownField", keysAre(e, [...head, "fromIndex", "moves"]));
        gate(opt, "CommitGap", e.fromIndex === committed.length);
        gate(opt, "CommitEmpty", Array.isArray(e.moves) && e.moves.length > 0);
        gate(opt, "BudgetExceeded", committed.length + e.moves.length <= (ctx.budget.maxMoves ?? Infinity));
        for (const mv of e.moves) {
          const next = apply(state, mv);
          gate(opt, "IllegalMove", next !== null);
          if (next !== null) state = next;
          committed.push(mv);
        }
      } else if (e.event === "progress") {
        gate(opt, "UnknownField", keysAre(e, [...head, "depth", "beamSize"], ["lowerBound", "lowerBoundMethod"]));
        gate(opt, "ProgressDepth", isInt(e.depth, committed.length) && isInt(e.beamSize, 1));
        if ("lowerBound" in e) {
          gate(opt, "LowerBoundUnproven", typeof e.lowerBoundMethod === "string" && isInt(e.lowerBound, 0));
          gate(opt, "LowerBoundDecreased", e.lowerBound >= lastBound);
          lastBound = Math.max(lastBound, e.lowerBound);
        } else gate(opt, "LowerBoundUnproven", !("lowerBoundMethod" in e));
      } else if (e.event === "final") {
        gate(opt, "UnknownField", keysAre(e, [...head, "moves", "certificate"], [...ECHO, "finalStateHash"]));
        terminal = true;
        gate(opt, "FinalPrefix", Array.isArray(e.moves) && committed.every((m, k) => same(m, e.moves[k])));
        gate(opt, "BudgetExceeded", e.moves.length <= (ctx.budget.maxMoves ?? Infinity));
        for (const mv of e.moves.slice(committed.length)) {
          const next = apply(state, mv);
          gate(opt, "IllegalMove", next !== null);
          if (next !== null) state = next;
        }
        const c = e.certificate;
        gate(opt, "CertificateKind", isObj(c) && ["optimal", "bounded", "bestEffort"].includes(c.kind));
        if (c.kind === "optimal") gate(opt, "CertificateFields", keysAre(c, ["kind", "metric", "method"]) && c.metric === "layer-turn" && typeof c.method === "string");
        if (c.kind === "bounded") {
          gate(opt, "CertificateFields", keysAre(c, ["kind", "lowerBound", "lowerBoundMethod"]) && isInt(c.lowerBound, 0) && typeof c.lowerBoundMethod === "string");
          gate(opt, "CertificateBound", c.lowerBound <= e.moves.length);
          gate(opt, "LowerBoundDecreased", c.lowerBound >= lastBound);
        }
        if (c.kind === "bestEffort") gate(opt, "CertificateFields", keysAre(c, ["kind"]));
        if (goal.kind === "state" && goal.frame === "fixed") {
          evaluated = Codec.hashState(state) === Codec.hashState(Codec.decodeState(def, goal.target)._0);
          gate(opt, "GoalNotReached", evaluated);
        }
        if ("finalStateHash" in e) gate(opt, "FinalHashMismatch", e.finalStateHash === Codec.hashState(state));
      } else if (e.event === "failed") {
        gate(opt, "UnknownField", keysAre(e, [...head, "reason"], ["detail", "method", "scope", ...ECHO]));
        terminal = true;
        gate(opt, "BadFailReason", FAIL_REASONS.includes(e.reason));
        if (e.reason === "cancelled") gate(opt, "CancelNotRequested", ctx.cancelRequested === true);
        if (e.reason === "unsatisfiable") gate(opt, "UnsatNoMethod", typeof e.method === "string" && typeof e.scope === "string");
      } else gate(opt, "UnknownEvent", false);
    });
    gate(opt, "NoTerminal", terminal || !ctx.closed);
    // A final that arrives after a cancel request is a well-formed stream, but the run ends as cancelled (section 4).
    return { ok: true, applied: committed.length, evaluated, ...(ctx.cancelRequested ? { outcome: "cancelled" } : {}) };
  } catch (e) {
    if (e instanceof Violation) return { ok: false, code: e.code };
    throw e;
  }
}
