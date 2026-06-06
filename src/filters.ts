import { TorrentStatus, type Torrent } from '../shared/types';

export type Filter = { kind: 'cat'; id: string } | { kind: 'label'; name: string };

export interface Category {
  id: string;
  label: string;
  test: (t: Torrent) => boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'all', label: 'All', test: () => true },
  {
    id: 'downloading',
    label: 'Downloading',
    test: (t) => t.status === TorrentStatus.Download || t.status === TorrentStatus.DownloadWait,
  },
  {
    id: 'seeding',
    label: 'Seeding',
    test: (t) => t.status === TorrentStatus.Seed || t.status === TorrentStatus.SeedWait,
  },
  { id: 'active', label: 'Active', test: (t) => t.rateDownload > 0 || t.rateUpload > 0 },
  { id: 'paused', label: 'Paused', test: (t) => t.status === TorrentStatus.Stopped },
  {
    id: 'checking',
    label: 'Checking',
    test: (t) => t.status === TorrentStatus.Check || t.status === TorrentStatus.CheckWait,
  },
  { id: 'error', label: 'Error', test: (t) => t.error !== 0 },
];

export function matchesFilter(t: Torrent, f: Filter): boolean {
  if (f.kind === 'label') return t.labels?.includes(f.name) ?? false;
  const cat = CATEGORIES.find((c) => c.id === f.id);
  return cat ? cat.test(t) : true;
}

/** Unique labels across all torrents, sorted, with counts. */
export function collectLabels(torrents: Torrent[]): { name: string; count: number }[] {
  const m = new Map<string, number>();
  for (const t of torrents) for (const l of t.labels ?? []) m.set(l, (m.get(l) ?? 0) + 1);
  return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
}
