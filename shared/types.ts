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

/** Connection state pushed to the renderer. */
export interface ConnectionState {
  connected: boolean;
  rpcVersion?: number;
  serverVersion?: string;
  error?: string;
}
