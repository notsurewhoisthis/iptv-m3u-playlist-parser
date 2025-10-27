// Pre-compile regex for line splitting
const CRLF_REGEX = /\r\n?/g;

export function splitLines(text: string): string[] {
  // Normalize CRLF to LF first, keep empty lines (they matter for URL placement checks)
  // Reset lastIndex for regex reuse
  CRLF_REGEX.lastIndex = 0;
  return text.replace(CRLF_REGEX, "\n").split("\n");
}

export function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

export function trimQuotes(value: string): string {
  // Early return for empty or short strings
  if (!value || value.length < 2) return value;

  const first = value[0];
  const last = value[value.length - 1];

  // Check for matching quotes
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}

// Pre-compile regex for better performance - moved outside function to avoid recompilation
const KEY_VALUE_REGEX =
  /([A-Za-z0-9_\-\.]+)\s*=\s*("[^"]*"|'[^']*'|[^\s,]+)|([A-Za-z0-9_\-\.]+)(?=\s|$)/g;

export function parseKeyValueAttrs(src: string): Record<string, string> {
  // Parse space-delimited tokens like key="value" or key=value or barekey
  // Preserve last occurrence on duplicates.
  const out: Record<string, string> = {};

  // Reset lastIndex for regex reuse (important for global regexes)
  KEY_VALUE_REGEX.lastIndex = 0;

  let m: RegExpExecArray | null;
  while ((m = KEY_VALUE_REGEX.exec(src))) {
    if (m[1]) {
      const k = m[1].toLowerCase();
      const v = trimQuotes(m[2] ?? "");
      out[k] = v;
    } else if (m[3]) {
      const k = m[3].toLowerCase();
      out[k] = "true";
    }
  }
  return out;
}

export function toNumber(s: string | undefined): number | undefined {
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function pushUnique(arr: string[], value: string) {
  // Optimize: indexOf is faster than includes for small arrays
  // and avoids unnecessary iterations
  if (arr.indexOf(value) === -1) arr.push(value);
}
