import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as Capture from '../core/res/PwCapture.res.mjs';
import * as Recovery from '../core/res/PwRecovery.res.mjs';
const faces=['U','R','F','D','L','B'];
const success=r=>{assert.equal(r.ok,true,JSON.stringify(r));return r.value};
const capture=(n=4)=>success(Capture.createCapture({captureId:'search',revision:0,size:n,observations:faces.map((f,i)=>({photoId:'photo-'+f,slot:f,revision:0,sourceHash:'source-'+f,sourceGrid:Array.from({length:n},()=>Array(n).fill(f))}))}));
const request=(extra={})=>({action:'findMatchingCube',searchId:'explicit-1',maxEvaluated:20,maxCandidates:10,centers:[],...extra});
const check=(status='pass')=>({feasibility:{status,checkerId:'ca-existing-checks',sourceRevision:'91fc2144cbcf2734f84ee3a93c70b8ed503a5151',scope:'named necessary capture checks; not full NxN reachability',issues:[]}});
test('search is explicit, bounded and never silently substitutes a guide seed',()=>{
 const c=capture();assert.equal(Recovery.findMatchingCube(c,request({action:'guideConflict'}),()=>check()).ok,false);
 const s=success(Recovery.findMatchingCube(c,request({maxCandidates:3}),()=>check()));
 const summary=Recovery.describeSession(s);assert.equal(summary.candidates.length,3);assert.equal(summary.truncated,true);assert.equal(summary.coverage,'truncated');
 assert.ok(summary.candidates.every(x=>x.wireReport===undefined));
 for(const invalid of [{maxEvaluated:0},{maxCandidates:0},{searchId:''},{maxEvaluated:Infinity}])assert.equal(Recovery.findMatchingCube(c,request(invalid),()=>check()).ok,false);
});
test('odd centers constrain source binding, even search retains whole-face bijections with immutable IDs',()=>{
 for(let size=2;size<=8;size++){
  const c=capture(size),before=Capture.snapshot(c),centers=faces.map(target=>({target,color:target}));
  const s=success(Recovery.findMatchingCube(c,request({centers,maxCandidates:2}),()=>check()));
  for(const entry of Recovery.describeSession(s).candidates){assert.equal(new Set(entry.candidate.mapping.map(p=>p.photoId)).size,6);if(size%2)for(const p of entry.candidate.mapping)assert.equal(p.photoId,'photo-'+p.target);}
  assert.deepEqual(Capture.snapshot(c),before);
  if(size%2)assert.equal(Recovery.findMatchingCube(c,request(),()=>check()).ok,false);
 }
});
test('unchecked, unnamed or failed feasibility never becomes a candidate or permission to Use',()=>{
 for(const assess of [()=>check('unknown'),()=>check('fail'),()=>({feasibility:{...check().feasibility,checkerId:''}}),()=>{throw Error('checker failed')}]){
  const s=success(Recovery.findMatchingCube(capture(),request(),assess));assert.equal(Recovery.describeSession(s).candidates.length,0);
  assert.equal(Recovery.selectedCandidate(Recovery.beginReview(s)),undefined);
 }
});
test('canonical questions preserve equal-color source ambiguity; Back, cancel and stale revisions are guarded',()=>{
 const c=capture(),s=success(Recovery.findMatchingCube(c,request({maxCandidates:4}),()=>check())),review=Recovery.beginReview(s);
 assert.equal(Recovery.nextTarget(review),'B'); // first enumerated differences are back-face turns
 const options=Recovery.choices(review);assert.equal(options.length,4);assert.equal(new Set(options.map(x=>x.placement.photoId)).size,1);
 const chosen=success(Recovery.select(review,0,options[2].placement));assert.equal(Recovery.revision(chosen),1);
 assert.equal(Recovery.select(chosen,0,options[1].placement).ok,false);
 const candidate=Recovery.selectedCandidate(chosen);assert.ok(candidate);
 assert.equal(Recovery.useCandidate(c,chosen,0,candidate.candidateId,()=>check()).ok,false);
 assert.equal(Recovery.useCandidate(c,chosen,1,'unrelated-id',()=>check()).ok,false);
 const done=success(Recovery.useCandidate(c,chosen,1,candidate.candidateId,()=>check()));assert.ok(done.confirmed);
 assert.equal(Recovery.useCandidate(c,done.review,2,candidate.candidateId,()=>check()).ok,false);
 const undone=success(Recovery.back(chosen,1));assert.equal(Recovery.selectedCandidate(undone),undefined);
 const cancelled=success(Recovery.cancel(chosen,1));assert.equal(Recovery.useCandidate(c,cancelled,2,candidate.candidateId,()=>check()).ok,false);
 assert.equal(Recovery.useCandidate(c,chosen,1,candidate.candidateId,()=>check('fail')).ok,false);
});
test('reviewed grids affect center constraints, checker and choices without changing raw observations',()=>{
 const c=capture(3),raw=Capture.snapshot(c),grids=raw.observations.map(p=>({photoId:p.photoId,grid:p.sourceGrid.map(row=>row.map(v=>'review-'+v))}));
 const centers=faces.map(target=>({target,color:'review-'+target}));
 let checked=0;
 const s=success(Recovery.findMatchingCube(c,request({maxCandidates:4,centers,reviewedGrids:{captureRevision:0,grids}}),(_,projection)=>{checked++;assert.ok(projection.every(p=>p.grid.flat().every(v=>v.startsWith('review-'))));return check()}));
 assert.ok(checked>0);assert.deepEqual(Capture.snapshot(c),raw);
 grids[0].grid[0][0]='later-mutation';
 const summary=Recovery.describeSession(s),candidate=summary.candidates[0].candidate;
 const projected=Recovery.projectCandidate(s,candidate.candidateId);assert.ok(projected.every(p=>p.grid.flat().every(v=>v.startsWith('review-'))));
 assert.ok(Recovery.choices(Recovery.beginReview(s)).every(option=>option.grid.flat().every(v=>v.startsWith('review-'))));
 const started=Recovery.beginReview(s),chosen=success(Recovery.select(started,0,Recovery.choices(started)[0].placement)),selected=Recovery.selectedCandidate(chosen);
 const committed=success(Recovery.useCandidate(c,chosen,1,selected.candidateId,()=>check()));assert.equal(committed.confirmed.projection.length,6);assert.deepEqual(committed.confirmed.projection,Recovery.projectCandidate(s,selected.candidateId));
 assert.equal(Recovery.findMatchingCube(c,request({centers,reviewedGrids:{captureRevision:1,grids}}),()=>check()).ok,false);
});
test('source ambiguity survives identical colors and full-face permutation, not just a used-source set',()=>{
 const data=Capture.snapshot(capture());data.observations.forEach(p=>p.sourceGrid.forEach(row=>row.fill('same')));const c=success(Capture.createCapture(data));
 const s=success(Recovery.findMatchingCube(c,request({maxEvaluated:9000,maxCandidates:2}),candidate=>check(candidate.mapping.every(p=>p.quarterTurns===0)?'pass':'fail')));
 const choices=Recovery.choices(Recovery.beginReview(s));assert.equal(choices.length,2);assert.notEqual(choices[0].placement.photoId,choices[1].placement.photoId);assert.deepEqual(choices[0].grid,choices[1].grid);
 const summary=Recovery.describeSession(s);assert.equal(summary.candidates.length,2);assert.equal(summary.truncated,true);
});
test('search budgets and retained data cannot be mutated by caller or checker; stale captures cannot commit',()=>{
 const c=capture(),req=request({maxCandidates:2});
 const s=success(Recovery.findMatchingCube(c,req,(candidate,projection)=>{req.maxCandidates=256;candidate.mapping[0].photoId='tampered';projection[0].grid[0][0]='tampered';return check()}));
 assert.equal(Recovery.describeSession(s).candidates.length,2);
 const first=Recovery.describeSession(s);first.candidates[0].candidate.mapping[0].photoId='tampered';assert.notEqual(Recovery.describeSession(s).candidates[0].candidate.mapping[0].photoId,'tampered');
 let review=Recovery.beginReview(s);review=success(Recovery.select(review,0,Recovery.choices(review)[0].placement));const selected=Recovery.selectedCandidate(review);assert.ok(selected);
 const changed=success(Capture.invalidateCapture(c,0));assert.equal(Recovery.useCandidate(changed,review,1,selected.candidateId,()=>check()).ok,false);
 const newSearch=success(Recovery.findMatchingCube(changed,request({maxCandidates:1}),()=>check()));assert.notEqual(Recovery.describeSession(newSearch).candidates[0].candidate.candidateId,selected.candidateId);
});
test('Core wire evidence retains profile/scope and never promotes NxN feasibility into full reachability',async()=>{
 const Codec=await import('../core/res/PwCodec.res.mjs'),Orientation=await import('../core/res/PwOrientation.res.mjs'),Shell=await import('../core/res/PwShell.res.mjs'),Pose=await import('../core/res/PwPose.res.mjs'),Id=await import('../core/res/PwId.res.mjs');
 const {definitionText}=await import('./helpers/cube-model.mjs');
 const ok=r=>{assert.equal(r.TAG,'Ok');return r._0};
 for(const n of [2,3,4,8]){const definition=ok(Codec.decodeDefinition(definitionText(n))),input={definitionJSON:definitionText(n),stateJSON:Codec.encodeState(Codec.homeState(definition)),faceTurnsAssumed:true},report=Recovery.assessWire(input);assert.equal(report.structural,true);assert.equal(report.reachability,n<=3?'verified':'unknown');assert.equal(report.profile,'faceTurnsAssumed');assert.equal(report.scope,'providedWireOnly');}
 const definition=ok(Codec.decodeDefinition(definitionText(3))),piece=Codec.pieces(definition).find(p=>p.stickers.length===3),home=Shell.toVec(piece.home),twist=Orientation.all().find(o=>{const v=Orientation.apply(o,home);return !Orientation.equal(o,Orientation.identity)&&v.x===home.x&&v.y===home.y&&v.z===home.z});
 const state=ok(Codec.stateOfPoses(definition,Codec.poses(Codec.homeState(definition)).map(p=>Id.toString(Pose.pieceId(p))===Id.toString(piece.id)?Pose.make(Pose.pieceId(p),Pose.position(p),twist):p)));
 const invalid={definitionJSON:definitionText(3),stateJSON:Codec.encodeState(state),faceTurnsAssumed:true};assert.equal(Recovery.assessWire(invalid).reachability,'disproved');
 const s=success(Recovery.findMatchingCube(capture(),request(),()=>({...check(),wire:invalid})));assert.equal(Recovery.describeSession(s).candidates.length,0);
 assert.equal(Recovery.assessWire({...invalid,stateJSON:'{}'}).structural,false);
});

test('wizard picks the first unresolved canonical target in Front Right Back Left Up Down order',()=>{
 const c=capture(),session=success(Recovery.findMatchingCube(c,request({maxEvaluated:30,maxCandidates:20}),()=>check()));
 assert.equal(Recovery.nextTarget(Recovery.beginReview(session)),'B');
});
