// Rules that auto-assign a label based on a torrent's download path.
// Patterns use shell-style wildcards ('*'); matching is case-insensitive and a
// trailing slash is implied, so '*/Movies/*' matches '/data/Movies' too.

export interface LabelRule {
  pattern: string;
  label: string;
}

export const DEFAULT_LABEL_RULES: LabelRule[] = [
  { pattern: '*/Movies/*', label: 'Movie' },
  { pattern: '*/Anime/*', label: 'Anime' },
  { pattern: '*/TV Shows/*', label: 'TV Show' },
];

function globToRegex(glob: string): RegExp {
  const esc = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${esc}$`, 'i');
}

/** Labels whose rule matches the given daemon path. */
export function labelsForPath(path: string, rules: LabelRule[]): string[] {
  const p = path.endsWith('/') ? path : `${path}/`;
  const out: string[] = [];
  for (const r of rules) {
    if (!r.pattern.trim() || !r.label.trim()) continue;
    if (globToRegex(r.pattern).test(p)) out.push(r.label.trim());
  }
  return [...new Set(out)];
}
