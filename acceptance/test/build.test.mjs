import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate, renderCase} from '../build.mjs';
import {readFile} from 'node:fs/promises';
const manifest=JSON.parse(await readFile(new URL('../../specs/009-viewer-consolidation/acceptance-routes.json',import.meta.url)));
test('all routes validate and are unique',()=>{assert.deepEqual(validate(manifest,'/puzlwerk/').map(c=>c.id),manifest.cases.map(c=>c.id))});
test('reject duplicate and traversal routes',()=>{const m=structuredClone(manifest);m.cases[1]=structuredClone(m.cases[0]);assert.throws(()=>validate(m,'/puzlwerk/'));m.cases[1]=structuredClone(manifest.cases[1]);m.cases[1].route='acceptance/../escape/';assert.throws(()=>validate(m,'/puzlwerk/'))});
test('reject invalid base and missing status',()=>{assert.throws(()=>validate(manifest,'puzlwerk/'));const m=structuredClone(manifest);delete m.cases[0].status.visual;assert.throws(()=>validate(m,'/puzlwerk/'))});
test('escape case content',()=>{const c=structuredClone(manifest.cases[0]);c.screen='<script>alert(1)</script>';const html=renderCase(c,'/puzlwerk/');assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>alert(1)</script>'))});
test('reject unsafe source links and malformed checklist',()=>{const m=structuredClone(manifest);m.cases[0].sourceReference='javascript:alert(1)';assert.throws(()=>validate(m,'/puzlwerk/'));m.cases[0].sourceReference=manifest.cases[0].sourceReference;m.cases[0].checklist=[];assert.throws(()=>validate(m,'/puzlwerk/'))});
test('case shows each status separately and retains the base',()=>{const c=manifest.cases[0],html=renderCase(c,'/nested/review/');for(const [key,value] of Object.entries(c.status))assert.ok(html.includes(`<dt>${key}</dt><dd>${value}</dd>`));assert.ok(html.includes('href="/nested/review/"'));assert.ok(html.includes('temporary observations'))});
test('classic source comparison is mounted from the manifest at a generic nested base',()=>{
 const c=manifest.cases.find(c=>c.id==='cubistry-playground-classic-2');
 assert.ok(c);
 const html=renderCase(c,'/nested/review/');
 assert.ok(html.includes('id="classic"'));
 assert.ok(html.includes('/nested/review/assets/runtime/classic.mjs'));
 assert.ok(html.includes('"three/examples/":"/nested/review/assets/three/examples/"'));
});
test('CubeAssembler native comparison is a distinct manifest route',()=>{
 const c=manifest.cases.find(c=>c.id==='cube-assembler-solved-2');
 assert.ok(c);
 const html=renderCase(c,'/nested/review/');
 assert.ok(html.includes('id="cube-assembler-case"'));
 assert.ok(html.includes('/nested/review/assets/runtime/cube-assembler.mjs'));
 assert.ok(html.includes('/nested/review/assets/reference-cube-assembler/original.css'));
});
test('acceptance routes support the local root base',()=>{assert.deepEqual(validate(manifest,'/').map(c=>c.id),manifest.cases.map(c=>c.id));assert.ok(renderCase(manifest.cases[0],'/').includes('href="/assets/style.css"'));});

test('source archives use the explicitly recorded commit instead of a parent checkout',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{sourceRevision}=await import('../build.mjs');const dir=await mkdtemp(join(tmpdir(),'puzlwerk-revision-'));
 try{const sha='0123456789abcdef0123456789abcdef01234567';await writeFile(join(dir,'SOURCE_REVISION'),sha+'\n');assert.equal(await sourceRevision(dir),sha);await writeFile(join(dir,'SOURCE_REVISION'),'invalid\n');await assert.rejects(sourceRevision(dir),/source revision/i);}finally{await rm(dir,{recursive:true,force:true})}
});

test('demo index distinguishes runnable comparisons from the source inventory',async()=>{
 const {renderDemoIndex}=await import('../build.mjs'),html=renderDemoIndex('/nested/');assert.ok(html.includes('/nested/acceptance/cubistry-picture-3/'));assert.ok(html.includes('/nested/acceptance/cubistry-playground-classic-2/'));assert.match(html,/owner.*open/i);assert.match(html,/inventory/i);
});

test('local comparison index links the real clock and calendar routes',async()=>{
 const {renderDemoIndex,renderNativeDemo}=await import('../build.mjs'),html=renderDemoIndex('/nested/');for(const id of ['clock-2','clock-3','calendar7-standard','calendar7-names','calendar7-names-any']){assert.ok(html.includes(`/nested/demo/${id}/`));assert.ok(renderNativeDemo(id,'/nested/').includes(`/nested/assets/runtime/${id.startsWith('clock')?'clock':'calendar7'}.mjs`));}
});
