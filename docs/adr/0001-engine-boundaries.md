# ADR 0001: Domain engine and solver boundaries

Status: Proposed
Date: 2026-10-27

## Context

Several cube tools need shared coordinates, state transitions and orientation semantics; Cubacle already provides Rust solver capabilities.

## Proposal

PuzWerk (ReScript) owns canonical puzzle state, transformations, goals and versioned interchange. Cubacle (Rust) owns solver search and optimization. CubeLab and CubeAssembler consume the common model.

## Consequences

Requires compatibility fixtures and explicit feature negotiation. Avoids duplicated cube logic. This ADR remains proposed until human review.
