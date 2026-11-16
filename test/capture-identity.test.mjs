import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as Capture from '../core/res/PwCapture.res.mjs';
import * as Orientation from '../core/res/PwOrientation.res.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/capture-photo-identity-4.json',import.meta.url)));
const success=result=>{assert.equal(result.ok,true,JSON.stringify(result));return result.value};
const open=(input=structuredClone(fixture.capture),candidate=structuredClone(fixture.candidate))=>{const capture=success(Capture.createCapture(input));return [capture,success(Capture.createCandidate(capture,candidate))]};
test('real logo/checkerboard capture uses six authoritative photos before Use, independent of order',()=>{
 for(const observations of [fixture.capture.observations,[...fixture.capture.observations].reverse()]){
  const [capture,candidate]=open({...structuredClone(fixture.capture),observations:structuredClone(observations)});
  const projected=success(Capture.projectMapping(capture,candidate,Capture.identityTransform()));
  assert.equal(new Set(projected.map(p=>p.photoId)).size,6);
  for(const [face,slot] of Object.entries({U:'L',D:'B',F:'D',B:'R',R:'U',L:'F'}))assert.equal(Capture.photoForFace(capture,candidate,face).slot,slot);
  assert.notEqual(Capture.photoForFace(capture,candidate,'U').photoId,Capture.photoForFace(capture,candidate,'D').photoId);
  const text=['U','R','F','D','L','B'].map(face=>Capture.photoForFace(capture,candidate,face).grid.flat().join('')).join(' ');
  assert.equal(text,fixture.assembledURFDLB);
 }
});
test('capture inputs, candidate inputs and all public snapshots are detached',()=>{
 const input=structuredClone(fixture.capture),mapping=structuredClone(fixture.candidate),[capture,candidate]=open(input,mapping);
 input.observations[0].sourceGrid[0][0]='changed';mapping.mapping[0].photoId='changed';
 Capture.snapshot(capture).observations[0].sourceGrid[0][0]='changed';Capture.describeCandidate(candidate).mapping[0].photoId='changed';
 const first=Capture.photoForFace(capture,candidate,'U');first.grid[0][0]='changed';
 assert.equal(Capture.photoForFace(capture,candidate,'U').grid[0][0],fixture.capture.observations.find(p=>p.slot==='L').sourceGrid[0][0]);
 assert.deepEqual(Capture.snapshot(capture),fixture.capture);assert.deepEqual(Capture.describeCandidate(candidate),{...fixture.candidate,legacyTransform:undefined});
});
test('unknown association stays unknown and stale or incomplete evidence is rejected',()=>{
 const [capture,candidate]=open();assert.equal(Capture.photoForFace(capture,undefined,'U'),undefined);
 const changed=structuredClone(fixture.capture);changed.observations[0].sourceGrid[0][0]='changed';const other=success(Capture.createCapture(changed));
 assert.equal(Capture.photoForFace(other,candidate,'U'),undefined);
 for(const mutate of [c=>c.mapping.pop(),c=>c.mapping[0].photoId=c.mapping[1].photoId,c=>c.mapping[0].target=c.mapping[1].target,c=>c.mapping[0].observationRevision++,c=>c.mapping[0].quarterTurns=1.5,c=>c.mappingFrame='capture',c=>c.captureRevision++,c=>c.canonicalTransform=[-1,0,0,0,1,0,0,0,1]]){
  const c=structuredClone(fixture.candidate);mutate(c);assert.equal(Capture.createCandidate(capture,c).ok,false);
 }
 const partial=structuredClone(fixture.capture);partial.observations.pop();assert.equal(Capture.createCapture(partial).ok,true);assert.equal(Capture.createCandidate(success(Capture.createCapture(partial)),fixture.candidate).ok,false);
});
test('canonical provenance is not applied a second time and source IDs survive all 24 proper display transforms',()=>{
 const rotations=Orientation.all();assert.equal(rotations.length,24);
 const base=structuredClone(fixture.candidate);base.canonicalTransform=Orientation.toArray(rotations[1]);
 const [capture,candidate]=open(undefined,base);assert.equal(Capture.photoForFace(capture,candidate,'U').slot,'L');
 for(const rotation of rotations){
  const matrix=Orientation.toArray(rotation),projection=success(Capture.projectMapping(capture,candidate,matrix));
  assert.equal(new Set(projection.map(p=>p.photoId)).size,6);assert.equal(new Set(projection.map(p=>p.target)).size,6);
  assert.equal(Capture.projectMapping(capture,candidate,[-1,0,0,0,1,0,0,0,1]).ok,false);
  for(const p of projection){const photo=fixture.capture.observations.find(x=>x.photoId===p.photoId);assert.equal(p.grid.flat().length,photo.sourceGrid.flat().length);assert.deepEqual([...p.grid.flat()].sort(),[...photo.sourceGrid.flat()].sort());}
 }
});
test('same colors never collapse separate photo identities for sizes 2 through 8 and each quarter turn',()=>{
 for(let size=2;size<=8;size++)for(let q=0;q<4;q++){
  const input=structuredClone(fixture.capture);input.size=size;input.observations.forEach(p=>p.sourceGrid=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>`${r}:${c}`)));
  const mapping=structuredClone(fixture.candidate);mapping.mapping.forEach(p=>p.quarterTurns=q);
  const [capture,candidate]=open(input,mapping),projection=success(Capture.projectMapping(capture,candidate,Capture.identityTransform()));
  assert.equal(new Set(projection.map(p=>p.photoId)).size,6);assert.equal(projection[0].quarterTurns,q);
  assert.equal(projection[0].grid[0][0],[`0:0`,`${size-1}:0`,`${size-1}:${size-1}`,`0:${size-1}`][q]);
 }
});

