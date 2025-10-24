export function splitLines(text: string): string[] {
  // Normalize CRLF to LF first, keep empty lines (they matter for URL placement checks)
  return text.replace(/\r\n?/g, "\n").split("\n");
}

export function stripBOM(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

export function trimQuotes(value: string): string {
  if (!value) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseKeyValueAttrs(src: string): Record<string, string> {
  // Parse space-delimited tokens like key="value" or key=value or barekey
  // Preserve last occurrence on duplicates.
  const out: Record<string, string> = {};
  const re = /([A-Za-z0-9_\-\.]+)\s*=\s*("[^"]*"|'[^']*'|[^\s,]+)|([A-Za-z0-9_\-\.]+)(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
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
  if (!arr.includes(value)) arr.push(value);
}
