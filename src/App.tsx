import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ServerConfig, Torrent, TorrentDetail, OpenAddPayload, SpeedLimits } from '../shared/types';
import { Toolbar } from './components/Toolbar';
import { TorrentTable } from './components/TorrentTable';
import { DetailsPane } from './components/DetailsPane';
import { StatusBar } from './components/StatusBar';
import { ConnectDialog } from './components/ConnectDialog';
import { AddDialog } from './components/AddDialog';
import { AboutModal } from './components/AboutModal';
import { Sidebar } from './components/Sidebar';
import { Splitter } from './components/Splitter';
import { ContextMenu, type MenuItem } from './components/ContextMenu';
import { matchesFilter, type Filter } from './filters';
import { sortTorrents, type SortState } from './sort';
import { loadJSON, saveJSON } from './persist';

const POLL_MS = 1500;

export function App() {
  const [config, setConfig] = useState<ServerConfig | null | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [serverVersion, setServerVersion] = useState<string>();
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>(() => loadJSON<Filter>('filter', { kind: 'cat', id: 'all' }));
  const [sort, setSort] = useState<SortState>(() => loadJSON<SortState>('sort', { key: 'queue', dir: 'asc' }));
  useEffect(() => saveJSON('filter', filter), [filter]);
  useEffect(() => saveJSON('sort', sort), [sort]);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const [sidebarW, setSidebarW] = useState<number>(() => loadJSON('sidebarW', 168));
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => loadJSON('sidebarOpen', true));
  useEffect(() => saveJSON('sidebarW', sidebarW), [sidebarW]);
  useEffect(() => saveJSON('sidebarOpen', sidebarOpen), [sidebarOpen]);

  // Details pane height is stored as a fraction of the main column so the
  // top/bottom split scales smoothly when the window is maximized/restored.
  const mainRef = useRef<HTMLDivElement>(null);
  const [mainH, setMainH] = useState(560);
  useLayoutEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setMainH(el.clientHeight));
    ro.observe(el);
    setMainH(el.clientHeight);
    return () => ro.disconnect();
  }, []);
  const [detailsFrac, setDetailsFrac] = useState<number>(() => loadJSON('detailsFrac', 0.3));
  useEffect(() => saveJSON('detailsFrac', detailsFrac), [detailsFrac]);
  const detailsH = Math.round(clamp(mainH * detailsFrac, 110, Math.max(140, mainH - 110)));
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);
  const [limits, setLimits] = useState<SpeedLimits | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [addPrefill, setAddPrefill] = useState<OpenAddPayload | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>();

  // OS opened a magnet link or .torrent file with us → open the Add dialog.
  useEffect(() => {
    return window.api.onOpenAdd((p) => {
      setAddPrefill(p);
      setShowAdd(true);
    });
  }, []);

  // initial config load
  useEffect(() => {
    window.api.getConfig().then((cfg) => {
      setConfig(cfg);
      if (!cfg) setShowConnect(true);
    });
  }, []);

  const poll = useCallback(async () => {
    const [tr, st, sg] = await Promise.all([
      window.api.getTorrents(),
      window.api.sessionStats(),
      window.api.sessionGet([
        'speed-limit-down',
        'speed-limit-down-enabled',
        'speed-limit-up',
        'speed-limit-up-enabled',
      ]),
    ]);
    if (tr.ok && tr.arguments) {
      const list = (tr.arguments as { torrents: Torrent[] }).torrents ?? [];
      list.sort((a, b) => a.queuePosition - b.queuePosition || a.addedDate - b.addedDate);
      setTorrents(list);
      setConnected(true);
    } else {
      setConnected(false);
    }
    if (st.ok && st.arguments) {
      const s = st.arguments as { downloadSpeed: number; uploadSpeed: number };
      setDown(s.downloadSpeed ?? 0);
      setUp(s.uploadSpeed ?? 0);
    }
    if (sg.ok && sg.arguments) {
      const a = sg.arguments as Record<string, unknown>;
      setLimits({
        downEnabled: !!a['speed-limit-down-enabled'],
        downKbps: Number(a['speed-limit-down'] ?? 0),
        upEnabled: !!a['speed-limit-up-enabled'],
        upKbps: Number(a['speed-limit-up'] ?? 0),
      });
    }
  }, []);

  async function setLimit(dir: 'down' | 'up', enabled: boolean, kbps: number) {
    const args =
      dir === 'down'
        ? { 'speed-limit-down-enabled': enabled, 'speed-limit-down': kbps }
        : { 'speed-limit-up-enabled': enabled, 'speed-limit-up': kbps };
    await window.api.sessionSet(args);
    poll();
  }

  // (re)connect + polling whenever we have a config
  useEffect(() => {
    if (!config) return;
    let alive = true;
    (async () => {
      const r = await window.api.test();
      if (!alive) return;
      if (r.ok && r.arguments) {
        setServerVersion((r.arguments as { version?: string }).version);
        setConnected(true);
      }
      poll();
      timer.current = setInterval(poll, POLL_MS);
    })();
    return () => {
      alive = false;
      if (timer.current) clearInterval(timer.current);
    };
  }, [config, poll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = torrents.filter(
      (t) => matchesFilter(t, filter) && (!q || t.name.toLowerCase().includes(q)),
    );
    return sortTorrents(list, sort);
  }, [torrents, search, filter, sort]);

  const onSort = useCallback((key: string) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }, []);

  const ids = useMemo(() => [...selected], [selected]);

  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  async function act(action: string) {
    if (!ids.length) return;
    if (action === 'remove' && !confirm(`Remove ${ids.length} torrent(s)? (data kept on disk)`)) return;
    if (action === 'remove-data' && !confirm(`Remove ${ids.length} torrent(s) AND delete data from disk?`)) return;
    await window.api.action(action, ids);
    poll();
  }

  async function relocate() {
    if (!ids.length) return;
    const r = await window.api.pickFolder();
    if (r) {
      await window.api.setLocation(ids, r.remote, true);
      poll();
    }
  }

  // native menu (File/Edit/Help) actions arrive over IPC; dispatch with the
  // latest closures via a ref so the one-time subscription stays fresh.
  const onMenu = (a: string) => {
    if (a === 'add') setShowAdd(true);
    else if (a === 'settings') setShowConnect(true);
    else if (a === 'about') setShowAbout(true);
    else if (a === 'relocate') relocate();
    else act(a);
  };
  const onMenuRef = useRef(onMenu);
  onMenuRef.current = onMenu;
  useEffect(() => window.api.onMenuAction((a) => onMenuRef.current(a)), []);

  const ctxTarget = () => torrents.find((t) => t.id === ids[0]);
  function openFolder() {
    const t = ctxTarget();
    if (t) void window.api.openPath(t.downloadDir);
  }
  function revealItem() {
    const t = ctxTarget();
    if (t) void window.api.showItem(`${t.downloadDir.replace(/\/+$/, '')}/${t.name}`);
  }

  const menuItems: MenuItem[] = [
    { label: 'Start', onClick: () => act('start') },
    { label: 'Start now', onClick: () => act('start-now') },
    { label: 'Pause', onClick: () => act('stop') },
    { separator: true },
    { label: 'Open folder', onClick: openFolder },
    { label: 'Show in Explorer', onClick: revealItem },
    { label: 'Verify', onClick: () => act('verify') },
    { label: 'Reannounce', onClick: () => act('reannounce') },
    { label: 'Set location…', onClick: relocate },
    { separator: true },
    { label: 'Remove', onClick: () => act('remove') },
    { label: 'Remove + delete data', danger: true, onClick: () => act('remove-data') },
  ];

  // keyboard shortcuts (ignored while typing in a form field)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ') {
        if (!ids.length) return;
        e.preventDefault();
        const anyActive = torrents.some((t) => ids.includes(t.id) && t.status !== 0);
        act(anyActive ? 'stop' : 'start');
      } else if (e.key === 'Delete') {
        act('remove');
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelected(new Set(filtered.map((t) => t.id)));
      } else if (e.key === 'Escape') {
        setMenu(null);
        setSelected(new Set());
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, torrents, filtered]);

  const selId = ids.length === 1 ? ids[0] : null;
  const selectedTorrent = selId != null ? torrents.find((t) => t.id === selId) ?? null : null;

  const [detail, setDetail] = useState<TorrentDetail | null>(null);
  const fetchDetail = useCallback(async () => {
    if (selId == null) {
      setDetail(null);
      return;
    }
    const r = await window.api.detail(selId);
    if (r.ok && r.arguments) {
      const arr = (r.arguments as { torrents: TorrentDetail[] }).torrents;
      setDetail(arr?.[0] ?? null);
    }
  }, [selId]);

  useEffect(() => {
    if (selId == null) {
      setDetail(null);
      return;
    }
    fetchDetail();
    const iv = setInterval(fetchDetail, POLL_MS);
    return () => clearInterval(iv);
  }, [selId, fetchDetail]);

  if (config === undefined) return null; // loading

  return (
    <div className="app">
      <Toolbar
        selectionCount={ids.length}
        search={search}
        onSearch={setSearch}
        onAdd={() => setShowAdd(true)}
        onStart={() => act('start')}
        onPause={() => act('stop')}
        onRemove={() => act('remove')}
        onSettings={() => setShowConnect(true)}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="body">
        {sidebarOpen && (
          <>
            <Sidebar torrents={torrents} filter={filter} onFilter={setFilter} width={sidebarW} />
            <Splitter orientation="v" onDrag={(d) => setSidebarW((w) => clamp(w + d, 120, 420))} />
          </>
        )}
        <div className="main" ref={mainRef}>
          <TorrentTable
            torrents={filtered}
            selected={selected}
            onSelect={setSelected}
            sort={sort}
            onSort={onSort}
            onContext={(x, y) => setMenu({ x, y })}
          />
          <Splitter
            orientation="h"
            onDrag={(d) => setDetailsFrac((f) => clamp(f - d / Math.max(1, mainH), 0.1, 0.85))}
          />
          <DetailsPane
            torrent={selectedTorrent}
            detail={selId === detail?.id ? detail : null}
            onRefresh={fetchDetail}
            height={detailsH}
          />
        </div>
      </div>
      <StatusBar
        connected={connected}
        serverVersion={serverVersion}
        count={torrents.length}
        downSpeed={down}
        upSpeed={up}
        limits={limits}
        onSetLimit={setLimit}
      />

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {showConnect && (
        <ConnectDialog
          initial={config}
          onSaved={(cfg) => {
            setShowConnect(false);
            setConfig({ ...cfg }); // new ref → triggers reconnect effect
          }}
          onCancel={config ? () => setShowConnect(false) : undefined}
        />
      )}
      {showAdd && (
        <AddDialog
          prefill={addPrefill}
          onCancel={() => {
            setShowAdd(false);
            setAddPrefill(null);
          }}
          onAdd={async (opts) => {
            const r = await window.api.add({
              url: opts.url,
              metainfo: opts.metainfo,
              downloadDir: opts.downloadDir,
              paused: opts.paused,
            });
            if (!r.ok) throw new Error(r.result);
            poll();
          }}
        />
      )}
    </div>
  );
}
