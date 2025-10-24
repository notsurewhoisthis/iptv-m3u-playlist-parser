import { XtreamCredentials, XtreamQueryInfo } from './types.js';

// Recognize common Xtream endpoints
// - http(s)://host[:port]/get.php?username=U&password=P&type=m3u[&_params]
// - http(s)://host[:port]/player_api.php?username=U&password=P

export function isXtreamUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    return path.endsWith('/get.php') || path.endsWith('/player_api.php');
  } catch {
    return false;
  }
}

export function parseXtream(url: string): XtreamQueryInfo | undefined {
  try {
    const u = new URL(url);
    const host = `${u.protocol}//${u.host}`;
    const q = u.searchParams;
    const username = q.get('username') ?? '';
    const password = q.get('password') ?? '';
    if (!username || !password) return undefined;
    const info: XtreamQueryInfo = {
      host,
      username,
      password,
    };
    if (q.has('type')) info.type = q.get('type') ?? undefined;
    if (q.has('output')) info.output = q.get('output') ?? undefined;
    if (q.has('category')) info.category = q.get('category') ?? undefined;
    return info;
  } catch {
    return undefined;
  }
}

export function makeXtreamCredentials(host: string, username: string, password: string): XtreamCredentials {
  const h = host.endsWith('/') ? host.slice(0, -1) : host;
  const u = new URL(h);
  return { host: `${u.protocol}//${u.host}`, username, password };
}

export function buildXtreamM3uUrl(creds: XtreamCredentials, opts?: { type?: string; output?: string; category?: string }): string {
  const u = new URL('/get.php', creds.host);
  u.searchParams.set('username', creds.username);
  u.searchParams.set('password', creds.password);
  u.searchParams.set('type', opts?.type ?? 'm3u');
  if (opts?.category) u.searchParams.set('category', opts.category);
  if (opts?.output) u.searchParams.set('output', opts.output);
  return u.toString();
}

export function buildXtreamCatchupUrl(creds: XtreamCredentials, streamId: string | number, startUtc: number, durationSeconds: number, output: 'ts' | 'm3u8' = 'ts'): string {
  // Format varies by panel; a common one:
  // host:port/streaming/timeshift.php?username=U&password=P&stream=STREAM_ID&start=YYYY-MM-DD:HH-MM&duration=HH-MM
  const u = new URL('/streaming/timeshift.php', creds.host);
  u.searchParams.set('username', creds.username);
  u.searchParams.set('password', creds.password);
  u.searchParams.set('stream', String(streamId));
  // A simple HH-MM formatting (client may adapt as needed):
  const d = new Date(startUtc);
  const pad = (n: number) => String(n).padStart(2, '0');
  const dt = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}:${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}`;
  const hrs = Math.floor(durationSeconds / 3600);
  const mins = Math.floor((durationSeconds % 3600) / 60);
  u.searchParams.set('start', dt);
  u.searchParams.set('duration', `${pad(hrs)}-${pad(mins)}`);
  if (output) u.searchParams.set('output', output);
  return u.toString();
}
