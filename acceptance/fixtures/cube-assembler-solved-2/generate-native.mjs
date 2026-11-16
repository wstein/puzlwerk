import {createSolvedCube} from '../../references/cube-assembler/src/cube/CapturedFaceMatching.res.mjs';
import {applyCubeMove} from '../../references/cube-assembler/src/cube/CubeMoves.res.mjs';
export function generateNative() {
 const home=createSolvedCube(2); let state=home;
 const trace=[['R',1],['U',1],['R',-1],['U',-1]].map(([face,turns])=>({face,turns,state:state=applyCubeMove(state,2,face,turns)}));
 return {size:2,home,trace};
}
