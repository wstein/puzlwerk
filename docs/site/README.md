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
