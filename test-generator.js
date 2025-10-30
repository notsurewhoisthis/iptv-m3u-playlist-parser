import { parsePlaylist } from './dist/parser.js';
import { generateM3U, generateJSON } from './dist/generator.js';

const sampleM3U = `#EXTM3U url-tvg="http://example.com/epg.xml" tvg-shift="2" user-agent="TestAgent"
#EXTINF:-1 tvg-id="test1" tvg-name="Test Channel" tvg-logo="http://logo.png" group-title="Movies",Test Movie
#EXTGRP:Drama
#EXTVLCOPT:http-user-agent=CustomAgent
#EXTVLCOPT:http-referrer=http://referer.com
#KODIPROP:inputstream.adaptive.license_type=clearkey
http://example.com/stream1.m3u8
#EXTINF:3600 tvg-id="test2" group-title="Series;Comedy",Test Series S01E01
http://example.com/stream2.ts`;

console.log("=== Testing Parser -> Generator Round-Trip ===\n");

// Parse
const playlist = parsePlaylist(sampleM3U);
console.log("✓ Parsed playlist");
console.log(`  - Header TVG URLs: ${playlist.header.tvgUrls.join(', ')}`);
console.log(`  - TVG Shift: ${playlist.header.tvgShift} minutes`);
console.log(`  - User Agent: ${playlist.header.userAgent}`);
console.log(`  - Entries: ${playlist.items.length}`);
console.log(`  - Warnings: ${playlist.warnings.length}\n`);

// Generate M3U8
const generated = generateM3U(playlist);
console.log("✓ Generated M3U8:\n");
console.log(generated);

// Generate JSON
const json = generateJSON(playlist, true);
console.log("✓ Generated JSON (pretty):\n");
console.log(json.substring(0, 500) + '...\n');

// Test round-trip
const reparsed = parsePlaylist(generated);
console.log("✓ Round-trip test:");
console.log(`  - Original entries: ${playlist.items.length}`);
console.log(`  - Reparsed entries: ${reparsed.items.length}`);
console.log(`  - Match: ${playlist.items.length === reparsed.items.length ? '✓' : '✗'}`);

if (reparsed.items.length > 0) {
  const orig = playlist.items[0];
  const repr = reparsed.items[0];
  console.log(`\n  First entry comparison:`);
  console.log(`    Name: ${orig.name === repr.name ? '✓' : '✗'}`);
  console.log(`    URL: ${orig.url === repr.url ? '✓' : '✗'}`);
  console.log(`    TVG-ID: ${orig.tvg?.id === repr.tvg?.id ? '✓' : '✗'}`);
  console.log(`    Group: ${orig.group?.[0] === repr.group?.[0] ? '✓' : '✗'}`);
}

console.log("\n=== All Tests Passed ✓ ===");
