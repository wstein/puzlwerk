import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {createHash} from 'node:crypto';
import {createSolvedCube} from '../../references/cube-assembler/src/cube/CapturedFaceMatching.res.mjs';
const source=new URL('../../references/cube-assembler/src/core/view/CubeMesh.res.mjs',import.meta.url);
const expected='933572b4c007430b3d1e601426241558a2a3cfab2772301e3621b790220f040a';
function replaceOnce(text,needle,replacement) {
 if(text.split(needle).length!==2) throw Error('Instrumentation source mismatch');
 return text.replace(needle,replacement);
}
export async function generateRawMesh(turn=undefined) {
 const hook=registerHooks({load(url,context,next){if(url.endsWith('.json'))return {format:'module',source:'export default '+readFileSync(new URL(url),'utf8'),shortCircuit:true};return next(url,context)}});
 let original; let defaultStickerHex;
 try {original=await import(source.href); ({defaultStickerHex}=await import(new URL('../../references/cube-assembler/src/core/view/CubeViewState.res.mjs',import.meta.url).href));} finally {hook.deregister();}
 let text=await readFile(source,'utf8');
 if(createHash('sha256').update(text).digest('hex')!==expected) throw Error('Native compiled source hash mismatch');
 text=text.replace(/from "([^"]+)"/g,(_,spec)=>`from "${spec.startsWith('.')?new URL(spec,source).href:import.meta.resolve(spec)}"`);
 text=replaceOnce(text,'  let idxList = [];','  let idxList = [];\n  let __ranges = [];');
 const body='            addBeveledFace(cx, cy, cz, a.u, a.v, a.n, 0.495, 0.058, darkPlastic, 0.0, seams);';
 text=replaceOnce(text,body,`            let __start = idxList.length;\n${body}\n            __ranges.push({owner:[x,y,z],role:'body',face,firstIndex:__start,indexCount:idxList.length-__start});`);
 const sticker='            addBeveledFace(cx, cy, cz, a.u, a.v, a.n, 0.43, 0.045, rgb, 0.495 - 0.43 + 0.005, {';
 text=replaceOnce(text,sticker,`            let __stickerStart = idxList.length;\n${sticker}`);
 const stickerEnd='              lt: true\n            });\n          });\n        }\n        exterior.forEach';
 text=replaceOnce(text,stickerEnd,`              lt: true\n            });\n            __ranges.push({owner:[x,y,z],role:'sticker',face,firstIndex:__stickerStart,indexCount:idxList.length-__stickerStart});\n          });\n        }\n        exterior.forEach`);
 const cap='          addTri(bottomLeft, bottomRight, topRight, normal, normal, normal, darkPlastic, 1.0);\n          addTri(bottomLeft, topRight, topLeft, normal, normal, normal, darkPlastic, 1.0);';
 text=replaceOnce(text,cap,`          let __capStart = idxList.length;\n${cap}\n          __ranges.push({owner:[x,y,z],role:'cap',face,firstIndex:__capStart,indexCount:idxList.length-__capStart});`);
 text=replaceOnce(text,'    positions: new Float32Array(posList),','    ranges: __ranges,\n    positions: new Float32Array(posList),');
 const instrumented=await import(`data:text/javascript;base64,${Buffer.from(text).toString('base64')}`);
 const cube=createSolvedCube(2);
 const baseline=original.buildCubeMesh(cube,2,defaultStickerHex,false,turn);
 const mesh=instrumented.buildCubeMesh(cube,2,defaultStickerHex,false,turn);
 return {mesh,baseline,ranges:mesh.ranges};
}
