import {copyFile} from 'node:fs/promises';
await copyFile(new URL('../src/native-rotation-binding.css',import.meta.url),new URL('../dist/native-rotation-binding.css',import.meta.url));
await copyFile(new URL('../src/native-appearance.css',import.meta.url),new URL('../dist/native-appearance.css',import.meta.url));
