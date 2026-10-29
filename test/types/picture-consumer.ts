import {
  solvePicture3x3,
  PICTURE_SOLVER_API_VERSION,
  type PictureRequest,
} from "@puzlwerk/solver-3x3-picture";
const version: 1 = PICTURE_SOLVER_API_VERSION;
const request: PictureRequest = {
  facelets: "",
  centerOrientations: [0, 0, 0, 0, 0, 0],
  symmetry: [1, 1, 4, 1, 1, 1],
};
const result = solvePicture3x3(request);
if (result.status === "solved") {
  const count: number = result.htm;
  // @ts-expect-error Answers are immutable.
  result.moves.push("R");
} else {
  const reason: string = result.reason;
}
// @ts-expect-error Unsupported optical period.
solvePicture3x3({ facelets: "", centerOrientations: [], symmetry: [3] });
