// Compare canonical Core poses with explicitly mapped native Cubistry identities.
export function comparePoses(nativeState, coreState) {
  const native = new Map(nativeState.cubies.map(c => [`c${c.id}`,c]));
  if (native.size !== nativeState.cubies.length || coreState.poses.length !== native.size) return false;
  return coreState.poses.every(p => {
    const c = native.get(p.pieceId);
    return c && JSON.stringify(c.position) === JSON.stringify(p.position) &&
      JSON.stringify([0,1,2].flatMap(row => [0,1,2].map(col => c.orientation[col][row]))) === JSON.stringify(p.orientation);
  });
}
