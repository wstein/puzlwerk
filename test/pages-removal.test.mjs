import {test} from 'node:test';
import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';

const absent=async path=>{await assert.rejects(access(path),{code:'ENOENT'});};
test('PR preview publisher and its infrastructure are absent',async()=>{
 for(const path of ['.github/workflows/acceptance-preview.yml','.github/workflows/pages-publish.yml','.github/workflows/pages-notify.yml','scripts/pages','test/pages','docs/PAGES_PREVIEWS.md']) await absent(path);
});
test('documentation deployment remains an explicit main-only dispatch',async()=>{
 const workflow=await readFile('.github/workflows/documentation.yml','utf8');
 assert.match(workflow,/if: github\.event_name == 'workflow_dispatch' && inputs\.deploy && github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/uses: actions\/deploy-pages@/);
 assert.doesNotMatch(workflow,/PAGES_PREVIEWS_ENABLED|PAGES_BOOTSTRAP_|writer\.mjs|bootstrap_attested|puzlwerk-pages-publish/);
});
test('local viewer demo instructions reference its existing dev command',async()=>{
 const readme=await readFile('packages/viewer/README.md','utf8');
 const pkg=JSON.parse(await readFile('packages/viewer/package.json','utf8'));
 assert.match(readme,/npm run dev --workspace @puzlwerk\/viewer/);
 assert.equal(pkg.scripts.dev,'npm run build && node demo/server.mjs');
});
