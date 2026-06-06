import type { ServerConfig, RpcResult, OpenAddPayload } from '../shared/types';

declare global {
  interface Window {
    api: {
      getConfig(): Promise<ServerConfig | null>;
      setConfig(cfg: ServerConfig): Promise<boolean>;
      test(): Promise<RpcResult>;
      getTorrents(ids?: number[]): Promise<RpcResult>;
      sessionStats(): Promise<RpcResult>;
      detail(id: number): Promise<RpcResult>;
      set(ids: number[], args: Record<string, unknown>): Promise<RpcResult>;
      action(action: string, ids: number[]): Promise<RpcResult>;
      add(opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean }): Promise<RpcResult>;
      pickFolder(): Promise<{ local: string; remote: string } | null>;
      onOpenAdd(cb: (p: OpenAddPayload) => void): () => void;
    };
  }
}

export {};
