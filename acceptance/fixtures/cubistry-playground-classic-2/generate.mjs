// Run with Node 24 and a clean Cubistry checkout at the revision below.
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const source = process.argv[2];
if (!source) throw Error('Pass the path to the pinned Cubistry checkout');
const git = (...args) => execFileSync('git', ['-C', source, ...args], {encoding:'utf8'}).trim();
if (git('rev-parse', 'HEAD') !== 'efafcc1d97687eccea0cde87a230f447ce1b6c66') throw Error('Unexpected Cubistry revision');
if (git('status', '--porcelain', '--untracked-files=no')) throw Error('Cubistry checkout has tracked changes');
const load = path => import(pathToFileURL(resolve(source, path)).href);
const { createDesign } = await load('src/apps/playground/model.ts');
const { parseAlg, applyMoves } = await load('packages/cube-mechanics/src/index.ts');
const {print, assets, target} = createDesign('classic');
let state = target;
const trace = ['R', 'U', "R'", "U'"].map(action => ({action, state: state = applyMoves(state, parseAlg(action))}));
process.stdout.write(JSON.stringify({print, assets, target, trace}, null, 2) + '\n');
