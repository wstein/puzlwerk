import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {shadowOutline,paddedOutline,shadowFloorY,shadowOutlinePoints} from '../../references/cube-assembler/src/core/view/CubeShadow.res.mjs';
export async function generateShadow() {
 const dir=new URL('../../references/cube-assembler/',import.meta.url);
 const source=await readFile(new URL('src/client/view3d/cubeShadow.ts',dir),'utf8');
 const fragment=source.match(/const SHADOW_FS = `([\s\S]*?)`/);
 const vertex=source.match(/const SHADOW_VS = `([\s\S]*?)`/);
 if(!fragment||!vertex) throw Error('Native shadow shader not found');
 const outline=shadowOutline(2,.52,-.74);
 return {size:2,pitch:.52,yaw:-.74,soft:2*.2,alpha:.3,floorY:shadowFloorY(2),outline,outlinePoints:shadowOutlinePoints,padded:Array.from(paddedOutline(outline)),shader:{vertex:vertex[1],fragment:fragment[1].replaceAll('${SHADOW_OUTLINE_POINTS - 1}',String(shadowOutlinePoints-1)).replaceAll('${SHADOW_OUTLINE_POINTS}',String(shadowOutlinePoints))},sourceSha256:{cubeShadowTs:createHash('sha256').update(source).digest('hex'),cubeShadowRes:createHash('sha256').update(await readFile(new URL('src/core/view/CubeShadow.res',dir))).digest('hex')}};
}
