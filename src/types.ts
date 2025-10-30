export type Dict<T = string> = Record<string, T>;

/**
 * Media type classification for IPTV entries
 */
export enum MediaKind {
  LIVE = "live",
  MOVIE = "movie",
  SERIES = "series",
  RADIO = "radio",
}

/**
 * Series metadata extracted from entry name/attributes
 */
export interface SeriesInfo {
  seriesName?: string;
  season?: number;
  episode?: number;
}

/**
 * Configuration options for media classification
 */
export interface ClassificationOptions {
  /** Enable automatic media kind detection (default: true) */
  enableAutoClassification?: boolean;
  /** Locale for keyword matching: 'en', 'tr', 'de', 'fr', 'es', 'ar' (default: 'en') */
  locale?: string;
  /** Custom keywords for classification */
  customKeywords?: {
    live?: string[];
    movie?: string[];
    series?: string[];
    radio?: string[];
  };
  /** Conservative HLS detection (default: true) - treats .m3u8 as live unless strong VOD signals */
  conservativeHls?: boolean;
}

/**
 * Warning codes for playlist parsing issues
 */
export enum WarningCode {
  MISSING_HEADER = "missing_header",
  NO_URL = "no_url",
  MALFORMED_EXTINF = "malformed_extinf",
  INVALID_DURATION = "invalid_duration",
  DUPLICATE_ENTRY = "duplicate_entry",
  PLACEHOLDER_LOGO = "placeholder_logo",
  INVALID_ENCODING = "invalid_encoding",
}

/**
 * Structured warning with context
 */
export interface Warning {
  code: WarningCode;
  line?: number;
  message: string;
  context?: any;
}

/**
 * Validation result for playlist/entry validation
 */
export interface ValidationResult {
  valid: boolean;
  warnings: Warning[];
  errors?: string[];
}

/**
 * Stream health status from validation checks
 */
export interface StreamHealth {
  alive: boolean;
  statusCode?: number;
  latency?: number;
  error?: string;
  checkedAt?: Date;
}

/**
 * Options for playlist stream validation
 */
export interface ValidationOptions {
  /** Request timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** HTTP method to use for validation (default: HEAD) */
  method?: "HEAD" | "GET";
  /** Number of retries on failure (default: 0) */
  retries?: number;
  /** Concurrent validation requests (default: 10) */
  concurrency?: number;
  /** Progress callback */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Catchup TV configuration for time-shifted playback
 */
export interface CatchupInfo {
  /** Catchup type: "default" | "append" | "shift" | "flussonic" | custom */
  type: string;
  /** URL template with placeholders: {duration}, {offset}, {utc}, {timestamp} */
  source?: string;
  /** Catchup availability in days */
  days?: number;
  /** Catchup availability in hours */
  hours?: number;
}

export interface PlaylistHeader {
  tvgUrls: string[];
  tvgShift?: number; // minutes
  userAgent?: string;
  catchup?: string;
  catchupSource?: string;
  catchupHours?: number;
  catchupDays?: number;
  timeshift?: number; // hours
  rawAttrs: Dict;
}

export interface HttpHints {
  userAgent?: string;
  referer?: string;
  cookie?: string;
  headers?: Dict;
}

export interface Entry {
  name: string;
  url: string;
  duration?: number; // seconds
  group?: string[];
  tvg?: { id?: string; name?: string; logo?: string; chno?: string };
  http?: HttpHints;
  kodiProps?: Dict;
  attrs: Dict; // all parsed attributes (lower-cased keys)
  extras?: Record<string, unknown>;
  /** Auto-detected or explicit media kind (live/movie/series/radio) */
  kind?: MediaKind;
  /** Extracted series information (name, season, episode) */
  series?: SeriesInfo;
  /** Original position in playlist (useful for multi-source merging) */
  providerOrder?: number;
  /** Stream health status (populated via validatePlaylist) */
  health?: StreamHealth;
  /** Catchup TV configuration */
  catchup?: CatchupInfo;
  /** EPG programs (populated via linkEpgData) */
  epg?: EpgProgram[];
  /** Stream type (parsed from tvg-type attribute) */
  streamType?: 'live' | 'vod' | 'series' | 'radio';
  /** Audio track languages (parsed from audio-track attribute) */
  audioTrack?: string;
  /** Aspect ratio (parsed from aspect-ratio attribute) */
  aspectRatio?: string;
  /** Adult content flag (parsed from adult attribute) */
  isAdult?: boolean;
  /** Recording allowed (parsed from tvg-rec attribute) */
  recording?: boolean;
}

export interface Playlist {
  header: PlaylistHeader;
  items: Entry[];
  warnings: string[];
}

/**
 * EPG program data for a channel
 */
export interface EpgProgram {
  channel: string;
  title: string;
  start: Date;
  stop: Date;
  description?: string;
  category?: string[];
  icon?: string;
}

/**
 * EPG coverage statistics for a playlist
 */
export interface EpgCoverage {
  totalEntries: number;
  withEpgId: number;
  withEpgData: number;
  coveragePercent: number;
  missingEpgIds: string[];
}

/**
 * Options for playlist generation/serialization
 */
export interface GeneratorOptions {
  /** Output format (default: m3u8) */
  format?: "m3u" | "m3u8";
  /** Pretty-print with indentation (default: false) */
  indent?: boolean;
  /** Sort entries by group before output (default: false) */
  sortByGroup?: boolean;
  /** Include #EXTM3U header (default: true) */
  includeHeader?: boolean;
}

export interface XtreamCredentials {
  host: string; // scheme + host + optional port, no trailing slash
  username: string;
  password: string;
}

export interface XtreamQueryInfo extends XtreamCredentials {
  type?: string; // m3u, m3u_plus, live, series, vod, etc.
  output?: string; // ts, m3u8, hls
  category?: string;
}

/**
 * Aggregated series with all episodes grouped by season
 */
export interface SeriesGroup {
  seriesName: string;
  seasons: Map<number, Entry[]>;
  categories: string[];
  firstProviderOrder?: number;
}

/**
 * Options for streaming parser
 */
export interface StreamingOptions {
  /** Buffer size in bytes (default: 65536 / 64KB) */
  bufferSize?: number;
  /** Callback for progress updates */
  onProgress?: (processed: number, total?: number) => void;
  /** Batch size for emitting entries (default: 100) */
  batchSize?: number;
}
