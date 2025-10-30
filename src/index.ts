// IPTV Parser Core
export * from "./types.js";
export { parsePlaylist } from "./parser.js";
export {
  normalizeEntry,
  normalizePlaylist,
  mergePlaylists,
  deduplicateEntries,
} from "./normalize.js";

// Media Classification System (NEW)
export {
  classifyEntry,
  classifyEntries,
  filterByKind,
  getKindStatistics,
  isPlaceholderLogo,
} from "./classify.js";

// Series Utilities (NEW)
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

// Multilingual Support (NEW)
export {
  normalizeText,
  tokenizeText,
  getKeywords,
  containsKeywords,
  countKeywordMatches,
  KEYWORDS,
} from "./multilingual.js";

// HLS Parser
// Export HLS types explicitly to avoid Dict conflict
export type {
  HlsPlaylist,
  HlsMasterPlaylist,
  HlsMediaPlaylist,
  HlsMediaSegment,
  HlsVariantStream,
  HlsIFrameStream,
  HlsRendition,
  HlsKey,
  HlsByteRange,
  HlsDateRange,
  HlsMap,
  HlsSessionData,
  HlsSessionKey,
  HlsServerControl,
  HlsPartInf,
  HlsStart,
  HlsSkip,
  HlsPreloadHint,
  HlsRenditionReport,
  HlsResolution,
  EncryptionMethod,
  PlaylistType,
  MediaType,
  VideoRange,
  PreloadHintType,
} from "./hls-types.js";
export { isMasterPlaylist, isMediaPlaylist } from "./hls-types.js";
export { parseHlsPlaylist } from "./hls-parser.js";
export {
  detectPlaylistType,
  parsePlaylistAuto,
  type PlaylistFormat,
  type ParsedPlaylist,
} from "./detector.js";

// Xtream API
export {
  isXtreamUrl,
  parseXtream,
  makeXtreamCredentials,
  buildXtreamM3uUrl,
  buildXtreamCatchupUrl,
} from "./xtream.js";

// HTTP Utilities
export { fetchText, loadPlaylistFromUrl } from "./http.js";

// EPG/XMLTV
export {
  parseXmltv,
  parseXmltvPrograms,
  buildEpgBindingIndex,
  buildChannelCategoryMap,
  parseXmltvDate,
  type TvgChannel,
  type TvgProgramme,
} from "./xmltv.js";
export { enrichPlaylistWithEpg, type EnrichOptions } from "./enrich.js";
