import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = new URL('../fixtures/regrip-replay/', import.meta.url);
test('source replay bytes and event traces remain intact', async () => {
  const manifest = JSON.parse(await readFile(new URL('provenance.json', root), 'utf8'));
  for (const [name, moves, gyros] of [['gocube-edge-ui.jsonl', ['R','U',"U'"], 2], ['gan-ui12-ui.jsonl', ['F','R',"U'"], 0]]) {
    const bytes = await readFile(new URL(name, root));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.files[name]);
    const events = bytes.toString('utf8').trim().split('\n').map(JSON.parse);
    assert.deepEqual(events.filter(e => e.data.type === 'MOVE').map(e => e.data.move), moves);
    assert.equal(events.filter(e => e.data.type === 'GYRO').length, gyros);
  }
});
