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
test('case shows each status separately and retains the base',()=>{const c=manifest.cases[0],html=renderCase(c,'/puzlwerk/pr-preview/pr-72/');for(const [key,value] of Object.entries(c.status))assert.ok(html.includes(`<dt>${key}</dt><dd>${value}</dd>`));assert.ok(html.includes('href="/puzlwerk/pr-preview/pr-72/"'));assert.ok(html.includes('temporary observations'))});
test('classic source comparison is mounted from the manifest at nested base',()=>{
 const c=manifest.cases.find(c=>c.id==='cubistry-playground-classic-2');
 assert.ok(c);
 const html=renderCase(c,'/puzlwerk/pr-preview/pr-77/');
 assert.ok(html.includes('id="classic"'));
 assert.ok(html.includes('/puzlwerk/pr-preview/pr-77/assets/runtime/classic.mjs'));
 assert.ok(html.includes('"three/examples/":"/puzlwerk/pr-preview/pr-77/assets/three/examples/"'));
});
