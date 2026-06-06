import type { Torrent } from '../shared/types';

export type SortDir = 'asc' | 'desc';
export interface SortState {
  key: string;
  dir: SortDir;
}

const accessors: Record<string, (t: Torrent) => number | string> = {
  name: (t) => t.name.toLowerCase(),
  size: (t) => t.sizeWhenDone || t.totalSize,
  done: (t) => t.percentDone,
  status: (t) => t.status,
  seeds: (t) => t.peersSendingToUs,
  peers: (t) => t.peersGettingFromUs,
  down: (t) => t.rateDownload,
  up: (t) => t.rateUpload,
  eta: (t) => (t.eta < 0 ? Number.MAX_SAFE_INTEGER : t.eta),
  ratio: (t) => t.uploadRatio,
  queue: (t) => t.queuePosition,
  added: (t) => t.addedDate,
};

export function sortTorrents(list: Torrent[], sort: SortState): Torrent[] {
  const get = accessors[sort.key] ?? accessors.queue;
  const sign = sort.dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = get(a);
    const vb = get(b);
    if (va < vb) return -sign;
    if (va > vb) return sign;
    return (a.queuePosition - b.queuePosition) * sign;
  });
}
