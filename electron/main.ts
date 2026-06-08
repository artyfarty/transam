import { app, BrowserWindow, ipcMain, dialog, shell, Menu, Tray } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { TransmissionClient } from './transmission';
import { TORRENT_FIELDS, DETAIL_FIELDS } from '../shared/types';
import type { ServerConfig, RpcResult, OpenAddPayload, TorrentPreview } from '../shared/types';
import { parseTorrentFile } from './bencode';
import { importProfiles } from './importTransgui';
import { DEMO, demoConfig, demoHandle } from './demo';

let win: BrowserWindow | null = null;
let client: TransmissionClient | null = null;
let pendingOpen: OpenAddPayload[] = [];
let tray: Tray | null = null;
let minimizeToTray = false;

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

// --- app prefs that the main process owns (tray; autostart is the OS login item) ---
interface MainPrefs {
  minimizeToTray: boolean;
}
function prefsPath(): string {
  return path.join(app.getPath('userData'), 'prefs.json');
}
function loadPrefs(): MainPrefs {
  try {
    return { minimizeToTray: false, ...(JSON.parse(fs.readFileSync(prefsPath(), 'utf8')) as Partial<MainPrefs>) };
  } catch {
    return { minimizeToTray: false };
  }
}
function savePrefs(p: MainPrefs): void {
  fs.writeFileSync(prefsPath(), JSON.stringify(p, null, 2), 'utf8');
}

