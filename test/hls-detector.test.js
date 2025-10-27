/**
 * HLS Detection Tests
 * Tests for auto-detecting HLS vs IPTV playlists
 */

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { detectPlaylistType, parsePlaylistAuto } from "../dist/index.js";

const fixturesDir = join(import.meta.dirname, "hls-fixtures");
const iptvFixturesDir = join(import.meta.dirname);

function loadHlsFixture(name) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

function loadIptvFixture(name) {
  return readFileSync(join(iptvFixturesDir, name), "utf8");
}

test("Detect HLS Media Playlist", () => {
  const text = loadHlsFixture("media-vod.m3u8");
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Detect HLS Master Playlist", () => {
  const text = loadHlsFixture("master-simple.m3u8");
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Detect IPTV Playlist", () => {
  const text = loadIptvFixture("sample.m3u");
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "iptv");
});

test("Detect HLS Encrypted Playlist", () => {
  const text = loadHlsFixture("encrypted.m3u8");
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Detect HLS Complex Master Playlist", () => {
  const text = loadHlsFixture("master-complex.m3u8");
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Auto-Parse HLS Media Playlist", () => {
  const text = loadHlsFixture("media-vod.m3u8");
  const result = parsePlaylistAuto(text);

  assert.strictEqual(result.format, "hls");
  assert.strictEqual(result.playlist.type, "media");
});

test("Auto-Parse HLS Master Playlist", () => {
  const text = loadHlsFixture("master-simple.m3u8");
  const result = parsePlaylistAuto(text);

  assert.strictEqual(result.format, "hls");
  assert.strictEqual(result.playlist.type, "master");
});

test("Auto-Parse IPTV Playlist", () => {
  const text = loadIptvFixture("sample.m3u");
  const result = parsePlaylistAuto(text);

  assert.strictEqual(result.format, "iptv");
  assert.ok(result.playlist.items);
  assert.ok(result.playlist.header);
});

test("Detect Playlist with #EXT-X-VERSION", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:10,Sample
http://example.com/stream.ts
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Detect Playlist with #EXT-X-TARGETDURATION", () => {
  const text = `#EXTM3U
#EXT-X-TARGETDURATION:10
#EXTINF:10,Sample
http://example.com/stream.ts
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Detect Playlist with #EXT-X-STREAM-INF", () => {
  const text = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1280000
stream.m3u8
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "hls");
});

test("Detect IPTV Playlist with tvg-id", () => {
  const text = `#EXTM3U
#EXTINF:-1 tvg-id="channel1" tvg-name="Channel 1",Channel Name
http://example.com/stream
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "iptv");
});

test("Detect IPTV Playlist with group-title", () => {
  const text = `#EXTM3U
#EXTINF:-1 group-title="News",Channel Name
http://example.com/stream
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "iptv");
});

test("Detect IPTV Playlist with #EXTGRP", () => {
  const text = `#EXTM3U
#EXTINF:-1,Channel Name
#EXTGRP:News
http://example.com/stream
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "iptv");
});

test("Detect IPTV Playlist with #EXTVLCOPT", () => {
  const text = `#EXTM3U
#EXTINF:-1,Channel Name
#EXTVLCOPT:http-user-agent=CustomAgent
http://example.com/stream
`;
  const format = detectPlaylistType(text);
  assert.strictEqual(format, "iptv");
});

test("Detect Ambiguous Playlist - Default to IPTV", () => {
  const text = `#EXTM3U
#EXTINF:10,Sample
http://example.com/stream
`;
  const format = detectPlaylistType(text);
  // Default to IPTV for backward compatibility
  assert.strictEqual(format, "iptv");
});

test("HLS vs IPTV Score - Strong HLS Indicators", () => {
  const hlsText = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXTINF:10,
segment.ts
`;
  const format = detectPlaylistType(hlsText);
  assert.strictEqual(format, "hls");
});

test("HLS vs IPTV Score - Strong IPTV Indicators", () => {
  const iptvText = `#EXTM3U
#EXTINF:-1 tvg-id="ch1" tvg-name="Channel 1" tvg-logo="logo.png" group-title="Entertainment",Channel 1
http://example.com/stream
`;
  const format = detectPlaylistType(iptvText);
  assert.strictEqual(format, "iptv");
});
