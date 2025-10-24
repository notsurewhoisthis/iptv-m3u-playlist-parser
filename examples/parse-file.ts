import { readFileSync } from 'node:fs';
import { parsePlaylist } from '../src/index.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: tsx examples/parse-file.ts <playlist.m3u>');
  process.exit(1);
}

const text = readFileSync(file, 'utf8');
const result = parsePlaylist(text);
console.log(JSON.stringify(result, null, 2));
