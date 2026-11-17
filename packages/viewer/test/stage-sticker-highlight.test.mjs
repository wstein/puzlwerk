import {test} from 'node:test';import assert from 'node:assert/strict';
import {createStickerHighlight,applyAppearanceControls} from '../dist/stage-sticker-highlight.js';
const make=()=>{const calls=[],outline={showStickers:(parent,ids)=>calls.push(['show',parent,[...ids]]),clear:()=>calls.push(['clear']),dispose:()=>calls.push(['dispose'])};
  const parents=new Map(),highlight=createStickerHighlight(outline,child=>parents.get(child));return {calls,parents,highlight}};
test('set shows the IDs on the parent of a known child and reports success',()=>{
  const {calls,parents,highlight}=make(),child={},parent={};parents.set(child,parent);
  assert.equal(highlight.set(child,['a','b']),true);assert.deepEqual(calls,[['show',parent,['a','b']]]);
});
test('an unknown child or a non-list of strings changes nothing and fails',()=>{
  const {calls,parents,highlight}=make(),child={};parents.set(child,{});
  assert.equal(highlight.set({},['a']),false);assert.equal(highlight.set(child,'a'),false);assert.equal(highlight.set(child,['a',1]),false);
  assert.deepEqual(calls,[]);
});
test('an empty list or undefined clears the outline',()=>{
  for(const none of [[],undefined]){const {calls,parents,highlight}=make(),child={};parents.set(child,{});highlight.set(child,['a']);calls.length=0;assert.equal(highlight.set(child,none),true);assert.deepEqual(calls,[['clear']])}
});
test('disposing the highlighted child clears the outline once; other children and later calls do nothing',()=>{
  const {calls,parents,highlight}=make(),a={},b={};parents.set(a,{});parents.set(b,{});
  highlight.set(a,['x']);calls.length=0;
  highlight.childDisposed(b);assert.deepEqual(calls,[]);
  highlight.childDisposed(a);assert.deepEqual(calls,[['clear']]);
  highlight.childDisposed(a);assert.deepEqual(calls,[['clear']]);
});
test('disposing the stage disposes the outline',()=>{const {calls,highlight}=make();highlight.dispose();assert.deepEqual(calls,[['dispose']])});
test('the appearance panel is hidden only for hidden',()=>{
  for(const [mode,display] of [[undefined,''],['floating',''],['hidden','none']]){const panel={style:{display:''}};applyAppearanceControls(panel,mode);assert.equal(panel.style.display,display,String(mode))}
});
