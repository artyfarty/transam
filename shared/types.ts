// Shared types between the Electron main process and the renderer.
// Targets the modern Transmission RPC (Transmission 4.x, rpc-version >= 17).

export interface ServerConfig {
  /** Daemon host or IP. Never hardcoded — comes from the connection dialog. */
  host: string;
  port: number;
  /** URL path of the RPC endpoint, usually /transmission/rpc */
  rpcPath: string;
  useHttps: boolean;
  username?: string;
  password?: string;
  /**
   * Optional path mappings: translate a local (mounted) path the user picks in
   * a native folder dialog into the path the daemon expects, and back.
   * e.g. { local: "Z:\\downloads", remote: "/mnt/downloads" }
   */
  pathMappings?: PathMapping[];
}

export interface PathMapping {
  local: string;
  remote: string;
}

/** Transmission status codes (torrent-get "status" field). */
export enum TorrentStatus {
  Stopped = 0,
  CheckWait = 1,
  Check = 2,
  DownloadWait = 3,
  Download = 4,
  SeedWait = 5,
  Seed = 6,
}

/** A torrent row as we consume it in the UI. Mirrors torrent-get fields. */
export interface Torrent {
  id: number;
  name: string;
  status: TorrentStatus;
  totalSize: number;
  percentDone: number; // 0..1
  recheckProgress: number; // 0..1
  rateDownload: number;
  rateUpload: number;
  eta: number; // seconds, -1 unknown, -2 done
  uploadRatio: number;
  sizeWhenDone: number;
  leftUntilDone: number;
  peersConnected: number;
  peersSendingToUs: number;
  peersGettingFromUs: number;
  downloadDir: string;
  addedDate: number;
  doneDate: number;
  activityDate: number;
  errorString: string;
  error: number;
  labels: string[];
  downloadedEver: number;
  uploadedEver: number;
  queuePosition: number;
}

/** Fields we request from torrent-get, kept in one place. */
export const TORRENT_FIELDS = [
  'id',
  'name',
  'status',
  'totalSize',
  'percentDone',
  'recheckProgress',
  'rateDownload',
  'rateUpload',
  'eta',
  'uploadRatio',
  'sizeWhenDone',
  'leftUntilDone',
  'peersConnected',
  'peersSendingToUs',
  'peersGettingFromUs',
  'downloadDir',
  'addedDate',
  'doneDate',
  'activityDate',
  'errorString',
  'error',
  'labels',
  'downloadedEver',
  'uploadedEver',
  'queuePosition',
] as const;

// --- per-torrent detail (fetched only for the selected torrent) ------------
export interface TorrentFile {
  name: string;
  length: number;
  bytesCompleted: number;
}
export interface TorrentFileStat {
  bytesCompleted: number;
  wanted: boolean;
  priority: number; // -1 low, 0 normal, 1 high
}
export interface TorrentPeer {
  address: string;
  clientName: string;
  rateToClient: number;
  rateToPeer: number;
  progress: number; // 0..1
  flagStr: string;
}
export interface TrackerStat {
  host: string;
  announceState: number;
  lastAnnounceResult: string;
  lastAnnounceSucceeded: boolean;
  seederCount: number;
  leecherCount: number;
  nextAnnounceTime: number;
}
export interface TorrentDetail {
  id: number;
  name: string;
  comment: string;
  hashString: string;
  pieceCount: number;
  pieceSize: number;
  pieces: string; // base64 bitfield of downloaded pieces
  dateCreated: number;
  downloadDir: string;
  files: TorrentFile[];
  fileStats: TorrentFileStat[];
  peers: TorrentPeer[];
  trackerStats: TrackerStat[];
  seedRatioLimit: number;
  seedRatioMode: number; // 0 = use global, 1 = stop at this ratio, 2 = seed forever
  seedIdleLimit: number; // minutes
  seedIdleMode: number; // 0 = global, 1 = stop after idle, 2 = unlimited
}

export const DETAIL_FIELDS = [
  'id',
  'name',
  'comment',
  'hashString',
  'pieceCount',
  'pieceSize',
  'pieces',
  'dateCreated',
  'downloadDir',
  'files',
  'fileStats',
  'peers',
  'trackerStats',
  'seedRatioLimit',
  'seedRatioMode',
  'seedIdleLimit',
  'seedIdleMode',
] as const;

export interface SpeedLimits {
  downEnabled: boolean;
  downKbps: number;
  upEnabled: boolean;
  upKbps: number;
}

export interface SessionStats {
  downloadSpeed: number;
  uploadSpeed: number;
  activeTorrentCount: number;
  pausedTorrentCount: number;
  torrentCount: number;
}

/** Generic RPC outcome surfaced to the renderer over IPC. */
export interface RpcResult<T = unknown> {
  ok: boolean;
  result: string; // "success" or an error message
  arguments?: T;
}

/** Payload sent to the renderer when the OS opens a magnet/.torrent with us. */
export interface OpenAddPayload {
  url?: string; // magnet: link or http(s) .torrent URL
  metainfo?: string; // base64 of a local .torrent file
  name?: string;
}

/** A pre-add preview parsed from a magnet link or .torrent (file or URL). */
export interface TorrentPreview {
  kind: 'magnet' | 'metainfo';
  name: string;
  hash?: string;
  totalSize?: number;
  files?: { name: string; length: number }[];
  trackers?: string[];
  /** what to hand to torrent-add */
  source: { url?: string; metainfo?: string };
}

/** Connection state pushed to the renderer. */
export interface ConnectionState {
  connected: boolean;
  rpcVersion?: number;
  serverVersion?: string;
  error?: string;
}
