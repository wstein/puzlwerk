import {h, render} from 'preact';
import {CubeView3D} from './src/client/view3d/cubeView3D';
import {createSolvedCube} from './src/cube/CapturedFaceMatching.gen';
import {applyCubeMove} from './src/cube/CubeMoves.gen';
export function mountOriginal(host: HTMLElement) {
  let state = createSolvedCube(2);
  const draw = () => render(h(CubeView3D, {cube: state, puzzleSize: 2, stickerless: false, onTurnStateChange: next => { state = next; }}), host);
  draw();
  return {move(face: 'R'|'U', turns: number) { state = applyCubeMove(state,2,face,turns); draw(); }, getState() {return state}, dispose() {render(null,host)}};
}
