// ====================
// Parser & Core
// ====================
export * from "./types.js";
export { parsePlaylist } from "./parser.js";
export {
  normalizeEntry,
  normalizePlaylist,
  mergePlaylists,
  deduplicateEntries,
} from "./normalize.js";

// ====================
// Classification
// ====================
export {
  classifyEntry,
  classifyEntries,
  filterByKind,
  getKindStatistics,
  isPlaceholderLogo,
} from "./classify.js";

// ====================
// Series Extraction
// ====================
export {
  extractSeriesInfo,
  extractSeasonEpisode,
  sanitizeSeriesName,
  aggregateSeries,
  enrichWithSeriesInfo,
  isSeriesEntry,
  filterSeriesEntries,
  getSeriesNames,
  getSeriesEpisodes,
} from "./series.js";

// ====================
// M3U Generation
// ====================
export { generateM3U, generateJSON } from "./generator.js";
export type { GeneratorOptions } from "./types.js";

// ====================
// Catchup TV
// ====================
export {
  buildCatchupUrl,
  enrichWithCatchup,
  extractCatchupInfo,
  filterCatchupEntries,
  getCatchupWindow,
  hasCatchup,
} from "./catchup.js";
export type { CatchupInfo } from "./types.js";

// ====================
// EPG Integration
// ====================
export {
  extractEpgIds,
  findCurrentProgram,
  findProgramAtTime,
  getChannelEpg,
  linkEpgData,
  validateEpgCoverage,
} from "./epg.js";
export type { EpgCoverage, EpgProgram } from "./types.js";

// ====================
// Stream Validation
// ====================
export {
  enrichWithHealth,
  filterByHealth,
  getHealthStatistics,
  validatePlaylist,
  validateStream,
} from "./validate.js";
export type { StreamHealth, ValidationOptions } from "./types.js";

// ====================
// Multilingual Support
// ====================
export {
  normalizeText,
  tokenizeText,
  getKeywords,
  containsKeywords,
  countKeywordMatches,
  KEYWORDS,
} from "./multilingual.js";

// ====================
// HLS Parsing
// ====================
// Export HLS types explicitly to avoid Dict conflict
export type {
  EncryptionMethod,
  HlsByteRange,
  HlsDateRange,
  HlsIFrameStream,
  HlsKey,
  HlsMap,
  HlsMasterPlaylist,
  HlsMediaPlaylist,
  HlsMediaSegment,
  HlsPartInf,
  HlsPlaylist,
  HlsPreloadHint,
  HlsRendition,
  HlsRenditionReport,
  HlsResolution,
  HlsServerControl,
  HlsSessionData,
  HlsSessionKey,
  HlsSkip,
  HlsStart,
  HlsVariantStream,
  MediaType,
  PlaylistType,
  PreloadHintType,
  VideoRange,
} from "./hls-types.js";
export { isMasterPlaylist, isMediaPlaylist } from "./hls-types.js";
export { parseHlsPlaylist } from "./hls-parser.js";
export {
  detectPlaylistType,
  parsePlaylistAuto,
  type PlaylistFormat,
  type ParsedPlaylist,
} from "./detector.js";

// ====================
// Xtream Codes API
// ====================
export {
  buildXtreamCatchupUrl,
  buildXtreamM3uUrl,
  isXtreamUrl,
  makeXtreamCredentials,
  parseXtream,
} from "./xtream.js";

// ====================
// HTTP Utilities
// ====================
export { fetchText, loadPlaylistFromUrl } from "./http.js";

// ====================
// XMLTV/EPG
// ====================
export {
  buildChannelCategoryMap,
  buildEpgBindingIndex,
  parseXmltv,
  parseXmltvDate,
  parseXmltvPrograms,
  type TvgChannel,
  type TvgProgramme,
} from "./xmltv.js";
export { enrichPlaylistWithEpg, type EnrichOptions } from "./enrich.js";
