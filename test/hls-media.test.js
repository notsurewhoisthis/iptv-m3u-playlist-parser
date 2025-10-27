/**
 * HLS Media Playlist Tests
 * Tests for parsing HLS media playlists (segment-based)
 */

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseHlsPlaylist, isMediaPlaylist } from "../dist/index.js";

const fixturesDir = join(import.meta.dirname, "hls-fixtures");

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), "utf8");
}

test("HLS Media VOD Playlist", () => {
  const text = loadFixture("media-vod.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMediaPlaylist(playlist), "Should be a media playlist");
  assert.strictEqual(playlist.type, "media");
  assert.strictEqual(playlist.version, 3);
  assert.strictEqual(playlist.targetDuration, 10);
  assert.strictEqual(playlist.mediaSequence, 0);
  assert.strictEqual(playlist.playlistType, "VOD");
  assert.strictEqual(playlist.endList, true);
  assert.strictEqual(playlist.segments.length, 5);

  // Check first segment
  const seg0 = playlist.segments[0];
  assert.strictEqual(seg0.duration, 9.9);
  assert.strictEqual(seg0.uri, "segment00.ts");

  // Check last segment
  const seg4 = playlist.segments[4];
  assert.strictEqual(seg4.uri, "segment04.ts");
});

test("HLS Media LIVE Playlist", () => {
  const text = loadFixture("media-live.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMediaPlaylist(playlist), "Should be a media playlist");
  assert.strictEqual(playlist.type, "media");
  assert.strictEqual(playlist.version, 3);
  assert.strictEqual(playlist.targetDuration, 10);
  assert.strictEqual(playlist.mediaSequence, 7794);
  assert.strictEqual(playlist.playlistType, undefined); // LIVE has no type
  assert.strictEqual(playlist.endList, false); // No #EXT-X-ENDLIST
  assert.strictEqual(playlist.segments.length, 3);

  // Check segment URIs are absolute
  const seg0 = playlist.segments[0];
  assert.strictEqual(seg0.uri, "https://example.com/segment7794.ts");
});

test("HLS Encrypted Playlist", () => {
  const text = loadFixture("encrypted.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMediaPlaylist(playlist));
  assert.strictEqual(playlist.segments.length, 3);

  // First two segments should be encrypted
  const seg0 = playlist.segments[0];
  assert.ok(seg0.key, "First segment should have key");
  assert.strictEqual(seg0.key.method, "AES-128");
  assert.strictEqual(seg0.key.uri, "https://example.com/keys/key.php?id=123");
  assert.strictEqual(seg0.key.iv, "0x12345678901234567890123456789012");

  const seg1 = playlist.segments[1];
  assert.ok(seg1.key, "Second segment should inherit key");
  assert.strictEqual(seg1.key.method, "AES-128");

  // Third segment should be unencrypted
  const seg2 = playlist.segments[2];
  assert.ok(seg2.key, "Third segment should have key object");
  assert.strictEqual(seg2.key.method, "NONE");
});

test("HLS Byte Range Playlist", () => {
  const text = loadFixture("byterange.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMediaPlaylist(playlist));
  assert.strictEqual(playlist.version, 4); // Byte range requires version 4+
  assert.strictEqual(playlist.segments.length, 3);

  // First segment with explicit offset
  const seg0 = playlist.segments[0];
  assert.ok(seg0.byteRange, "First segment should have byte range");
  assert.strictEqual(seg0.byteRange.length, 75232);
  assert.strictEqual(seg0.byteRange.offset, 0);

  // Second segment with explicit offset
  const seg1 = playlist.segments[1];
  assert.ok(seg1.byteRange);
  assert.strictEqual(seg1.byteRange.length, 82112);
  assert.strictEqual(seg1.byteRange.offset, 75232);

  // Third segment without explicit offset (continues from previous)
  const seg2 = playlist.segments[2];
  assert.ok(seg2.byteRange);
  assert.strictEqual(seg2.byteRange.length, 69864);
  assert.strictEqual(seg2.byteRange.offset, undefined);
});

test("HLS Date Range Playlist", () => {
  const text = loadFixture("daterange.m3u8");
  const playlist = parseHlsPlaylist(text);

  assert.ok(isMediaPlaylist(playlist));
  assert.strictEqual(playlist.segments.length, 3);

  // First segment should have date range
  const seg0 = playlist.segments[0];
  assert.ok(seg0.dateRanges, "First segment should have date ranges");
  assert.strictEqual(seg0.dateRanges.length, 1);

  const dr0 = seg0.dateRanges[0];
  assert.strictEqual(dr0.id, "ad-break-1");
  assert.strictEqual(dr0.class, "com.apple.hls.interstitial");
  assert.strictEqual(dr0.startDate, "2024-01-15T10:00:00.000Z");
  assert.strictEqual(dr0.duration, 30.0);

  // Third segment should have date range with END-ON-NEXT
  const seg2 = playlist.segments[2];
  assert.ok(seg2.dateRanges);
  const dr1 = seg2.dateRanges[0];
  assert.strictEqual(dr1.id, "ad-break-2");
  assert.strictEqual(dr1.plannedDuration, 60.0);
  assert.strictEqual(dr1.endOnNext, true);
});

test("HLS Media Playlist with Discontinuity", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:9.9,
segment00.ts
#EXT-X-DISCONTINUITY
#EXTINF:9.9,
segment01.ts
#EXT-X-ENDLIST
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(isMediaPlaylist(playlist));
  assert.strictEqual(playlist.segments.length, 2);

  const seg1 = playlist.segments[1];
  assert.strictEqual(seg1.discontinuity, true);
});

test("HLS Media Playlist with GAP", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:9.9,
segment00.ts
#EXT-X-GAP
#EXTINF:9.9,
segment01.ts
#EXT-X-ENDLIST
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(isMediaPlaylist(playlist));

  const seg1 = playlist.segments[1];
  assert.strictEqual(seg1.gap, true);
});

test("HLS Media Playlist with PROGRAM-DATE-TIME", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-PROGRAM-DATE-TIME:2024-01-15T10:00:00.000Z
#EXTINF:9.9,
segment00.ts
#EXT-X-ENDLIST
`;

  const playlist = parseHlsPlaylist(text);
  const seg0 = playlist.segments[0];
  assert.strictEqual(seg0.programDateTime, "2024-01-15T10:00:00.000Z");
});

test("HLS Media Playlist with I-FRAMES-ONLY", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:4
#EXT-X-TARGETDURATION:10
#EXT-X-I-FRAMES-ONLY
#EXTINF:9.9,
iframe00.ts
#EXT-X-ENDLIST
`;

  const playlist = parseHlsPlaylist(text);
  assert.strictEqual(playlist.iFramesOnly, true);
});

test("HLS Media Playlist with START", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-START:TIME-OFFSET=25.0,PRECISE=YES
#EXTINF:9.9,
segment00.ts
#EXT-X-ENDLIST
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.start);
  assert.strictEqual(playlist.start.timeOffset, 25.0);
  assert.strictEqual(playlist.start.precise, true);
});

