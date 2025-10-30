import test from "node:test";
import assert from "node:assert/strict";
import { parsePlaylist } from "../dist/index.js";
import { generateM3U, generateJSON } from "../dist/generator.js";

test("generateM3U - round-trip test", () => {
  const original = `#EXTM3U url-tvg="http://example.com/epg.xml" tvg-shift="2"
#EXTINF:-1 tvg-id="ch1" tvg-name="Channel 1" tvg-logo="logo1.png" group-title="News",Channel 1
http://example.com/stream1.m3u8`;

  const parsed = parsePlaylist(original);
  const generated = generateM3U(parsed);
  const reparsed = parsePlaylist(generated);

  // Verify header
  assert.equal(reparsed.header.tvgUrls[0], "http://example.com/epg.xml");
  assert.equal(reparsed.header.tvgShift, 120); // 2 hours * 60 minutes

  // Verify entry
  assert.equal(reparsed.items.length, 1);
  assert.equal(reparsed.items[0].name, "Channel 1");
  assert.equal(reparsed.items[0].tvg?.id, "ch1");
  assert.equal(reparsed.items[0].tvg?.name, "Channel 1");
  assert.equal(reparsed.items[0].tvg?.logo, "logo1.png");
  assert.ok(reparsed.items[0].group?.includes("News"));
  assert.equal(reparsed.items[0].url, "http://example.com/stream1.m3u8");
});

test("generateM3U - empty playlist", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      rawAttrs: {},
    },
    items: [],
    warnings: [],
  };

  const generated = generateM3U(playlist);
  const lines = generated.trim().split("\n");

  assert.equal(lines[0], "#EXTM3U");
  assert.equal(lines.length, 1); // Only header
});

test("generateM3U - all attribute types", () => {
  const m3u = `#EXTM3U url-tvg="http://epg.com/guide.xml" tvg-shift="1.5" user-agent="TestPlayer/2.0" catchup="default" catchup-source="?utc={utc}" catchup-days="7"
#EXTINF:-1 tvg-id="test1" tvg-name="Test Channel" tvg-logo="http://logo.png" tvg-chno="123" group-title="Movies;Drama",Test Channel
#EXTGRP:Movies
#EXTVLCOPT:http-user-agent=CustomAgent/1.0
#EXTVLCOPT:http-referrer=http://referrer.com
#EXTVLCOPT:http-cookie=session=abc123
#EXTVLCOPT:http-header=X-Custom: Value
#KODIPROP:inputstream.adaptive.manifest_type=hls
#KODIPROP:inputstream.adaptive.license_key=key123
http://stream.com/channel.m3u8`;

  const parsed = parsePlaylist(m3u);
  const generated = generateM3U(parsed);

  // Parse generated to verify
  const reparsed = parsePlaylist(generated);

  // Header attrs
  assert.equal(reparsed.header.tvgUrls[0], "http://epg.com/guide.xml");
  assert.equal(reparsed.header.tvgShift, 90); // 1.5 * 60
  assert.equal(reparsed.header.userAgent, "TestPlayer/2.0");
  assert.equal(reparsed.header.catchup, "default");
  assert.equal(reparsed.header.catchupSource, "?utc={utc}");
  assert.equal(reparsed.header.catchupDays, 7);

  // Entry attrs
  const entry = reparsed.items[0];
  assert.equal(entry.tvg?.id, "test1");
  assert.equal(entry.tvg?.name, "Test Channel");
  assert.equal(entry.tvg?.logo, "http://logo.png");
  assert.equal(entry.tvg?.chno, "123");
  assert.ok(entry.group?.includes("Movies"));
  assert.ok(entry.group?.includes("Drama"));

  // HTTP hints
  assert.equal(entry.http?.userAgent, "CustomAgent/1.0");
  assert.equal(entry.http?.referer, "http://referrer.com");
  assert.equal(entry.http?.cookie, "session=abc123");
  assert.equal(entry.http?.headers?.["X-Custom"], "Value");

  // Kodi props
  assert.equal(
    entry.kodiProps?.["inputstream.adaptive.manifest_type"],
    "hls"
  );
  assert.equal(entry.kodiProps?.["inputstream.adaptive.license_key"], "key123");
});

test("generateM3U - UTF-8 encoding (m3u8 format)", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      rawAttrs: {},
    },
    items: [
      {
        name: "测试频道 テスト العربية",
        url: "http://example.com/stream.m3u8",
        duration: -1,
        attrs: {},
        group: [],
      },
    ],
    warnings: [],
  };

  const generated = generateM3U(playlist, { format: "m3u8" });
  assert.ok(generated.includes("测试频道"));
  assert.ok(generated.includes("テスト"));
  assert.ok(generated.includes("العربية"));
});

