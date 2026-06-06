import { contextBridge, ipcRenderer } from 'electron';
import type { ServerConfig, RpcResult } from '../shared/types';

// The typed surface exposed to the renderer as window.api.
const api = {
  getConfig: (): Promise<ServerConfig | null> => ipcRenderer.invoke('config:get'),
  setConfig: (cfg: ServerConfig): Promise<boolean> => ipcRenderer.invoke('config:set', cfg),
  test: (): Promise<RpcResult> => ipcRenderer.invoke('rpc:test'),
  getTorrents: (ids?: number[]): Promise<RpcResult> => ipcRenderer.invoke('torrents:get', ids),
  sessionStats: (): Promise<RpcResult> => ipcRenderer.invoke('session:stats'),
  action: (action: string, ids: number[]): Promise<RpcResult> =>
    ipcRenderer.invoke('torrents:action', action, ids),
  add: (opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean }): Promise<RpcResult> =>
    ipcRenderer.invoke('torrents:add', opts),
  pickFolder: (): Promise<{ local: string; remote: string } | null> =>
    ipcRenderer.invoke('dialog:pickFolder'),
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
