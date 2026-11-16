import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {pathToFileURL} from 'node:url';
if (!process.argv[2]) throw new Error('Pass the pinned Cubistry presentation-preset.ts path');
const sourceDir=dirname(process.argv[2]);
for (const [name,expected] of Object.entries({'presentation-preset.ts':'6ae77f5c4579689272106d21de91a1de23ed9dcfa762e30ad9e36944f784466b','two-radius-body.ts':'d0a822c0fbc2e0b84b73944bb17831872f5d2cbfa3ed72e0e83403b2b6220c38','layer-widths.ts':'0977d80f09a4e939d471b74c867c6e7a76a19dbdfc8cc1243cafed4ba7ff7416'})) {
  const actual=createHash('sha256').update(await readFile(join(sourceDir,name))).digest('hex');
  if (actual!==expected) throw new Error(`Source hash mismatch: ${name}`);
}
const {presentationLayerProfile,presentationWidths}=await import(pathToFileURL(process.argv[2]));
const widths=presentationWidths(2), outer=[[true,false],[true,false],[true,false]];
const g=presentationLayerProfile(widths,2).body([widths[0],widths[0],widths[0]],outer);
const hash=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const fixture={source:'Cubistry packages/cube-viewer/src/presentation-preset.ts at efafcc1d97687eccea0cde87a230f447ce1b6c66',widths,outer,position:hash(g.attributes.position.array),normal:hash(g.attributes.normal.array),uv:hash(g.attributes.uv.array),index:hash(g.index.array)};
await writeFile('packages/viewer/test/fixtures/cubistry-2x2-profile.json',JSON.stringify(fixture,null,2)+'\n');g.dispose();
