import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'puzlwerk-viewer-consumer-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--workspace', '@puzlwerk/viewer', '--pack-destination', dir, '--json'], {encoding:'utf8'}))[0];
  for (const path of ['dist/index.js', 'dist/index.d.ts', 'NOTICE', 'CORE_EUPL_LICENSE.txt', 'dist/bridge/index.mjs', 'dist/bridge/index.d.mts', 'dist/bridge/cube-state.mjs', 'dist/bridge/core/PwCodec.res.mjs']) {
    if (!packed.files.some(file => file.path === path)) throw Error(`Packed viewer package is missing ${path}`);
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify({name:'viewer-isolated-consumer', version:'0.0.0', private:true, type:'module'}));
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', join(dir, packed.filename)], {cwd:dir, stdio:'pipe'});
  writeFileSync(join(dir, 'consumer.mjs'), "import {createCubeScene,createCubeStage,weightedFaceExposure} from '@puzlwerk/viewer'; if ([createCubeScene,createCubeStage,weightedFaceExposure].some(value => typeof value !== 'function')) throw Error('Missing viewer export'); console.log('Isolated viewer package PASS');\n");
  execFileSync(process.execPath, ['consumer.mjs'], {cwd:dir, stdio:'inherit'});
  writeFileSync(join(dir, 'bridge.mjs'), "import {cubeStateDocuments, open, faceStickerIds} from '@puzlwerk/viewer/bridge'; const f=c=>Array(4).fill(c), made=cubeStateDocuments(2,{u:f('W'),r:f('R'),f:f('G'),d:f('Y'),l:f('O'),b:f('B')},{W:'#ffffff',R:'#ff0000',G:'#00ff00',Y:'#ffff00',O:'#ff8800',B:'#0000ff'}); if(!made.ok) throw Error(JSON.stringify(made)); const opened=open(made.value.definition,made.value.state,made.value.appearance,made.value.options); if(!opened.ok||faceStickerIds(2,'u').length!==4) throw Error('Bridge failed'); console.log('Isolated viewer bridge PASS');\n");
  execFileSync(process.execPath, ['bridge.mjs'], {cwd:dir, stdio:'inherit'});
  writeFileSync(join(dir, 'consumer.ts'), "import {createCubeStage, weightedFaceExposure, type StageOptions} from '@puzlwerk/viewer'; import {cubeStateDocuments, type CubeStateFacelets} from '@puzlwerk/viewer/bridge'; declare const facelets: CubeStateFacelets; cubeStateDocuments(3, facelets, {}); declare const host: HTMLElement, options: StageOptions; createCubeStage(host, options); weightedFaceExposure({ambient:1,hemispheres:[],directionals:[]}, [0,0,0,1], [0,0,1]);\n");
  execFileSync(process.execPath, [join(process.cwd(), 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', 'consumer.ts'], {cwd:dir, stdio:'inherit'});
  console.log('Isolated viewer TypeScript consumer PASS');
} finally {
  rmSync(dir, {recursive:true, force:true});
}
