import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../fixtures/cubistry-playground-classic-2/', import.meta.url);
const read = async (name) => JSON.parse(await readFile(new URL(name, root), 'utf8'));

test('native Playground fixture retains physical identities and recorded moves', async () => {
  const fixture = await read('native.json');
  assert.equal(fixture.print.id, 'playground_classic_v1');
  assert.equal(fixture.print.cubies.length, 8);
  assert.equal(new Set(fixture.print.stickers.map(s => s.id)).size, 24);
  assert.deepEqual(fixture.print.stickers.find(s => s.id === 0), {id:0,cubie:7,normal:[1,0,0],up:[0,1,0],assetId:'R',materialId:'sticker',equivalentQuarterTurns:[0,1,2,3]});
  assert.deepEqual(fixture.trace.map(x => x.action), ['R', 'U', "R'", "U'"]);
  assert.deepEqual(fixture.trace[0].state.cubies.find(c => c.id === 7).position, [1,1,-1]);
  assert.deepEqual(fixture.trace[0].state.cubies.find(c => c.id === 7).orientation, [[1,0,0],[0,0,-1],[0,1,0]]);
  assert.equal(fixture.assets.images.length, 6);
});

test('fixture bytes match recorded provenance', async () => {
  const { createHash } = await import('node:crypto');
  const provenance = await read('provenance.json');
  const bytes = await readFile(new URL('native.json', root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), provenance.nativeSha256);
  assert.equal(provenance.revision, 'efafcc1d97687eccea0cde87a230f447ce1b6c66');
  assert.ok(provenance.sources.length >= 4);
});

test('wire export preserves native piece and sticker identity', async () => {
  const native = await read('native.json');
  const definition = await read('definition.json');
  const state = await read('state.json');
  const appearance = await read('appearance.json');
  assert.equal(definition.pieces.length, 8);
  for (const piece of definition.pieces) {
    const id = Number(piece.id.slice(1));
    assert.deepEqual(piece.home, native.print.cubies.find(c => c.id === id).position);
    for (const sticker of piece.stickers) {
      const original = native.print.stickers.find(s => s.id === Number(sticker.id.slice(1)));
      assert.equal(original.cubie, id);
      assert.deepEqual(sticker.normal, original.normal);
      assert.deepEqual(sticker.up, original.up);
      assert.equal(appearance.stickers.find(s => s.id === sticker.id).color, original.assetId);
    }
  }
  assert.deepEqual(state.poses.find(p => p.pieceId === 'c7').orientation, native.target.cubies.find(p => p.id === 7).orientation.flat());
});

test('native orientation columns convert to row-major wire matrices after R', async () => {
  const {toWireState} = await import('../fixtures/cubistry-playground-classic-2/convert.mjs');
  const native = await read('native.json');
  const result = toWireState(native.trace[0].state);
  assert.deepEqual(result.poses.find(p => p.pieceId === 'c7').orientation, [1,0,0,0,0,1,0,-1,0]);
});
