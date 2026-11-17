// SPDX-License-Identifier: AGPL-3.0-or-later
// Stage-level bookkeeping of the sticker outline and of the appearance panel option, kept free of WebGL so it can be tested.
import type {Object3D} from 'three';
export interface StickerOutline{showStickers(parent:Object3D,stickerIds:readonly string[]):void;clear():void;dispose():void}
/** One outline per stage: set replaces it, an empty list or undefined clears it, disposing its child clears it. */
export function createStickerHighlight<Child>(outline:StickerOutline,parentOf:(child:Child)=>Object3D|undefined){
 let highlighted:Child|undefined;
 return {
  /** False when the child is unknown or the IDs are not a list of strings; nothing changes then. */
  set(child:Child,stickerIds:readonly string[]|undefined):boolean{
   const parent=parentOf(child);
   if(!parent||(stickerIds!==undefined&&(!Array.isArray(stickerIds)||stickerIds.some(id=>typeof id!=='string'))))return false;
   if(stickerIds&&stickerIds.length){outline.showStickers(parent,stickerIds);highlighted=child}else{outline.clear();highlighted=undefined}
   return true;
  },
  childDisposed(child:Child):void{if(highlighted===child){outline.clear();highlighted=undefined}},
  dispose():void{outline.dispose();highlighted=undefined}
 };
}
/** The panel stays shown unless the host asked for 'hidden'. */
export function applyAppearanceControls(panel:{style:{display:string}},mode:'floating'|'hidden'|undefined):void{if(mode==='hidden')panel.style.display='none'}