test("generateM3U - attribute escaping", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      userAgent: 'Agent with "quotes" and special chars',
      rawAttrs: {},
    },
    items: [
      {
        name: 'Channel with "quotes"',
        url: "http://example.com/stream.m3u8",
        duration: -1,
        attrs: {
          "tvg-id": 'id"with"quotes',
        },
        group: ['Group with "quotes"'],
      },
    ],
    warnings: [],
  };

  const generated = generateM3U(playlist);
  // Should escape quotes with backslash
  assert.ok(generated.includes('\\"'));
});

test("generateM3U - sortByGroup option", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      rawAttrs: {},
    },
    items: [
      {
        name: "Channel Z",
        url: "http://z.com/stream.m3u8",
        duration: -1,
        attrs: {},
        group: ["Zebra"],
      },
      {
        name: "Channel A",
        url: "http://a.com/stream.m3u8",
        duration: -1,
        attrs: {},
        group: ["Apple"],
      },
      {
        name: "Channel M",
        url: "http://m.com/stream.m3u8",
        duration: -1,
        attrs: {},
        group: ["Mango"],
      },
    ],
    warnings: [],
  };

  const generated = generateM3U(playlist, { sortByGroup: true });
  const lines = generated.split("\n");

  // Find channel names in order
  const channelNames = lines.filter((l) => l.startsWith("#EXTINF")).map(l => l.split(',')[1]);

  // Should be sorted by group: Apple, Mango, Zebra
  const nameOrder = channelNames.join(",");
  assert.ok(nameOrder.indexOf("Channel A") < nameOrder.indexOf("Channel M"));
  assert.ok(nameOrder.indexOf("Channel M") < nameOrder.indexOf("Channel Z"));
});

test("generateM3U - includeHeader option (false)", () => {
  const playlist = {
    header: {
      tvgUrls: ["http://epg.com/guide.xml"],
      tvgShift: 120,
      rawAttrs: {},
    },
    items: [
      {
        name: "Channel 1",
        url: "http://example.com/stream.m3u8",
        duration: -1,
        attrs: {},
        group: [],
      },
    ],
    warnings: [],
  };

  const generated = generateM3U(playlist, { includeHeader: false });
  const lines = generated.trim().split("\n");

  // Should NOT include #EXTM3U
  assert.ok(!lines[0].startsWith("#EXTM3U"));
  assert.ok(lines[0].startsWith("#EXTINF"));
});

test("generateJSON - pretty format", () => {
  const playlist = {
    header: {
      tvgUrls: ["http://epg.com/guide.xml"],
      rawAttrs: {},
    },
    items: [
      {
        name: "Channel 1",
        url: "http://example.com/stream.m3u8",
        duration: -1,
        attrs: {},
        group: [],
      },
    ],
    warnings: [],
  };

  const json = generateJSON(playlist, true);
  const parsed = JSON.parse(json);

  // Verify structure
  assert.ok(parsed.header);
  assert.ok(Array.isArray(parsed.items));
  assert.equal(parsed.items.length, 1);
  assert.equal(parsed.items[0].name, "Channel 1");

  // Verify pretty formatting (should have indentation)
  assert.ok(json.includes("  "));
  assert.ok(json.includes("\n"));
});

test("generateJSON - compact format", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      rawAttrs: {},
    },
    items: [],
    warnings: [],
  };

  const json = generateJSON(playlist, false);
  const parsed = JSON.parse(json);

  // Verify structure
  assert.ok(parsed.header);
  assert.ok(Array.isArray(parsed.items));

  // Verify compact (no extra spaces)
  assert.ok(!json.includes("  "));
});

test("generateM3U - header with catchup attributes", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      catchup: "default",
      catchupSource: "?utc={utc}&duration={duration}",
      catchupHours: 48,
      catchupDays: 7,
      timeshift: 12,
      rawAttrs: {},
    },
    items: [],
    warnings: [],
  };

  const generated = generateM3U(playlist);

  assert.ok(generated.includes('catchup="default"'));
  assert.ok(generated.includes('catchup-source="?utc={utc}&duration={duration}"'));
  assert.ok(generated.includes('catchup-hours="48"'));
  assert.ok(generated.includes('catchup-days="7"'));
  assert.ok(generated.includes('timeshift="12"'));
});

test("generateM3U - preserves raw attributes not explicitly handled", () => {
  const playlist = {
    header: {
      tvgUrls: [],
      rawAttrs: {
        "custom-attr": "custom-value",
        "x-provider": "TestProvider",
      },
    },
    items: [],
    warnings: [],
  };

  const generated = generateM3U(playlist);

  assert.ok(generated.includes('custom-attr="custom-value"'));
  assert.ok(generated.includes('x-provider="TestProvider"'));
});