test("HLS Media Playlist with SERVER-CONTROL", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-SERVER-CONTROL:CAN-SKIP-UNTIL=12.0,HOLD-BACK=6.0,PART-HOLD-BACK=2.0,CAN-BLOCK-RELOAD=YES
#EXTINF:9.9,
segment00.ts
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.serverControl);
  assert.strictEqual(playlist.serverControl.canSkipUntil, 12.0);
  assert.strictEqual(playlist.serverControl.holdBack, 6.0);
  assert.strictEqual(playlist.serverControl.partHoldBack, 2.0);
  assert.strictEqual(playlist.serverControl.canBlockReload, true);
});

test("HLS Media Playlist with PART-INF", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-PART-INF:PART-TARGET=1.5
#EXTINF:9.9,
segment00.ts
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.partInf);
  assert.strictEqual(playlist.partInf.partTarget, 1.5);
});

test("HLS Media Playlist Warnings - Missing TARGETDURATION", () => {
  const text = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:9.9,
segment00.ts
#EXT-X-ENDLIST
`;

  const playlist = parseHlsPlaylist(text);
  assert.ok(playlist.warnings.length > 0);
  assert.ok(
    playlist.warnings.some((w) => w.includes("TARGETDURATION")),
    "Should warn about missing TARGETDURATION",
  );
});
