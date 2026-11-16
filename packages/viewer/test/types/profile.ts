import type { CubeProjection, PieceGeometry } from '@puzlwerk/viewer';
const geometry: PieceGeometry = {cellSize:[1.012,1.012,1.012],outerSides:[[true,false],[true,false],[true,false]]};
const projection: CubeProjection = {pieces:[{id:'one',transform:{position:[0,0,0],rotation:[0,0,0,1]},stickers:[],geometry}]};
// @ts-expect-error Exterior sides are three boolean pairs.
const invalid: PieceGeometry = {cellSize:[1,1,1],outerSides:[[true,false],[true,false],[true,1]]};
void projection; void invalid;
