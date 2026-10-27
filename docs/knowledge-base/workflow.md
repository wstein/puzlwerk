# Development workflow

1. Capture domain knowledge and open questions in `docs/knowledge-base/`.
2. Record approved architectural choices as ADRs in `docs/adr/`.
3. Write focused Spec-Kit feature specifications under `specs/NNN-name/` with scenarios and acceptance criteria.
4. Obtain human approval of scope and architecture before implementation.
5. Implement in small, atomic Conventional Commits on feature branches; include focused tests and reproducible evidence.
6. Open a PR with linked spec/ADR, compatibility impacts, test results, and explicit unresolved risks. Human review and merge are required.

Codex may draft specifications and plans without implementation approval. Do not silently change coordinate conventions, puzzle semantics, public contracts or repository boundaries. Never push implementation directly to `main`.

## Initial work order

First complete `001-core-foundation` specification: coordinate conventions, state representation, move legality, symmetry, goals, serialization and solver adapter contract. Follow with tests/fixtures and an implementation plan. Request approval before coding.
