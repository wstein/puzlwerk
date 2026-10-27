# ADR 0004: Versioned solver-neutral interchange with verified replay

Status: Proposed
Date: 2026-10-27

## Context

PuzWerk is ReScript; Cubacle search is Rust. Consumers must not silently weaken identity/orientation goals into color solving. Existing protocol compatibility is unconfirmed.

## Options and proposal

Propose bounded canonical JSON, explicit major/minor negotiation, full definition/state/goal hashes, capability-declared sizes/moves/frames/goals, and a process adapter. PuzWerk independently replays any returned solution. See the [contract](../../specs/001-core-foundation/contracts/solver.md).

Alternatives: direct language ABI couples runtimes; binary transport reduces size but complicates initial inspection; assuming CLI defaults hides frame/goal differences. A future binary encoding requires equivalent versioned semantics and fixtures.

## Consequences and approval

Unsupported requests reject without fallback; exhausted search is unknown; UNSAT requires a declared audited complete method for the exact profile. Rich definitions cannot be exported through lossy color-only formats without explicit projection. Canonicalization, duplicate-key handling and bounded parsing require cross-language tests. Cubacle maintainer agreement (Q3), approved runtime tooling (Q6) and human phase approval precede adapter implementation. No Rust/search changes or external repository migration are authorized here.
