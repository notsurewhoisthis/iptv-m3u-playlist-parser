import { Dict, Playlist } from "./types.js";
import { parsePlaylist } from "./parser.js";

export interface FetchOptions {
  headers?: Dict;
  userAgent?: string;
  referer?: string;
  cookie?: string;
}

export async function fetchText(
  url: string,
  opts: FetchOptions = {},
): Promise<string> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.userAgent && !headers["user-agent"])
    headers["user-agent"] = opts.userAgent;
  if (opts.referer && !headers["referer"]) headers["referer"] = opts.referer;
  if (opts.cookie && !headers["cookie"]) headers["cookie"] = opts.cookie;
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  return await res.text();
}

export async function loadPlaylistFromUrl(
  url: string,
  opts: FetchOptions = {},
): Promise<Playlist> {
  const text = await fetchText(url, opts);
  return parsePlaylist(text);
}
