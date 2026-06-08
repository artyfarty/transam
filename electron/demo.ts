// Demo mode for screenshots/docs. Gated by TRANSAM_DEMO=1 — when off, none of
// this is reachable and the app behaves normally. All torrents here are
// fictional (invented titles, free/CC or public-domain-style content) so a
// screenshot doesn't show anyone's real library.

import type { Torrent, TorrentDetail, ServerConfig, RpcResult } from '../shared/types';
import { TorrentStatus } from '../shared/types';

export const DEMO = process.env.TRANSAM_DEMO === '1';

const GB = 1024 ** 3;
const MB = 1024 ** 2;
const now = () => Math.floor(Date.now() / 1000);
const ago = (sec: number) => now() - sec;

export function demoConfig(): ServerConfig {
  return {
    host: 'demo.local',
    port: 9091,
    rpcPath: '/transmission/rpc',
    useHttps: false,
    username: 'demo',
    password: '',
    pathMappings: [],
  };
}

// A spread of statuses, labels, speeds, ratios, and ages.
function torrents(): Torrent[] {
  const base = {
    recheckProgress: 0,
    doneDate: 0,
    seedRatioMode: 0,
    seedRatioLimit: 0,
    error: 0,
    errorString: '',
  };
  const rows: Partial<Torrent>[] = [
    {
      id: 1,
      name: 'Nebula Drift S02E07 [1080p]',
      status: TorrentStatus.Download,
      totalSize: 2.1 * GB,
      percentDone: 0.37,
      rateDownload: 4.6 * MB,
      rateUpload: 220 * 1024,
      eta: 11 * 60,
      uploadRatio: 0.14,
      peersConnected: 28,
      peersSendingToUs: 19,
      peersGettingFromUs: 6,
      labels: ['TV Show'],
      addedDate: ago(3 * 3600),
      activityDate: ago(4),
    },
    {
      id: 2,
      name: 'The Clockwork Garden (2031)',
      status: TorrentStatus.Download,
      totalSize: 8.4 * GB,
      percentDone: 0.78,
      rateDownload: 11.2 * MB,
      rateUpload: 0,
      eta: 4 * 60,
      uploadRatio: 0.02,
      peersConnected: 53,
      peersSendingToUs: 41,
      peersGettingFromUs: 2,
      labels: ['Movie'],
      addedDate: ago(2 * 3600),
      activityDate: ago(2),
    },
    {
      id: 3,
      name: 'Aurora Linux 42.0 (x86_64).iso',
      status: TorrentStatus.Seed,
      totalSize: 3.7 * GB,
      percentDone: 1,
      rateDownload: 0,
      rateUpload: 1.8 * MB,
      eta: -2,
      uploadRatio: 3.42,
      peersConnected: 64,
      peersSendingToUs: 0,
      peersGettingFromUs: 22,
      labels: ['Linux', 'Alice'],
      addedDate: ago(9 * 86400),
      doneDate: ago(8 * 86400),
      activityDate: ago(1),
    },
    {
      id: 4,
      name: 'Lo-Fi Study Beats Vol.3 (CC-BY)',
      status: TorrentStatus.Seed,
      totalSize: 412 * MB,
      percentDone: 1,
      rateDownload: 0,
      rateUpload: 96 * 1024,
      eta: -2,
      uploadRatio: 1.21,
      peersConnected: 7,
      peersSendingToUs: 0,
      peersGettingFromUs: 3,
      labels: ['Music'],
      addedDate: ago(20 * 86400),
      doneDate: ago(19 * 86400),
      activityDate: ago(40),
    },
    {
      id: 5,
      name: 'Voyage of the Pixel Whale — Ep.12',
      status: TorrentStatus.Stopped,
      totalSize: 1.3 * GB,
      percentDone: 0.54,
      rateDownload: 0,
      rateUpload: 0,
      eta: -1,
      uploadRatio: 0.31,
      peersConnected: 0,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
      labels: ['Anime'],
      addedDate: ago(2 * 86400),
      activityDate: ago(6 * 3600),
    },
    {
      id: 6,
      name: 'Forgotten Codecs Pack',
      status: TorrentStatus.Stopped,
      totalSize: 680 * MB,
      percentDone: 0.91,
      rateDownload: 0,
      rateUpload: 0,
      eta: -1,
      uploadRatio: 0.08,
      peersConnected: 0,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
      labels: [],
      error: 3,
      errorString: 'Tracker gave HTTP 410: Gone',
      addedDate: ago(5 * 86400),
      activityDate: ago(12 * 3600),
    },
    {
      id: 7,
      name: 'Skybound Chronicles — Complete Bundle',
      status: TorrentStatus.Check,
      totalSize: 14.2 * GB,
      percentDone: 0.62,
      recheckProgress: 0.62,
      rateDownload: 0,
      rateUpload: 0,
      eta: -1,
      uploadRatio: 0.0,
      peersConnected: 0,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
      labels: [],
      addedDate: ago(30 * 60),
      activityDate: ago(3),
    },
    {
      id: 8,
      name: 'Desert Mirage — 4K Wallpapers',
      status: TorrentStatus.DownloadWait,
      totalSize: 920 * MB,
      percentDone: 0,
      rateDownload: 0,
      rateUpload: 0,
      eta: -1,
      uploadRatio: 0,
      peersConnected: 0,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
      labels: [],
      addedDate: ago(20 * 60),
      activityDate: ago(20 * 60),
    },
    {
      id: 9,
      name: 'Public Domain Film Reel #7 (1928)',
      status: TorrentStatus.SeedWait,
      totalSize: 2.9 * GB,
      percentDone: 1,
      rateDownload: 0,
      rateUpload: 0,
      eta: -2,
      uploadRatio: 5.8,
      seedRatioMode: 1,
      seedRatioLimit: 8,
      peersConnected: 2,
      peersSendingToUs: 0,
      peersGettingFromUs: 0,
      labels: ['Movie'],
      addedDate: ago(60 * 86400),
      doneDate: ago(59 * 86400),
      activityDate: ago(120),
    },
    {
      id: 10,
      name: 'Indie Game Jam Builds 2031',
      status: TorrentStatus.Download,
      totalSize: 6.0 * GB,
      percentDone: 0.12,
      rateDownload: 2.1 * MB,
      rateUpload: 64 * 1024,
      eta: 47 * 60,
      uploadRatio: 0.01,
      peersConnected: 15,
      peersSendingToUs: 9,
      peersGettingFromUs: 1,
      labels: ['Games', 'Alice'],
      addedDate: ago(50 * 60),
      activityDate: ago(8),
    },
  ];

  return rows.map((r, i) => {
    const percentDone = r.percentDone ?? 0;
    const sizeWhenDone = r.totalSize ?? 0;
    return {
      ...base,
      ...r,
      sizeWhenDone,
      leftUntilDone: Math.round(sizeWhenDone * (1 - percentDone)),
      downloadDir: '/data/downloads',
      downloadedEver: Math.round(sizeWhenDone * percentDone),
      uploadedEver: Math.round(sizeWhenDone * (r.uploadRatio ?? 0)),
      queuePosition: i,
    } as Torrent;
  });
}

