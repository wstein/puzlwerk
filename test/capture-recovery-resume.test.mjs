import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Capture from '../core/res/PwCapture.res.mjs';
import * as Recovery from '../core/res/PwRecovery.res.mjs';
const faces=['U','R','F','D','L','B'];
const ok=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value};
const capture=()=>ok(Capture.createCapture({captureId:'resume',revision:0,size:4,observations:faces.map(f=>({photoId:f,slot:f,revision:0,sourceHash:'hash-'+f,sourceGrid:Array.from({length:4},()=>Array(4).fill(f))}))}));
const req=(extra={})=>({action:'findMatchingCube',searchId:'old',maxEvaluated:200,maxCandidates:64,centers:[],...extra});
const check=()=>({feasibility:{status:'pass',checkerId:'test-declared-domain',sourceRevision:'test-v1',scope:'necessary fixture constraints only',issues:[]}});
const start=c=>Recovery.beginReview(ok(Recovery.findMatchingCube(c,req(),check)));
const selectLast=r=>ok(Recovery.select(r,Recovery.revision(r),Recovery.choices(r).at(-1).placement));
const edit=c=>ok(Capture.invalidateCapture(c,Capture.snapshot(c).revision));
const resume=(c,r,extra={},checker=check)=>ok(Recovery.resumeReview(c,r,Recovery.revision(r),req({action:'resumeReview',searchId:'new',maxCandidates:8,...extra}),checker));
test('confirmed color edit carries exactly manual answers, not automatic placements; Back reopens the last decision',()=>{
 const c=capture(),before=Capture.snapshot(c);let r=selectLast(selectLast(start(c)));const oldRevision=Recovery.revision(r);
 const c2=edit(c),grids=Capture.snapshot(c2).observations.map(p=>({photoId:p.photoId,grid:p.sourceGrid.map(row=>row.map(v=>'edited-'+v))}));
 const result=resume(c2,r,{reviewedGrids:{captureRevision:1,grids}});
 assert.equal(result.carriedDecisions.length,2);assert.equal(result.conflicts.length,0);assert.equal(Recovery.revision(result.review),oldRevision+1);
 assert.ok(Recovery.describeSession(result.session).candidates.length>0);
 for(const retained of Recovery.describeSession(result.session).candidates)for(const d of result.carriedDecisions)assert.ok(retained.candidate.mapping.some(p=>JSON.stringify(p)===JSON.stringify(d)));
 assert.ok(Recovery.projectCandidate(result.session,Recovery.describeSession(result.session).candidates[0].candidate.candidateId).every(p=>p.grid.flat().every(v=>v.startsWith('edited-'))));
 const backed=ok(Recovery.backAndResumeReview(c2,result.review,Recovery.revision(result.review),req({action:'backAndResumeReview',searchId:'back',maxCandidates:64}),check));
 assert.equal(Recovery.back(result.review,Recovery.revision(result.review)).error,'BackAndResumeRequired');assert.deepEqual(backed.carriedDecisions,[result.carriedDecisions[0]]);
 const retained=Recovery.describeSession(backed.session).candidates;
 assert.ok(retained.every(c=>c.candidate.mapping.some(p=>JSON.stringify(p)===JSON.stringify(result.carriedDecisions[0]))));
 const placementKey=p=>JSON.stringify([p.photoId,p.observationRevision,p.target,p.quarterTurns]);
 assert.deepEqual([...new Set(retained.map(c=>placementKey(c.candidate.mapping.find(p=>p.target==='L'))))].sort(),['B','D'].flatMap(photoId=>[0,1,2,3].map(quarterTurns=>placementKey({photoId,observationRevision:0,target:'L',quarterTurns}))).sort());
 assert.equal(Recovery.nextTarget(backed.review),'F');
 assert.deepEqual(Recovery.choices(backed.review).map(c=>placementKey(c.placement)).sort(),[0,1].map(quarterTurns=>placementKey({photoId:'F',observationRevision:0,target:'F',quarterTurns})).sort());
 assert.equal(Recovery.select(result.review,oldRevision,Recovery.choices(result.review)[0].placement).ok,false);
 assert.deepEqual(Capture.snapshot(c),before);assert.equal(Recovery.revision(r),oldRevision);
 result.carriedDecisions[0].photoId='tamper';assert.ok(Recovery.describeSession(result.session).candidates.every(x=>x.candidate.mapping.every(p=>p.photoId!=='tamper')));
});
test('carried placement beyond unconstrained retention prefix is searched before candidate capping',()=>{
 const c=capture(),r=selectLast(start(c)),decision=Recovery.choices(start(c)).at(-1).placement,c2=edit(c);
 const unconstrained=ok(Recovery.findMatchingCube(c2,req({searchId:'plain',maxCandidates:8}),check));
 assert.ok(Recovery.describeSession(unconstrained).candidates.every(x=>!x.candidate.mapping.some(p=>JSON.stringify(p)===JSON.stringify(decision))));
 const result=resume(c2,r);const retained=Recovery.describeSession(result.session).candidates;assert.ok(retained.length>0);assert.deepEqual(result.carriedDecisions,[decision]);assert.ok(retained.every(x=>x.candidate.mapping.some(p=>JSON.stringify(p)===JSON.stringify(decision))));
});
test('retake reports retired source rather than binding its old answer to the same slot',()=>{
 const c=capture(),r=selectLast(start(c)),d=Recovery.choices(start(c)).at(-1).placement;
 const p=Capture.snapshot(c).observations.find(p=>p.photoId===d.photoId);
 const c2=ok(Capture.replaceObservation(c,0,{...p,photoId:'retake',sourceHash:'retake-hash'}));
 const result=resume(c2,r);assert.equal(result.status,'conflicts');assert.equal(result.conflicts[0].reason,'SourceChangedOrRetired');assert.equal(result.conflicts[0].decision.photoId,d.photoId);assert.equal(result.carriedDecisions.length,0);
});
test('zero retained candidates under a cap keep answers pending; complete constrained rejection is explicit',()=>{
 const c=capture(),r=selectLast(selectLast(start(c))),c2=edit(c);
 const failed=()=>({feasibility:{...check().feasibility,status:'fail'}});
 const pending=resume(c2,r,{maxEvaluated:1},failed);assert.equal(pending.status,'pending');assert.equal(pending.carriedDecisions.length,2);assert.equal(pending.conflicts.length,0);assert.equal(Recovery.describeSession(pending.session).truncated,true);
 // Two retained manual choices leave 4^4 quarter-turn assignments when all source targets are fixed by odd centers.
 const odd=ok(Capture.createCapture({...Capture.snapshot(c),size:3,observations:Capture.snapshot(c).observations.map(p=>({...p,sourceGrid:Array.from({length:3},()=>Array(3).fill(p.photoId))}))}));
 const centers=faces.map(target=>({target,color:target}));let oddReview=Recovery.beginReview(ok(Recovery.findMatchingCube(odd,req({centers}),check)));oddReview=selectLast(selectLast(oddReview));
 const complete=resume(edit(odd),oddReview,{centers,maxEvaluated:100000},failed);assert.equal(complete.status,'conflicts');assert.equal(complete.conflicts.at(-1).reason,'NoFeasibleCompletionInDeclaredDomain');assert.equal(complete.carriedDecisions.length,2);assert.equal(Recovery.describeSession(complete.session).truncated,false);
 const unknown=resume(edit(odd),oddReview,{centers,maxEvaluated:100000},()=>({feasibility:{...check().feasibility,status:'unknown'}}));assert.equal(unknown.status,'pending');assert.equal(unknown.conflicts.length,0);assert.ok(Recovery.describeSession(unknown.session).inconclusive>0);
});
test('resume guards closed/stale review, reused search ID and foreign capture; editor Cancel leaves old review usable',()=>{
 const c=capture(),r=selectLast(start(c)),rev=Recovery.revision(r),c2=edit(c);
 for(const [previous,expected,request] of [[r,rev-1,req({action:'resumeReview',searchId:'new'})],[r,rev,req({action:'resumeReview'})],[ok(Recovery.cancel(r,rev)),rev+1,req({action:'resumeReview',searchId:'new'})]])assert.equal(Recovery.resumeReview(c2,previous,expected,request,check).ok,false);
 const foreign=ok(Capture.createCapture({...Capture.snapshot(c2),captureId:'foreign'}));assert.equal(Recovery.resumeReview(foreign,r,rev,req({action:'resumeReview',searchId:'new'}),check).ok,false);
 assert.equal(Recovery.revision(r),rev);assert.ok(Recovery.choices(ok(Recovery.back(r,rev))).length>1);
});
test('prefix work is capped even when no full candidate reaches the checker',()=>{
 const c=ok(Capture.createCapture({...Capture.snapshot(capture()),size:3,observations:Capture.snapshot(capture()).observations.map(p=>({...p,sourceGrid:Array.from({length:3},()=>Array(3).fill(p.photoId==='B'?'U':p.photoId))}))}));
 const centers=faces.map(target=>({target,color:target}));let called=0;
 const s=ok(Recovery.findMatchingCube(c,req({maxEvaluated:1,centers}),()=>{called++;return check()})),summary=Recovery.describeSession(s);
 assert.equal(called,0);assert.ok(summary.workVisited<=summary.workLimit);assert.equal(summary.workVisited,summary.workLimit);assert.equal(summary.truncated,true);
 // A late impossible center cannot cause an unbounded prefix walk.
 assert.ok(summary.workLimit<=71);
});

