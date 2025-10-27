import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  parseXmltvPrograms,
  buildChannelCategoryMap,
  parseXmltvDate,
} from "../dist/index.js";

test("parse xmltv programmes and build categories", () => {
  const xml = readFileSync(
    new URL("./xmltv_programs_sample.xml", import.meta.url),
    "utf8",
  );
  const { programs } = parseXmltvPrograms(xml);
  assert.equal(programs.length, 3);
  const cats = buildChannelCategoryMap(programs, { topN: 2 });
  assert.deepEqual(cats.get("news"), ["News", "Politics"]);
  assert.deepEqual(cats.get("sports"), ["Sports"]);
});

test("parseXmltvDate supports offsets", () => {
  const a = parseXmltvDate("20251024060000 +0000");
  const b = parseXmltvDate("20251024080000 +0200");
  assert.equal(a, b); // same UTC moment
});
