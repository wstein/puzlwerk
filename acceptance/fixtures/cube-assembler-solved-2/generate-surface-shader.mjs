import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
export async function generateSurfaceShader() {
 const source=await readFile(new URL('../../references/cube-assembler/src/client/view3d/cubeView3DGraphics.ts',import.meta.url),'utf8');
 const vertex=source.match(/const VS_SOURCE = `([\s\S]*?)`/), fragment=source.match(/const FS_SOURCE = `([\s\S]*?)`/);
 if(!vertex||!fragment) throw Error('Native surface shaders not found');
 return {source:'src/client/view3d/cubeView3DGraphics.ts',sourceSha256:createHash('sha256').update(source).digest('hex'),vertex:vertex[1],fragment:fragment[1]};
}
