import { CubeViewer } from '@cubistry/cube-viewer';
import { loadAssets } from '@cubistry/cube-assets';
import { parseMove, presentMove } from '@cubistry/cube-mechanics';

// Reference path uses Cubistry's physical state and viewer, independently of the candidate.
export async function mountOriginal(root, fixture, base = '/') {
  const loaded = await loadAssets(fixture.assets, [fixture.print], undefined, new URL(base, location.href).pathname);
  const viewer = new CubeViewer(root);
  let state = fixture.target;
  viewer.configure(fixture.print, state, loaded);
  return {
    async move(token) { const presentation=presentMove(state,parseMove(token));await viewer.animate(presentation);state=presentation.to; },
    getState() { return state; },
    dispose() { viewer.destroy(); loaded.dispose(); },
  };
}