test('legacy canonical slot evidence preserves unknown global capture frame without identity guesses',()=>{
 const capture=success(Capture.createCapture(fixture.capture));
 const input={...fixture.candidate,canonicalTransform:undefined,legacyTransform:{convention:'cube-geometry-orientations/v1',index:13},mapping:fixture.candidate.mapping.map(p=>({slot:p.photoId.split('/')[1],target:p.target,quarterTurns:p.quarterTurns}))};
 const candidate=success(Capture.createCandidateFromSlots(capture,input));
 assert.equal(Capture.photoForFace(capture,candidate,'D').slot,'B');
 assert.equal(Capture.describeCandidate(candidate).canonicalTransform,undefined);
 assert.equal(Capture.describeCandidate(candidate).legacyTransform.index,13);
 input.mapping[0].slot='unknown';assert.equal(Capture.createCandidateFromSlots(capture,input).ok,false);
});
test('retakes and invalidation increment core-owned revisions, retaining immutable source history',()=>{
 const [capture,candidate]=open(),photo={...fixture.capture.observations[0],photoId:'retaken-new-id',revision:999};
 const next=success(Capture.replaceObservation(capture,0,photo));
 assert.equal(Capture.snapshot(next).revision,1);assert.equal(Capture.snapshot(next).observations.find(p=>p.slot===photo.slot).revision,1);
 assert.equal(Capture.observationHistory(next).length,7);assert.equal(Capture.observationHistory(capture).length,6);
 assert.equal(Capture.photoForFace(next,candidate,'U'),undefined);
 assert.equal(Capture.replaceObservation(capture,1,photo).ok,false);assert.equal(Capture.replaceObservation(capture,0,fixture.capture.observations[0]).ok,false);
 const invalidated=success(Capture.invalidateCapture(next,1));assert.equal(Capture.snapshot(invalidated).revision,2);assert.equal(Capture.observationHistory(invalidated).length,7);
 assert.equal(Capture.invalidateCapture(invalidated,1).ok,false);
});
test('atomic synchronization rejects immutable rewrites, owns revisions and verifies actual source hashes',()=>{
 const [capture,candidate]=open(),same=structuredClone(fixture.capture.observations);
 const unchanged=success(Capture.synchronizeObservations(capture,0,same));assert.equal(Capture.snapshot(unchanged).revision,0);
 for(const key of ['sourceHash','sourceGrid','guideProtocol','mirrored']){const changed=structuredClone(same);changed[0][key]=key==='sourceGrid'?[['changed']]:key==='mirrored'?false:'changed';assert.equal(Capture.synchronizeObservations(capture,0,changed).ok,false);}
 const retake=structuredClone(same);retake[0].photoId='new-at-slot';retake[0].revision=999;
 const next=success(Capture.synchronizeObservations(capture,0,retake));assert.equal(Capture.snapshot(next).revision,1);assert.equal(Capture.snapshot(next).observations[0].revision,1);assert.equal(Capture.observationHistory(next).length,7);
 assert.equal(Capture.photoForFace(next,candidate,'U'),undefined);
 const removed=success(Capture.synchronizeObservations(next,1,retake.slice(1)));assert.equal(Capture.snapshot(removed).observations.length,5);assert.equal(Capture.snapshot(removed).revision,2);
 assert.equal(Capture.verifySourceHash(capture,same[0].photoId,same[0].sourceHash),true);assert.equal(Capture.verifySourceHash(capture,same[0].photoId,'0'.repeat(64)),false);assert.equal(Capture.verifySourceHash(capture,same[0].photoId,'not-a-hash'),false);
});
test('marked source cells project exactly through all proper matrices, every face and quarter turn',()=>{
 const basis={U:[[0,1,0],[0,0,-1]],R:[[1,0,0],[0,1,0]],F:[[0,0,1],[0,1,0]],D:[[0,-1,0],[0,0,1]],L:[[-1,0,0],[0,1,0]],B:[[0,0,-1],[0,1,0]]};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),mul=(m,v)=>[0,1,2].map(r=>dot(m.slice(r*3,r*3+3),v));
 for(let n=2;n<=8;n++)for(let q=0;q<4;q++){
  const input=structuredClone(fixture.capture);input.size=n;input.observations.forEach(p=>p.sourceGrid=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>`${p.slot}/${r}/${c}`)));
  const mapping=structuredClone(fixture.candidate);mapping.mapping.forEach(p=>p.quarterTurns=q);const [capture,candidate]=open(input,mapping);
  for(const rotation of Orientation.all()){
   const matrix=Orientation.toArray(rotation),projection=success(Capture.projectMapping(capture,candidate,matrix));
   for(const entry of mapping.mapping){const normal=basis[entry.target][0],up=basis[entry.target][1],right=cross(up,normal),target=Object.keys(basis).find(f=>dot(basis[f][0],mul(matrix,normal))===1),p=projection.find(p=>p.target===target),targetRight=cross(basis[target][1],basis[target][0]);
    for(let r=0;r<n;r++)for(let c=0;c<n;c++){let rr=r,cc=c;for(let i=0;i<q;i++)[rr,cc]=[cc,n-1-rr];const point=normal.map((x,i)=>x*n+up[i]*(n-1-2*rr)+right[i]*(2*cc-(n-1))),transformed=mul(matrix,point),tr=(n-1-dot(transformed,basis[target][1]))/2,tc=(dot(transformed,targetRight)+(n-1))/2;assert.equal(p.grid[tr][tc],`${p.slot}/${r}/${c}`);}
   }
  }
 }
});
