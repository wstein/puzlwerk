import {weightedFaceExposure,type ExposureLights,createCubeStage,type StageOptions,type CubeStage,type BodyProfile,type StickerGeometry} from '../../src/index.js';
const options:StageOptions={resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'missing'}}),fovDegrees:28,zoom:1,initialOrientation:[0,0,0,1],mode:'smart',sensitivity:.004,dragThreshold:0,reducedMotion:false,viewPolicy:()=>({distance:12,far:100,groupScale:1}),casterEnvelope:{radius:2,clearance:.08}};
declare const host:HTMLElement;
const result=createCubeStage(host,options);
if(result.ok){const stage:CubeStage=result.value;const child=stage.addCube({position:[0,0,0]});if(child.ok){child.value.setPosition([1,0,0]);child.value.setMaterial({specularIntensity:.1,roughness:.65,clearcoat:.01,receiveShadow:true});}stage.resetDisplayOrientation();stage.dispose();}

const body:BodyProfile={kind:'twoRadius',gap:.001,bevelSegments:2};
const shape:StickerGeometry={referenceSize:[.87,.87],cornerRadius:.055};
void body; void shape;

const lights:ExposureLights={ambient:1,hemispheres:[],directionals:[]};
weightedFaceExposure(lights,[0,0,0,1],[0,0,1]);

import type {CubeScene,Transition,MotionTimingSource} from '../../src/index.js';
declare const timedScene:CubeScene,transition:Transition;
const timing:MotionTimingSource=()=>({endAt:200,durationMs:100,revision:1});
timedScene.transition(transition,timing);
// @ts-expect-error timing is a source callback, not a timing object
timedScene.transition(transition,{endAt:200,durationMs:100,revision:1});
