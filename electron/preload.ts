import { contextBridge, ipcRenderer } from 'electron';
import type { IpcRendererEvent } from 'electron';
import type { ServerConfig, RpcResult, OpenAddPayload } from '../shared/types';

// The typed surface exposed to the renderer as window.api.
const api = {
  getConfig: (): Promise<ServerConfig | null> => ipcRenderer.invoke('config:get'),
  setConfig: (cfg: ServerConfig): Promise<boolean> => ipcRenderer.invoke('config:set', cfg),
  test: (): Promise<RpcResult> => ipcRenderer.invoke('rpc:test'),
  getTorrents: (ids?: number[]): Promise<RpcResult> => ipcRenderer.invoke('torrents:get', ids),
  sessionStats: (): Promise<RpcResult> => ipcRenderer.invoke('session:stats'),
  sessionGet: (fields?: string[]): Promise<RpcResult> => ipcRenderer.invoke('session:get', fields),
  sessionSet: (args: Record<string, unknown>): Promise<RpcResult> => ipcRenderer.invoke('session:set', args),
  detail: (id: number): Promise<RpcResult> => ipcRenderer.invoke('torrents:detail', id),
  set: (ids: number[], args: Record<string, unknown>): Promise<RpcResult> =>
    ipcRenderer.invoke('torrents:set', ids, args),
  setLocation: (ids: number[], location: string, move: boolean): Promise<RpcResult> =>
    ipcRenderer.invoke('torrents:setLocation', ids, location, move),
  action: (action: string, ids: number[]): Promise<RpcResult> =>
    ipcRenderer.invoke('torrents:action', action, ids),
  add: (opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean }): Promise<RpcResult> =>
    ipcRenderer.invoke('torrents:add', opts),
  pickFolder: (): Promise<{ local: string; remote: string } | null> =>
    ipcRenderer.invoke('dialog:pickFolder'),
  openPath: (daemonPath: string): Promise<string> => ipcRenderer.invoke('shell:openPath', daemonPath),
  showItem: (daemonPath: string): Promise<void> => ipcRenderer.invoke('shell:showItem', daemonPath),
  onOpenAdd: (cb: (p: OpenAddPayload) => void): (() => void) => {
    const handler = (_e: IpcRendererEvent, p: OpenAddPayload) => cb(p);
    ipcRenderer.on('open-add', handler);
    return () => ipcRenderer.removeListener('open-add', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

export type Api = typeof api;
