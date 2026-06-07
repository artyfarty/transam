import type { ServerConfig, RpcResult, OpenAddPayload, TorrentPreview, ImportResult } from '../shared/types';

declare global {
  interface Window {
    api: {
      getConfig(): Promise<ServerConfig | null>;
      setConfig(cfg: ServerConfig): Promise<boolean>;
      importTransgui(explicitPath?: string): Promise<ImportResult>;
      pickImportFile(): Promise<string | null>;
      test(): Promise<RpcResult>;
      getTorrents(ids?: number[]): Promise<RpcResult>;
      sessionStats(): Promise<RpcResult>;
      sessionGet(fields?: string[]): Promise<RpcResult>;
      portTest(): Promise<RpcResult>;
      sessionSet(args: Record<string, unknown>): Promise<RpcResult>;
      detail(id: number): Promise<RpcResult>;
      set(ids: number[], args: Record<string, unknown>): Promise<RpcResult>;
      setLocation(ids: number[], location: string, move: boolean): Promise<RpcResult>;
      action(action: string, ids: number[]): Promise<RpcResult>;
      add(opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean }): Promise<RpcResult>;
      pickFolder(): Promise<{ local: string; remote: string } | null>;
      pickTorrent(): Promise<{ metainfo: string; name: string } | null>;
      parseTorrent(input: { url?: string; metainfo?: string }): Promise<TorrentPreview | { error: string }>;
      openPath(daemonPath: string): Promise<string>;
      showItem(daemonPath: string): Promise<void>;
      associate(): Promise<string>;
      getLocale(): Promise<string>;
      setZoom(factor: number): Promise<void>;
      onOpenAdd(cb: (p: OpenAddPayload) => void): () => void;
      onMenuAction(cb: (action: string) => void): () => void;
    };
  }
}

export {};
