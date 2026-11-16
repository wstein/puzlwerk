import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const dir = mkdtempSync(join(tmpdir(), 'puzlwerk-viewer-consumer-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', '--workspace', '@puzlwerk/viewer', '--pack-destination', dir, '--json'], {encoding:'utf8'}))[0];
  for (const path of ['dist/index.js', 'dist/index.d.ts', 'NOTICE']) {
    if (!packed.files.some(file => file.path === path)) throw Error(`Packed viewer package is missing ${path}`);
  }
  writeFileSync(join(dir, 'package.json'), JSON.stringify({name:'viewer-isolated-consumer', version:'0.0.0', private:true, type:'module'}));
  execFileSync('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(dir, packed.filename)], {cwd:dir, stdio:'pipe'});
  writeFileSync(join(dir, 'consumer.mjs'), "import {createCubeScene,createCubeStage,weightedFaceExposure} from '@puzlwerk/viewer'; if ([createCubeScene,createCubeStage,weightedFaceExposure].some(value => typeof value !== 'function')) throw Error('Missing viewer export'); console.log('Isolated viewer package PASS');\n");
  execFileSync(process.execPath, ['consumer.mjs'], {cwd:dir, stdio:'inherit'});
  writeFileSync(join(dir, 'consumer.ts'), "import {createCubeStage, weightedFaceExposure, type StageOptions} from '@puzlwerk/viewer'; declare const host: HTMLElement, options: StageOptions; createCubeStage(host, options); weightedFaceExposure({ambient:1,hemispheres:[],directionals:[]}, [0,0,0,1], [0,0,1]);\n");
  execFileSync(process.execPath, [join(process.cwd(), 'node_modules/typescript/bin/tsc'), '--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', 'consumer.ts'], {cwd:dir, stdio:'inherit'});
  console.log('Isolated viewer TypeScript consumer PASS');
} finally {
  rmSync(dir, {recursive:true, force:true});
}
