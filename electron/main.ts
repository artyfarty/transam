import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TransmissionClient } from './transmission';
import { TORRENT_FIELDS, DETAIL_FIELDS } from '../shared/types';
import type { ServerConfig, RpcResult } from '../shared/types';

let win: BrowserWindow | null = null;
let client: TransmissionClient | null = null;

// --- local config (kept in userData, never in the repo) ---------------------
function configPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}
function loadConfig(): ServerConfig | null {
  try {
    return JSON.parse(fs.readFileSync(configPath(), 'utf8')) as ServerConfig;
  } catch {
    return null;
  }
}
function saveConfig(cfg: ServerConfig): void {
  fs.writeFileSync(configPath(), JSON.stringify(cfg, null, 2), 'utf8');
}

// --- path mapping (local mounted path <-> daemon path) ----------------------
function localToRemote(cfg: ServerConfig, local: string): string {
  for (const m of cfg.pathMappings ?? []) {
    if (local.toLowerCase().startsWith(m.local.toLowerCase())) {
      const rest = local.slice(m.local.length).replace(/\\/g, '/');
      return (m.remote.replace(/\/+$/, '') + '/' + rest.replace(/^\/+/, '')).replace(/\/+/g, '/');
    }
  }
  return local;
}

function ensureClient(): TransmissionClient {
  if (!client) {
    const cfg = loadConfig();
    if (!cfg) throw new Error('not configured');
    client = new TransmissionClient(cfg);
  }
  return client;
}

// --- IPC --------------------------------------------------------------------
function registerIpc(): void {
  ipcMain.handle('config:get', () => loadConfig());

  ipcMain.handle('config:set', (_e, cfg: ServerConfig) => {
    saveConfig(cfg);
    client = new TransmissionClient(cfg);
    return true;
  });

  ipcMain.handle('rpc:test', async (): Promise<RpcResult> => {
    try {
      const c = ensureClient();
      return await c.call('session-get', { fields: ['rpc-version', 'version'] });
    } catch (e) {
      return { ok: false, result: (e as Error).message };
    }
  });

  ipcMain.handle('torrents:get', async (_e, ids?: number[]): Promise<RpcResult> => {
    const c = ensureClient();
    const args: Record<string, unknown> = { fields: TORRENT_FIELDS };
    if (ids && ids.length) args.ids = ids;
    return c.call('torrent-get', args);
  });

  ipcMain.handle('session:stats', async (): Promise<RpcResult> => {
    return ensureClient().call('session-stats');
  });

  ipcMain.handle('torrents:detail', async (_e, id: number): Promise<RpcResult> => {
    return ensureClient().call('torrent-get', { ids: [id], fields: DETAIL_FIELDS });
  });

  // Generic torrent-set passthrough (file priorities, location, labels, limits).
  ipcMain.handle('torrents:set', async (_e, ids: number[], args: Record<string, unknown>): Promise<RpcResult> => {
    return ensureClient().call('torrent-set', { ids, ...args });
  });

  ipcMain.handle('torrents:action', async (_e, action: string, ids: number[]): Promise<RpcResult> => {
    const c = ensureClient();
    switch (action) {
      case 'start':
        return c.call('torrent-start', { ids });
      case 'start-now':
        return c.call('torrent-start-now', { ids });
      case 'stop':
        return c.call('torrent-stop', { ids });
      case 'verify':
        return c.call('torrent-verify', { ids });
      case 'reannounce':
        return c.call('torrent-reannounce', { ids });
      case 'remove':
        return c.call('torrent-remove', { ids, 'delete-local-data': false });
      case 'remove-data':
        return c.call('torrent-remove', { ids, 'delete-local-data': true });
      default:
        return { ok: false, result: `unknown action: ${action}` };
    }
  });

  ipcMain.handle(
    'torrents:add',
    async (_e, opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean }): Promise<RpcResult> => {
      const c = ensureClient();
      const args: Record<string, unknown> = {};
      if (opts.url) args.filename = opts.url;
      if (opts.metainfo) args.metainfo = opts.metainfo;
      if (opts.downloadDir) args['download-dir'] = opts.downloadDir;
      if (opts.paused != null) args.paused = opts.paused;
      return c.call('torrent-add', args);
    },
  );

  // Native folder picker that maps the chosen local path to the daemon path.
  ipcMain.handle('dialog:pickFolder', async (): Promise<{ local: string; remote: string } | null> => {
    if (!win) return null;
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    if (r.canceled || !r.filePaths[0]) return null;
    const local = r.filePaths[0];
    const cfg = loadConfig();
    return { local, remote: cfg ? localToRemote(cfg, local) : local };
  });
}

// --- window -----------------------------------------------------------------
function createWindow(): void {
  win = new BrowserWindow({
    width: 1180,
    height: 720,
    minWidth: 760,
    minHeight: 420,
    backgroundColor: '#1b1d22',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
