# Curated PuzlWerk documentation

This is a publishing view of the [canonical knowledge base](../knowledge-base/README.md),
not an independently editable documentation tree. It implements
[Stage 2](../../specs/004-curated-documentation/spec.md) on top of Stage 1 PR #17.
The full repository graph stays public. Selection is curation, not access control.

## Build and preview

Requires Node 24+, npm and Python 3 for existing repository checks. From the root:

```sh
npm ci --prefix docs/site
npm run docs:check
npm run docs:build
npm run docs:links
npm --prefix docs/site run preview
```

Astro preview serves `/puzlwerk/`. For a cloud home directory without write access,
use `npm_config_cache=/tmp/puzlwerk-npm-cache` during installation and
`ASTRO_TELEMETRY_DISABLED=1` for Astro commands. The documentation project has its
own exact direct versions and lockfile; it adds no dependency to the private solver
package or consumer runtime. No package publication is performed.

Run browser checks after building:

```sh
cd docs/site
npx playwright install chromium
npm run test:e2e
```

The browser fixture serves built static files under `/puzlwerk/`, not an Astro dev
server. Search is built by Starlight/Pagefind. CI checks missing assets, stable IDs,
all local built links/anchors, search results and a narrow-screen navigation layout.
External URL availability is a separate upstream concern.

## One source, curated views

Edit original notes/reference, not `src/content/docs/` or `dist/` (both ignored).
`prepare-content.mjs` reads [publication.json](../knowledge-base/publication.json),
resolves stable note IDs and canonical document mappings, and generates disposable
Markdown. Each note route contains its permanent ID and an explicit ID anchor.
Source and edit links point to the canonical file; related selected links map to
`/puzlwerk/` routes, other source links point to the public GitHub file with its
fragment. Original source text, IDs and evidence are never rewritten by the build.

The generated overview and sidebar derive from the same selection. The initial
view includes three notes, the existing solver reference and the knowledge
conventions guide. Architecture has a linked scope note and links to the proposed
ADRs/specification; no second architecture manual is created. There is no automatic
wholesale note export. Add new curation only through reviewed metadata changes.
Changing a stable route requires compatibility redirects/links, not ID reuse.

## Curation workflow

1. Write or update the canonical note or document first. A note is publishable only
   with `publication: developer-candidate` (or `user-candidate`), the matching
   `audience`, and status `proposed` or `verified`.
2. Add its stable ID to a navigation group in
   [publication.json](../knowledge-base/publication.json), or add a `documents`
   entry (`path`, `title`, `slug` under `guides/`, `reference/` or `architecture/`)
   for an existing non-note document. Never reference copied content.
3. Run `npm run docs:check`, `npm run test:docs`, `npm run docs:build` and
   `npm run docs:links`, then the browser checks above.
4. Open a PR with only the selection change and its sources. Reviewers check the
   rendered pages in the uploaded CI Pages artifact.
5. To remove a page, drop it from the selection. The canonical file stays public
   in the repository. Inbound links to the old route need a replacement link.

## Publishing approval

GitHub Pages is already configured for Actions; this task changes no setting.
The documentation workflow builds on PRs and main and uploads a Pages artifact.
It does **not** deploy on push or PR. A maintainer may explicitly select `deploy`
when manually dispatching the workflow on `main`, after accepting and merging the
stack. The deploy job uses the existing `github-pages` environment and Pages/OIDC
permissions. Do not dispatch production on the user's behalf without approval.

Expected approved URL: `https://wstein.github.io/puzlwerk/`. Local static tests and
CI artifacts are preview evidence, not a claim that this version is live. Existing
Cubistry Pages and solver behavior are untouched.