// --- system tray (only present while "minimize to tray" is on) ---------------
function trayIcon(): string {
  return path.join(__dirname, '../../dist/icon.png');
}
function showWindow(): void {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
function ensureTray(): void {
  if (tray) return;
  tray = new Tray(trayIcon());
  tray.setToolTip('Transam');
  tray.on('click', showWindow);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Show Transam', click: showWindow },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]),
  );
}
function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
function applyMinimizeToTray(enabled: boolean): void {
  minimizeToTray = enabled;
  if (enabled) ensureTray();
  else {
    destroyTray();
    if (win && !win.isVisible()) showWindow(); // don't strand a hidden window
  }
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

function remoteToLocal(cfg: ServerConfig, remote: string): string {
  for (const m of cfg.pathMappings ?? []) {
    const r = m.remote.replace(/\/+$/, '');
    if (remote.toLowerCase().startsWith(r.toLowerCase())) {
      const rest = remote.slice(r.length).replace(/^\/+/, '');
      const win = /^[A-Za-z]:/.test(m.local) || m.local.includes('\\');
      const sep = win ? '\\' : '/';
      const tail = win ? rest.replace(/\//g, '\\') : rest;
      return m.local.replace(/[\\/]+$/, '') + sep + tail;
    }
  }
  return remote;
}

const pexec = promisify(execFile);
async function registerTorrentAssoc(): Promise<void> {
  const exe = process.execPath;
  const root = 'HKCU\\Software\\Classes';
  const cmds: string[][] = [
    [`${root}\\.torrent`, '/ve', '/d', 'Transam.torrent', '/f'],
    [`${root}\\Transam.torrent`, '/ve', '/d', 'BitTorrent file', '/f'],
    [`${root}\\Transam.torrent\\DefaultIcon`, '/ve', '/d', `${exe},0`, '/f'],
    [`${root}\\Transam.torrent\\shell\\open\\command`, '/ve', '/d', `"${exe}" "%1"`, '/f'],
  ];
  for (const c of cmds) await pexec('reg', ['add', ...c]);
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
  ipcMain.handle('config:get', () => (DEMO ? demoConfig() : loadConfig()));

  ipcMain.handle('config:set', (_e, cfg: ServerConfig) => {
    saveConfig(cfg);
    client = new TransmissionClient(cfg);
    return true;
  });

  // Standard places a legacy transgui install keeps its config.
  function transguiSearchDirs(): string[] {
    const roaming = app.getPath('appData'); // %APPDATA% (Roaming)
    const local = path.join(roaming, '..', 'Local'); // %LOCALAPPDATA%
    return [local, roaming, app.getPath('home')];
  }

  ipcMain.handle('config:importTransgui', (_e, explicitPath?: string) =>
    importProfiles(transguiSearchDirs(), explicitPath),
  );

  ipcMain.handle('app:getPrefs', () => ({
    openAtLogin: app.getLoginItemSettings().openAtLogin,
    minimizeToTray,
  }));

  ipcMain.handle('app:setAutostart', (_e, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled });
    return app.getLoginItemSettings().openAtLogin;
  });

  ipcMain.handle('app:setMinimizeToTray', (_e, enabled: boolean) => {
    savePrefs({ minimizeToTray: enabled });
    applyMinimizeToTray(enabled);
    return enabled;
  });

  ipcMain.handle('dialog:pickImportFile', async (): Promise<string | null> => {
    const r = await dialog.showOpenDialog({
      title: 'Select transgui.ini',
      properties: ['openFile'],
      filters: [
        { name: 'transgui settings', extensions: ['ini'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    return r.canceled || !r.filePaths[0] ? null : r.filePaths[0];
  });

  ipcMain.handle('rpc:test', async (): Promise<RpcResult> => {
    if (DEMO) return demoHandle('session:get');
    try {
      const c = ensureClient();
      return await c.call('session-get', { fields: ['rpc-version', 'version'] });
    } catch (e) {
      return { ok: false, result: (e as Error).message };
    }
  });

  ipcMain.handle('torrents:get', async (_e, ids?: number[]): Promise<RpcResult> => {
    if (DEMO) return demoHandle('torrents:get');
    const c = ensureClient();
    const args: Record<string, unknown> = { fields: TORRENT_FIELDS };
    if (ids && ids.length) args.ids = ids;
    return c.call('torrent-get', args);
  });

  ipcMain.handle('session:stats', async (): Promise<RpcResult> => {
    if (DEMO) return demoHandle('session:stats');
    return ensureClient().call('session-stats');
  });

  ipcMain.handle('session:get', async (_e, fields?: string[]): Promise<RpcResult> => {
    if (DEMO) return demoHandle('session:get');
    return ensureClient().call('session-get', fields ? { fields } : {});
  });

  ipcMain.handle('session:set', async (_e, args: Record<string, unknown>): Promise<RpcResult> => {
    return ensureClient().call('session-set', args);
  });

  ipcMain.handle('session:portTest', async (): Promise<RpcResult> => {
    return ensureClient().call('port-test');
  });

  ipcMain.handle('torrents:detail', async (_e, id: number): Promise<RpcResult> => {
    if (DEMO) return demoHandle('torrents:detail', id);
    return ensureClient().call('torrent-get', { ids: [id], fields: DETAIL_FIELDS });
  });

  // Generic torrent-set passthrough (file priorities, location, labels, limits).
  ipcMain.handle('torrents:set', async (_e, ids: number[], args: Record<string, unknown>): Promise<RpcResult> => {
    return ensureClient().call('torrent-set', { ids, ...args });
  });

  ipcMain.handle(
    'torrents:setLocation',
    async (_e, ids: number[], location: string, move: boolean): Promise<RpcResult> => {
      return ensureClient().call('torrent-set-location', { ids, location, move });
    },
  );

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
    async (
      _e,
      opts: { url?: string; metainfo?: string; downloadDir?: string; paused?: boolean; labels?: string[] },
    ): Promise<RpcResult> => {
      const c = ensureClient();
      const args: Record<string, unknown> = {};
      if (opts.url) args.filename = opts.url;
      if (opts.metainfo) args.metainfo = opts.metainfo;
      if (opts.downloadDir) args['download-dir'] = opts.downloadDir;
      if (opts.paused != null) args.paused = opts.paused;
      if (opts.labels?.length) args.labels = opts.labels;
      return c.call('torrent-add', args);
    },
  );

  // Open a file/folder that lives on the daemon, via its mapped local path.
  ipcMain.handle('shell:openPath', async (_e, daemonPath: string): Promise<string> => {
    const cfg = loadConfig();
    const local = cfg ? remoteToLocal(cfg, daemonPath) : daemonPath;
    return shell.openPath(local); // '' on success, else an error message
  });

  // Reveal a file/folder in the OS file manager (selects it).
  ipcMain.handle('shell:showItem', async (_e, daemonPath: string): Promise<void> => {
    const cfg = loadConfig();
    shell.showItemInFolder(cfg ? remoteToLocal(cfg, daemonPath) : daemonPath);
  });

  // OS regional locale (for date/number formatting in the renderer).
  ipcMain.handle('app:getLocale', () => app.getSystemLocale());

  // interface scale (accessibility) — zoom the whole renderer
  ipcMain.handle('app:setZoom', (_e, factor: number) => {
    win?.webContents.setZoomFactor(factor);
  });

  // Register as the magnet: protocol handler and the .torrent file association.
  ipcMain.handle('app:associate', async (): Promise<string> => {
    const out: string[] = [];
    out.push(app.setAsDefaultProtocolClient('magnet') ? 'magnet: registered' : 'magnet: failed');
    if (process.platform === 'win32') {
      try {
        await registerTorrentAssoc();
        out.push('.torrent: registered');
      } catch (e) {
        out.push(`.torrent: ${(e as Error).message}`);
      }
    } else {
      out.push('.torrent: only on Windows (use the packaged installer elsewhere)');
    }
    return out.join('\n');
  });

  // Pick a local .torrent file → base64 metainfo for the add preview.
  ipcMain.handle('dialog:pickTorrent', async (): Promise<{ metainfo: string; name: string } | null> => {
    if (!win) return null;
    const r = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'Torrent', extensions: ['torrent'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const file = r.filePaths[0];
    return { metainfo: fs.readFileSync(file).toString('base64'), name: path.basename(file) };
  });

  // Parse a magnet/.torrent (file or URL) into a preview, without adding it.
  ipcMain.handle(
    'add:parse',
    async (_e, input: { url?: string; metainfo?: string }): Promise<TorrentPreview | { error: string }> => {
      try {
        if (input.metainfo) {
          const p = parseTorrentFile(input.metainfo);
          return { kind: 'metainfo', name: p.name, totalSize: p.totalSize, files: p.files, source: { metainfo: input.metainfo } };
        }
        const url = (input.url ?? '').trim();
        if (/^magnet:/i.test(url)) {
          const u = new URL(url);
          const xt = u.searchParams.get('xt') ?? '';
          const hash = xt.replace(/^urn:btih:/i, '') || undefined;
          const name = u.searchParams.get('dn') || hash || 'magnet';
          return { kind: 'magnet', name, hash, trackers: u.searchParams.getAll('tr'), source: { url } };
        }
        if (/^https?:\/\//i.test(url)) {
          const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
          if (!res.ok) return { error: `HTTP ${res.status}` };
          const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
          const p = parseTorrentFile(b64);
          return { kind: 'metainfo', name: p.name, totalSize: p.totalSize, files: p.files, source: { metainfo: b64 } };
        }
        return { error: 'Unrecognized link (expected a magnet: or http(s) .torrent)' };
      } catch (e) {
        return { error: (e as Error).message };
      }
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

// --- OS magnet/.torrent handoff --------------------------------------------
function sendOpen(p: OpenAddPayload): void {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
    if (!win.webContents.isLoading()) {
      win.webContents.send('open-add', p);
      return;
    }
  }
  pendingOpen.push(p); // flushed on did-finish-load
}

function openTorrentFile(file: string): void {
  try {
    const metainfo = fs.readFileSync(file).toString('base64');
    sendOpen({ metainfo, name: path.basename(file) });
  } catch {
    /* ignore unreadable file */
  }
}

/** Pull a magnet link or a .torrent path out of process argv. */
function handleArgv(argv: string[]): void {
  for (const a of argv.slice(1)) {
    if (/^magnet:/i.test(a)) sendOpen({ url: a });
    else if (a.toLowerCase().endsWith('.torrent') && fs.existsSync(a)) openTorrentFile(a);
  }
}

// The menu lives in the renderer's toolbar row, so drop the native menu bar.
function buildMenu(): void {
  Menu.setApplicationMenu(null);
}

// --- window state persistence ----------------------------------------------
interface WinState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  maximized: boolean;
}
function winStatePath(): string {
  return path.join(app.getPath('userData'), 'window.json');
}
function loadWinState(): WinState | null {
  try {
    return JSON.parse(fs.readFileSync(winStatePath(), 'utf8')) as WinState;
  } catch {
    return null;
  }
}
function saveWinState(): void {
  if (!win) return;
  const b = win.getNormalBounds();
  try {
    fs.writeFileSync(
      winStatePath(),
      JSON.stringify({ x: b.x, y: b.y, width: b.width, height: b.height, maximized: win.isMaximized() }),
    );
  } catch {
    /* ignore */
  }
}

// Screenshot driver (TRANSAM_SHOT=<png path>): seed a personal label so the
// gold chip shows, let the demo data populate, select a row to fill the details
// pane, then capture the page and quit. Used only for docs screenshots.
function captureScreenshot(w: BrowserWindow): void {
  const out = process.env.TRANSAM_SHOT!;
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  let loads = 0;
  w.webContents.on('did-finish-load', async () => {
    loads += 1;
    if (loads === 1) {
      // personalLabel "Alice" so torrents tagged Alice render in the gold frame
      await w.webContents.executeJavaScript(
        `localStorage.setItem('personalLabel','"Alice"');localStorage.setItem('theme','"dark"');true`,
      );
      w.reload();
      return;
    }
    await delay(2000); // let the poll loop fetch demo torrents
    await w.webContents.executeJavaScript(
      `(()=>{const r=document.querySelector('.tbody .row');if(r){r.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));}return !!r;})()`,
    );
    await delay(1200); // let the detail fetch + render settle
    const img = await w.webContents.capturePage();
    fs.writeFileSync(out, img.toPNG());
    app.quit();
  });
}

// --- window -----------------------------------------------------------------
function createWindow(): void {
  const ws = loadWinState();
  win = new BrowserWindow({
    width: ws?.width ?? 1180,
    height: ws?.height ?? 720,
    x: ws?.x,
    y: ws?.y,
    minWidth: 760,
    minHeight: 420,
    backgroundColor: '#1b1d22',
    icon: path.join(__dirname, '../../dist/icon.png'),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  if (ws?.maximized && !process.env.TRANSAM_SHOT) win.maximize();
  if (process.env.TRANSAM_SHOT) {
    win.setSize(1320, 840);
    win.center();
  }

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'));
  }

  win.webContents.on('did-finish-load', () => {
    const queued = pendingOpen;
    pendingOpen = [];
    for (const p of queued) win?.webContents.send('open-add', p);
  });

  if (process.env.TRANSAM_SHOT) captureScreenshot(win);

  // Minimize-to-tray: when enabled, a minimize hides the window (off the
  // taskbar) and leaves only the tray icon; clicking the tray restores it.
  win.on('minimize', () => {
    if (minimizeToTray) {
      ensureTray();
      win?.hide();
    }
  });

  win.on('close', saveWinState);
  win.on('closed', () => {
    win = null;
  });
}

// Single-instance: route a magnet/.torrent opened while we're already running
// into the existing window instead of spawning a second app.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => handleArgv(argv));
  app.setAsDefaultProtocolClient('magnet');

  // macOS hands off via events rather than argv.
  app.on('open-url', (e, url) => {
    e.preventDefault();
    sendOpen({ url });
  });
  app.on('open-file', (e, file) => {
    e.preventDefault();
    openTorrentFile(file);
  });

  app.whenReady().then(() => {
    if (process.platform === 'win32') app.setAppUserModelId('dev.transam.app');
    registerIpc();
    buildMenu();
    createWindow();
    applyMinimizeToTray(loadPrefs().minimizeToTray); // restore the tray setting
    handleArgv(process.argv);
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
