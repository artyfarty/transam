import { TorrentStatus, type Torrent } from '../shared/types';

const KB = 1024;
const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

export function humanSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  let i = 0;
  let n = bytes;
  while (n >= KB && i < units.length - 1) {
    n /= KB;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(2) : n < 100 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

export function speed(bytesPerSec: number): string {
  if (!bytesPerSec) return '';
  return `${humanSize(bytesPerSec)}/s`;
}

export function percent(p: number): string {
  return `${(p * 100).toFixed(p >= 1 ? 0 : 1)}%`;
}

export function ratio(r: number): string {
  if (r < 0) return '∞';
  return r.toFixed(2);
}

export function eta(seconds: number): string {
  if (seconds < 0) return seconds === -2 ? 'Done' : '∞';
  if (seconds === 0) return '';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function statusText(t: Torrent): string {
  if (t.error && t.errorString) return 'Error';
  switch (t.status) {
    case TorrentStatus.Stopped:
      return 'Paused';
    case TorrentStatus.CheckWait:
      return 'Queued check';
    case TorrentStatus.Check:
      return `Checking ${percent(t.recheckProgress)}`;
    case TorrentStatus.DownloadWait:
      return 'Queued';
    case TorrentStatus.Download:
      return 'Downloading';
    case TorrentStatus.SeedWait:
      return 'Queued seed';
    case TorrentStatus.Seed:
      return 'Seeding';
    default:
      return '';
  }
}

export function isActive(t: Torrent): boolean {
  return t.status === TorrentStatus.Download || t.status === TorrentStatus.Seed;
}

// Date formatting honours the OS regional locale (set from app.getSystemLocale
// via setDateLocale on startup); falls back to the runtime default until then.
let _locale: string | undefined;
export function setDateLocale(l: string): void {
  _locale = l || undefined;
}
export function dateTime(ts: number): string {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString(_locale, { dateStyle: 'short', timeStyle: 'short' });
}
export function dateTimeLong(ts: number): string {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString(_locale, { dateStyle: 'medium', timeStyle: 'medium' });
}

const LABEL_PALETTE = [
  '#4b8ed6',
  '#4cae73',
  '#d6914b',
  '#a06cd6',
  '#d65b8e',
  '#4bb0c0',
  '#b9a13e',
  '#d6634b',
];

/** Stable per-label colour from the palette. */
export function labelColor(label: string): string {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
}