const DEMO_TORRENTS = torrents();

// A piece bitfield with the first `frac` of pieces marked done.
function piecesBitfield(pieceCount: number, frac: number): string {
  const bytes = Buffer.alloc(Math.ceil(pieceCount / 8));
  const done = Math.floor(pieceCount * frac);
  for (let i = 0; i < done; i++) bytes[i >> 3] |= 0x80 >> (i & 7);
  return bytes.toString('base64');
}

function detail(id: number): TorrentDetail {
  const t = DEMO_TORRENTS.find((x) => x.id === id) ?? DEMO_TORRENTS[0];
  const pieceCount = 248;
  return {
    id: t.id,
    name: t.name,
    comment: 'Fictional content for demonstration.',
    hashString: 'demo' + String(t.id).padStart(36, '0'),
    pieceCount,
    pieceSize: 8 * MB,
    pieces: piecesBitfield(pieceCount, t.percentDone),
    dateCreated: t.addedDate,
    downloadDir: t.downloadDir,
    files: [
      { name: `${t.name}/${t.name}.mkv`, length: Math.round(t.totalSize * 0.92), bytesCompleted: Math.round(t.totalSize * 0.92 * t.percentDone) },
      { name: `${t.name}/readme.txt`, length: 4096, bytesCompleted: 4096 },
      { name: `${t.name}/cover.jpg`, length: 256 * 1024, bytesCompleted: Math.round(256 * 1024 * t.percentDone) },
    ],
    fileStats: [
      { bytesCompleted: Math.round(t.totalSize * 0.92 * t.percentDone), wanted: true, priority: 0 },
      { bytesCompleted: 4096, wanted: true, priority: 1 },
      { bytesCompleted: Math.round(256 * 1024 * t.percentDone), wanted: true, priority: 0 },
    ],
    peers: [
      { address: '203.0.113.7', clientName: 'Transmission 4.0.6', rateToClient: 1.2 * MB, rateToPeer: 0, progress: 1, flagStr: 'TDEX' },
      { address: '198.51.100.42', clientName: 'qBittorrent 4.6', rateToClient: 640 * 1024, rateToPeer: 32 * 1024, progress: 0.74, flagStr: 'UE' },
      { address: '192.0.2.155', clientName: 'libtorrent 2.0', rateToClient: 0, rateToPeer: 96 * 1024, progress: 0.41, flagStr: 'DH' },
    ],
    trackerStats: [
      { host: 'tracker.demo-opentrack.org', announceState: 1, lastAnnounceResult: 'Success', lastAnnounceSucceeded: true, seederCount: 124, leecherCount: 18, nextAnnounceTime: now() + 1500 },
      { host: 'backup.demo-tracker.net', announceState: 0, lastAnnounceResult: 'Success', lastAnnounceSucceeded: true, seederCount: 61, leecherCount: 7, nextAnnounceTime: now() + 900 },
    ],
    seedRatioLimit: t.seedRatioLimit,
    seedRatioMode: t.seedRatioMode,
    seedIdleLimit: 30,
    seedIdleMode: 0,
  };
}

const ok = <T>(args: T): RpcResult<T> => ({ ok: true, result: 'success', arguments: args });

export function demoHandle(channel: string, id?: number): RpcResult {
  switch (channel) {
    case 'torrents:get':
      return ok({ torrents: DEMO_TORRENTS });
    case 'torrents:detail':
      return ok({ torrents: [detail(id ?? DEMO_TORRENTS[0].id)] });
    case 'session:stats':
      return ok({ downloadSpeed: 17.9 * MB, uploadSpeed: 2.1 * MB });
    case 'session:get':
      return ok({
        'speed-limit-down': 5000,
        'speed-limit-down-enabled': false,
        'speed-limit-up': 1000,
        'speed-limit-up-enabled': true,
        seedRatioLimit: 2,
        seedRatioLimited: true,
        version: '4.0.6 (demo)',
        'rpc-version': 18,
      });
    default:
      return ok({});
  }
}
