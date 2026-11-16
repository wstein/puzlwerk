// Cubistry stores transformed basis vectors as columns; wire uses row-major matrices.
export function toWireState(state) {
  return {schema:'puzlwerk.state',revision:1,definitionId:state.printId,poses:state.cubies.map(c=>({pieceId:`c${c.id}`,position:c.position,orientation:[0,1,2].flatMap(row=>[0,1,2].map(col=>c.orientation[col][row]))}))};
}
