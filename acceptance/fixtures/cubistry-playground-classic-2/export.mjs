import {toWireState} from './convert.mjs';
import {readFile, writeFile} from 'node:fs/promises';
const dir = new URL('./', import.meta.url);
const native = JSON.parse(await readFile(new URL('native.json', dir), 'utf8'));
const id = native.print.id;
const definition = {schema:'puzlwerk.definition',revision:1,id,size:2,convention:'cube-shell-v1',movePolicy:'outer-wide',pieces:native.print.cubies.map(c=>({id:`c${c.id}`,home:c.position,stickers:native.print.stickers.filter(s=>s.cubie===c.id).map(s=>({id:`s${s.id}`,normal:s.normal,up:s.up}))}))};
const state = toWireState(native.target);
const appearance = {schema:'puzlwerk.appearance',revision:1,id:'playground_classic_appearance_v1',definitionId:id,stickers:native.print.stickers.map(s=>({id:`s${s.id}`,color:s.assetId,symmetry:'C4'}))};
for (const [name, value] of Object.entries({definition,state,appearance})) await writeFile(new URL(`${name}.json`,dir),JSON.stringify(value,null,2)+'\n');
