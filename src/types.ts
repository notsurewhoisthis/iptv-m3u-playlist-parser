export type Dict<T = string> = Record<string, T>;

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
}

export interface Playlist {
  header: PlaylistHeader;
  items: Entry[];
  warnings: string[];
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
