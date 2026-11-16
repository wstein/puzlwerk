import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationGeometry,PRESENTATION_PRESET,presentationWidths} from '../dist/presentation-preset.js';
test('native presentation factory provides cubie, sticker, core and layer profile',()=>{
 const geometry=createPresentationGeometry(2);assert.equal(geometry.stickerOffset,PRESENTATION_PRESET.stickerOffset);assert.deepEqual(geometry.layers.widths,presentationWidths(2));assert.ok(geometry.body.isBufferGeometry&&geometry.sticker.isBufferGeometry&&geometry.core.isBufferGeometry);
 geometry.body.dispose();geometry.sticker.dispose();geometry.core.dispose();
});
