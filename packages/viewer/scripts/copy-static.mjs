import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../src/native-rotation-binding.css',import.meta.url),new URL('../dist/native-rotation-binding.css',import.meta.url));
