// Heuristic: collapse the variable numbering of a torrent name to a "series
// key" so episodes/parts that differ only by their number map to the same key.
// Used to suggest the folder where the rest of a series already lives.

const EXT = /\.(mkv|mp4|avi|m4v|mov|wmv|flv|webm|ts|mp3|flac|m4a|iso|zip|rar|7z|pdf|epub|cbz|cbr)$/i;

export function seriesKey(name: string): string {
  let s = name.toLowerCase().trim();
  s = s.replace(/\.torrent$/, '');
  s = s.replace(EXT, '');
  // Drop bracketed/parenthesized groups: release group + per-file CRC like
  // "[SubsPlease]" / "[EC8F1EBF]", and "(1080p)" / "(2023)" noise. The CRC is
  // unique per episode, so leaving it in would break the series key entirely.
  s = s.replace(/\[[^\]]*\]/g, ' ');
  s = s.replace(/\([^)]*\)/g, ' ');
  s = s.replace(/\bs\d{1,2}\s*[ex]\d{1,3}\b/g, '#'); // S01E05 / 1x05-ish
  s = s.replace(/\b(e|ep|episode|part|pt|vol|volume|disc|cd|chapter|ch)\s*\.?\s*\d{1,4}\b/g, '#');
  s = s.replace(/\b\d{3,4}p\b/g, ''); // 1080p/720p resolution noise
  // common scene/quality/source tags, so episodes that differ only in these
  // (e.g. 1080p WEB-DL vs 720p) still share a key
  s = s.replace(
    /\b(web[\s._-]?dl|web[\s._-]?rip|web|blu[\s._-]?ray|bd[\s._-]?rip|br[\s._-]?rip|bd[\s._-]?remux|remux|hdtv|dvd[\s._-]?rip|hd[\s._-]?rip|x264|x265|h264|h265|hevc|avc|xvid|divx|aac|ac3|eac3|ddp|dts|truehd|flac|opus|10bit|8bit|hdr|sdr|dolby|atmos|repack|proper|internal|extended|remastered|multi|dual[\s._-]?audio|hardsub|softsub|uncensored|bdrip)\b/g,
    ' ',
  );
  s = s.replace(/\b\d{1,4}\b/g, '#'); // any remaining standalone number (episode #)
  s = s.replace(/[._\-\s]+/g, ' ').trim();
  return s;
}

/** Best-effort display name from a magnet link or .torrent URL. */
export function extractName(input: string): string {
  const m = input.match(/[?&]dn=([^&]+)/i);
  if (m) {
    try {
      return decodeURIComponent(m[1].replace(/\+/g, ' '));
    } catch {
      return m[1];
    }
  }
  try {
    const base = new URL(input).pathname.split('/').pop() ?? '';
    return decodeURIComponent(base);
  } catch {
    return input;
  }
}

/** Suggest the folder used by existing torrents that share this series key. */
export function suggestDir(name: string, items: { name: string; downloadDir: string }[]): string | undefined {
  const key = seriesKey(name);
  if (key.length < 3) return undefined;
  const freq = new Map<string, number>();
  for (const t of items) {
    if (t.downloadDir && seriesKey(t.name) === key) freq.set(t.downloadDir, (freq.get(t.downloadDir) ?? 0) + 1);
  }
  let best: string | undefined;
  let n = 0;
  for (const [d, c] of freq) if (c > n) [best, n] = [d, c];
  return best;
}
