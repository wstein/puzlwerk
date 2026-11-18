import {weightedFaceExposure,type ExposureLights,createCubeStage,type StageOptions,type CubeStage,type BodyProfile,type StickerGeometry} from '../../src/index.js';
const options:StageOptions={resolveAsset:async()=>({ok:false,error:{code:'UnresolvedAsset',message:'missing'}}),fovDegrees:28,zoom:1,initialOrientation:[0,0,0,1],mode:'smart',sensitivity:.004,dragThreshold:0,reducedMotion:false,viewPolicy:()=>({distance:12,far:100,groupScale:1}),casterEnvelope:{radius:2,clearance:.08}};
declare const host:HTMLElement;
const result=createCubeStage(host,options);
if(result.ok){const stage:CubeStage=result.value;const child=stage.addCube({position:[0,0,0]});if(child.ok){stage.setStickerHighlight(child.value,["sticker:a.U"]);stage.setStickerHighlight(child.value,undefined);}
if(child.ok){child.value.setPosition([1,0,0]);child.value.setMaterial({specularIntensity:.1,roughness:.65,clearcoat:.01,receiveShadow:true});}stage.resetDisplayOrientation();stage.dispose();}

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

const materialOptions:StageOptions={...options,textureOrigin:'bottom-left',materials:{plasticRoughness:.45,stickerRoughness:.7,stickers:{'sticker:s0':{roughness:.4}}}};
void materialOptions;
// @ts-expect-error origin must be explicit and known
const invalidOrigin:StageOptions={...options,textureOrigin:'sideways'};
void invalidOrigin;

import type {PreviewStart,ScenePreview} from '../../src/index.js';
declare const previewInput:PreviewStart, previewHandle:ScenePreview;
void previewInput;void previewHandle;

import type {IndicatorSettings,InteractionMode} from '../../src/index.js';
const indicator:IndicatorSettings={physicalOrientation:[0,0,0,1],solverFrame:[0,0,0,1],colors:{x:0xff0000,y:0xffffff,z:0x00ff00}};
const interaction:InteractionMode='play';if(result.ok){result.value.setOrientationIndicator(indicator);result.value.setInteractionMode(interaction);result.value.clearOrientationIndicator();}
// @ts-expect-error Interaction mode is independent of the source rotation mode.
const invalidInteraction:InteractionMode='classic';void invalidInteraction;

import {cubePresentationRadius,presentationCameraRadius} from '../../src/index.js';
const fitted:number=presentationCameraRadius(1,cubePresentationRadius(3.5),18);
void fitted;

// Size range, view presets and external appearance/interaction control.
import {VIEW_PRESETS,viewPresetOrientation,ACCEPTED_MAX_SIZE,MAX_CUBE_SIZE} from '../../src/index.js';
import type {ViewPreset,ViewerAppearance,StageChild} from '../../src/index.js';
declare const anyChild:StageChild;
import type {PlayPlayer} from '../../src/play-pointer.js';
declare const anyPlayer:PlayPlayer;
const presetNames:readonly ViewPreset[]=VIEW_PRESETS;const poseOf:[number,number,number,number]=viewPresetOrientation('iso-back');
// @ts-expect-error Unknown preset names are rejected by the type.
const badPreset:ViewPreset='top';void badPreset;
const sizeLimits:number[]=[ACCEPTED_MAX_SIZE,MAX_CUBE_SIZE];void sizeLimits;
if(result.ok){
  const s=result.value;
  s.setViewPreset('isometric');s.setDisplayOrientation(poseOf);void presetNames;
  const stickerless:ViewerAppearance={construction:'stickerless',frameColor:null};
  void s.setAppearance(stickerless).then(r=>r.ok);const current:ViewerAppearance=s.getAppearance();const mode:InteractionMode=s.getInteractionMode();void current;void mode;
  s.setPlayTarget({child:anyChild,player:anyPlayer,size:15,layerWidths:[1.6,1,1,1,1,1,1,1,1,1,1,1,1,1,1.6]});
}
