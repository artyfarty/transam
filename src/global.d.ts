import type { ServerConfig, RpcResult, OpenAddPayload } from '../shared/types';

declare global {
  interface Window {
    api: {
      getConfig(): Promise<ServerConfig | null>;
      setConfig(cfg: ServerConfig): Promise<boolean>;
      test(): Promise<RpcResult>;
      getTorrents(ids?: number[]): Promise<RpcResult>;
      sessionStats(): Promise<RpcResult>;
      sessionGet(fields?: string[]): Promise<RpcResult>;
      sessionSet(args: Record<string, unknown>): Promise<RpcResult>;
      detail(id: number): Promise<RpcResult>;
      set(ids: number[], args: Record<string, unknown>): Promise<RpcResult>;
      setLocation(ids: number[], location: string, move: boolean): Promise<RpcResult>;
      action(action: string, ids: number[]): Promise<RpcResult>;
      add(opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean }): Promise<RpcResult>;
      pickFolder(): Promise<{ local: string; remote: string } | null>;
      openPath(daemonPath: string): Promise<string>;
      onOpenAdd(cb: (p: OpenAddPayload) => void): () => void;
    };
  }
}

export {};
