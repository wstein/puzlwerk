import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installPresentationDrag} from '../dist/presentation-input.js';
import {exerciseDrag} from './fixtures/drag-harness.mjs';
test('drag threshold, overlap, cancellation and disposal match pinned source',async()=>{
 const fixture=JSON.parse(await readFile(new URL('./fixtures/cubistry-presentation-drag.json',import.meta.url)));
 assert.deepEqual(exerciseDrag(installPresentationDrag),fixture.result);
});
