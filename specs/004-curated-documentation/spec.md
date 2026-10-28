# 004 — Curated Starlight documentation, Stage 2

Status: implementation authorized under the maintainer's optimistic stacked
policy. Depends on Stage 1 PR #17; human merge/deployment approval remains required.
Tracks [#16](https://github.com/wstein/puzlwerk/issues/16).

## Acceptance

- Use pinned Astro Starlight and an isolated documentation lockfile; no solver or
  consumer runtime dependency changes.
- Read the Stage 1 publication selection and original Markdown. Generate only
  disposable build inputs, with stable note IDs/routes, source/edit links, curated
  navigation and search. Do not maintain copies as another source of truth.
- Serve the static output at `/puzlwerk/`; verify every local built link/anchor and
  resource, search indexing, desktop navigation and mobile layout in Chromium.
- Keep unselected notes in the public repository and link back to the complete
  graph. Do not label them private or automatically export all content.
- CI builds and uploads a review artifact. Production deployment runs only by an
  explicit maintainer workflow dispatch on `main` with deployment selected.
  Neither this PR nor its author dispatches production or changes Pages settings.
- Existing solver, physical replay, type and package checks remain green. Retain
  the `rotationEquivalent` / `exactPhysical` guarantee distinction.

## Architecture and workflow

Astro Starlight is the requested default and its supported Markdown loader/search
meet this scope; no Hugo comparison is warranted by a concrete blocker.
`docs/site/prepare-content.mjs` consumes the ID selection, resolves canonical
sources, maps selected links to site routes and other relative links to GitHub
source, and deletes/rebuilds its own ignored content directory. A six-page curated
view plus the generated 404 is not a general application/user framework.

See [publishing instructions](../../docs/site/README.md). Stage 1 is the immediate
PR base. Independent review, parent-fix propagation and atomic commits apply.
No merge, deployment, solver change, research operation or issue closure here.