test('canBack derives manual availability from Core history across resume, last undo and cancel',()=>{
 const c=capture(),initial=start(c);assert.equal(Recovery.canBack(initial),false);
 const chosen=selectLast(initial);assert.equal(Recovery.canBack(chosen),true);
 const resumed=resume(edit(c),chosen);assert.equal(Recovery.canBack(resumed.review),true);
 const undone=ok(Recovery.backAndResumeReview(edit(c),resumed.review,Recovery.revision(resumed.review),req({action:'backAndResumeReview',searchId:'last-back'}),check));
 assert.equal(Recovery.canBack(undone.review),false);assert.equal(undone.carriedDecisions.length,0);
 assert.equal(Recovery.canBack(ok(Recovery.cancel(chosen,Recovery.revision(chosen)))),false);
});

test('same photo ID with changed observation evidence cannot carry a prior manual answer',()=>{
 const c=capture(),r=selectLast(start(c)),choice=Recovery.choices(start(c)).at(-1).placement;
 const data=Capture.snapshot(c);
 const changed=ok(Capture.createCapture({...data,revision:1,observations:data.observations.map(p=>p.photoId===choice.photoId?{...p,sourceHash:'different-same-id'}:p)}));
 const resumed=resume(changed,r);
 assert.equal(resumed.status,'conflicts');
 assert.deepEqual(resumed.carriedDecisions,[]);
 assert.equal(resumed.conflicts[0].reason,'SourceChangedOrRetired');
 assert.equal(resumed.conflicts[0].decision.photoId,choice.photoId);
});
