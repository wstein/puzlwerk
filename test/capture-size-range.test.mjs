import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Capture from '../core/res/PwCapture.res.mjs';
import * as Recovery from '../core/res/PwRecovery.res.mjs';
// Owner decision 2026-11-18: capture accepts 2x2 through 15x15. The literal 15 is independent of the constant under test.
const faces=['U','R','F','D','L','B'];
const success=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value};
const input=size=>({captureId:`range-${size}`,revision:0,size,observations:faces.map(f=>({photoId:`photo-${f}`,slot:f,revision:0,sourceHash:`hash-${f}`,sourceGrid:Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>`${f}${r}:${c}`))}))});
const plain=v=>JSON.parse(JSON.stringify(v));
const sizes=Array.from({length:14},(_,i)=>i+2);
const check=()=>({feasibility:{status:'pass',checkerId:'ca-existing-checks',sourceRevision:'range',scope:'size range test',issues:[]}});
test('the acceptance bound is one named constant equal to 15',()=>{assert.equal(Capture.maxAcceptedSize,15)});
for(const size of sizes){
  test(`capture of size ${size}x${size} is created and round-trips through its snapshot`,()=>{
    const data=input(size),capture=success(Capture.createCapture(data));
    assert.deepEqual(plain(Capture.snapshot(capture)),data);
    const again=success(Capture.createCapture(Capture.snapshot(capture)));
    assert.deepEqual(plain(Capture.snapshot(again)),data);assert.equal(again.fingerprint,capture.fingerprint);
  });
  test(`size ${size}x${size}: mapping projects every photo and the bounded search runs`,()=>{
    const capture=success(Capture.createCapture(input(size)));
    const flat=input(size);flat.observations.forEach(p=>p.sourceGrid=p.sourceGrid.map(row=>row.map(()=>p.slot)));
    const flatCapture=success(Capture.createCapture(flat));
    const candidate=success(Capture.createCandidate(capture,{candidateId:'c',captureRevision:0,mappingFrame:'canonical',canonicalTransform:undefined,legacyTransform:undefined,mapping:faces.map(f=>({photoId:`photo-${f}`,observationRevision:0,target:f,quarterTurns:1}))}));
    const projection=success(Capture.projectMapping(capture,candidate,Capture.identityTransform()));
    assert.equal(projection.length,6);
    for(const p of projection){assert.equal(p.grid.length,size);assert.equal(p.grid[0].length,size);assert.equal(p.grid[0][0],`${p.target}${size-1}:0`);}
    const session=success(Recovery.findMatchingCube(flatCapture,{action:'findMatchingCube',searchId:'s',maxEvaluated:5,maxCandidates:2,centers:faces.map(target=>({target,color:target})),reviewedGrids:undefined},()=>check()));
    assert.ok(Recovery.describeSession(session).candidates.length>=1);
  });
}
test('sizes below 2, above 15, fractional and non-finite are rejected',()=>{
  for(const size of [-1,0,1,16,64,65,2.5,NaN,Infinity])assert.deepEqual(Capture.createCapture({...input(2),size}),{ok:false,error:'InvalidCapture'},String(size));
});
test('odd sizes bind photos by a distinguishable middle cell, never by other cells',()=>{
  for(const size of sizes.filter(n=>n%2===1)){
    const data=input(size),mid=(size-1)/2;
    data.observations.forEach(p=>{p.sourceGrid=p.sourceGrid.map(row=>row.map(()=>'x'));p.sourceGrid[mid][mid]=p.slot});
    const capture=success(Capture.createCapture(data)),centers=faces.map(target=>({target,color:target}));
    const session=success(Recovery.findMatchingCube(capture,{action:'findMatchingCube',searchId:'m',maxEvaluated:5,maxCandidates:2,centers,reviewedGrids:undefined},()=>check()));
    const entries=Recovery.describeSession(session).candidates;assert.ok(entries.length>=1,String(size));
    for(const e of entries)for(const p of e.candidate.mapping)assert.equal(p.photoId,'photo-'+p.target,String(size));
    const wrong=faces.map(target=>({target,color:'w'+target}));
    const none=success(Recovery.findMatchingCube(capture,{action:'findMatchingCube',searchId:'m2',maxEvaluated:5,maxCandidates:2,centers:wrong,reviewedGrids:undefined},()=>check()));
    assert.equal(Recovery.describeSession(none).candidates.length,0,String(size));
  }
});
