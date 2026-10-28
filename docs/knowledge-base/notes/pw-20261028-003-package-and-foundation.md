---
id: pw-20261028-003
title: An implemented scoped package does not approve the general foundation
kind: evergreen
status: verified
audience: developer
publication: developer-candidate
related: ["pw-20261028-001", "pw-20261028-002"]
sources: ["../../../packages/solver-2x2/package.json", "../../../specs/001-core-foundation/README.md", "../../../specs/002-solver-2x2/spec.md", "../../adr/0005-reusable-2x2-solver.md", "https://github.com/wstein/puzlwerk/pull/13", "https://github.com/wstein/cubistry/pull/31"]
---
# An implemented scoped package does not approve the general foundation

Repository existence, working package code, npm publication and architecture
acceptance are distinct facts. The private `@puzlwerk/solver-2x2` workspace is
implemented and reused by Cubistry. It accepts the existing Cubistry v1 physical
wire profiles; it is not a released general canonical core.

The broader foundation remains a proposal with explicit implementation gates.
Cubacle is an independent Rust solver provider, not replaced or migrated by the
ReScript package. CubeLab and CubeAssembler keep their working applications until
separate approved replacements and migration plans exist. Proposed ADR text keeps
its recorded status; a merged scoped package is not blanket approval of all ADRs.

## Sources

- [Private package metadata](../../../packages/solver-2x2/package.json).
- [Foundation proposal and gates](../../../specs/001-core-foundation/README.md).
- [Authorized solver extraction scope](../../../specs/002-solver-2x2/spec.md).
- [Original proposed ADR 0005](../../adr/0005-reusable-2x2-solver.md).
- [Merged provider PR #13](https://github.com/wstein/puzlwerk/pull/13).
- [Merged consumer PR #31](https://github.com/wstein/cubistry/pull/31).

## Related

- [pw-20261028-001: Identity and equivalence](pw-20261028-001-identity-and-equivalence.md).
- [pw-20261028-002: Replay and optimality](pw-20261028-002-replay-and-optimality.md).
