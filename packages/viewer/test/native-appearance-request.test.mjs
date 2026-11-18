// SPDX-License-Identifier: AGPL-3.0-or-later
// Stickerless (and frame color) set from outside through the appearance controls: same acceptance path as the checkbox, nothing stored.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installAppearanceControls} from '../dist/native-appearance.js';
class Element {
 constructor(tag){this.tagName=tag;this.style={};this.children=[];this.listeners={};this.attributes={};this.dataset={};}
 append(...nodes){for(const node of nodes){node.parent=this;this.children.push(node);}}
 insertBefore(node,ref){node.parent=this;const i=this.children.indexOf(ref);this.children.splice(i<0?this.children.length:i,0,node);}
 setAttribute(k,v){this.attributes[k]=String(v)} addEventListener(k,fn){this.listeners[k]=fn}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
}
const walk=(e)=>[e,...e.children.flatMap(walk)];
function setup(change){const document={createElement:tag=>new Element(tag)},host=new Element('host'),writes=[];
 const storage={getItem:()=>null,setItem:(k,v)=>writes.push([k,v])};const controls=installAppearanceControls(host,change,{environment:{document,storage},storageKey:'view'});
 const sticker=walk(host).find(x=>x.tagName==='input'&&x.type==='checkbox'&&x.attributes['aria-label']==='Stickerless'),color=walk(host).find(x=>x.tagName==='input'&&x.type==='color');
 return{host,writes,controls,sticker,color};}

test('request applies stickerless through the callback, shows it in the panel and stores nothing',async()=>{
  const seen=[],h=setup(v=>{seen.push(v);return true});
  assert.equal(h.sticker.checked,false);
  assert.equal(await h.controls.request({construction:'stickerless',frameColor:null}),true);
  assert.equal(h.sticker.checked,true);
  assert.deepEqual(seen.at(-1),{construction:'stickerless',frameColor:null});
  assert.equal(await h.controls.request({construction:'stickered',frameColor:'#123456'}),true);
  assert.equal(h.sticker.checked,false);assert.equal(h.color.value,'#123456');
  assert.deepEqual(h.writes,[]);
});

test('request refuses an invalid value, a rejected one and one made while another is pending',async()=>{
  let calls=0;const h=setup(()=>{calls++;return true});const before=calls;
  for(const bad of [{construction:'x',frameColor:null},{construction:'stickered',frameColor:'red'},undefined,null])assert.equal(await h.controls.request(bad),false);
  assert.equal(calls,before);
  let reject=false;const r=setup(()=>!reject);reject=true;
  assert.equal(await r.controls.request({construction:'stickerless',frameColor:null}),false);assert.equal(r.sticker.checked,false);
  let resolve,first=true;const p=setup(()=>{if(first){first=false;return true}return new Promise(x=>{resolve=x})});
  const pending=p.controls.request({construction:'stickerless',frameColor:null});
  assert.equal(await p.controls.request({construction:'stickered',frameColor:'#abcdef'}),false);
  resolve(true);assert.equal(await pending,true);assert.equal(p.sticker.checked,true);
});

test('request after dispose is false',async()=>{const h=setup(()=>true);h.controls.dispose();assert.equal(await h.controls.request({construction:'stickerless',frameColor:null}),false)});
