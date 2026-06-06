import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerConfig, Torrent, TorrentDetail, OpenAddPayload } from '../shared/types';
import { Toolbar } from './components/Toolbar';
import { TorrentTable } from './components/TorrentTable';
import { DetailsPane } from './components/DetailsPane';
import { StatusBar } from './components/StatusBar';
import { ConnectDialog } from './components/ConnectDialog';
import { AddDialog } from './components/AddDialog';
import { Sidebar } from './components/Sidebar';
import { matchesFilter, type Filter } from './filters';
import { sortTorrents, type SortState } from './sort';

const POLL_MS = 1500;

export function App() {
  const [config, setConfig] = useState<ServerConfig | null | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [serverVersion, setServerVersion] = useState<string>();
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>({ kind: 'cat', id: 'all' });
  const [sort, setSort] = useState<SortState>({ key: 'queue', dir: 'asc' });
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);
  const [showConnect, setShowConnect] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
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
    const [tr, st] = await Promise.all([window.api.getTorrents(), window.api.sessionStats()]);
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
  }, []);

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

  async function act(action: string) {
    if (!ids.length) return;
    if (action === 'remove' && !confirm(`Remove ${ids.length} torrent(s)? (data kept on disk)`)) return;
    await window.api.action(action, ids);
    poll();
  }

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
      />
      <div className="body">
        <Sidebar torrents={torrents} filter={filter} onFilter={setFilter} />
        <div className="main">
          <TorrentTable torrents={filtered} selected={selected} onSelect={setSelected} sort={sort} onSort={onSort} />
          <DetailsPane torrent={selectedTorrent} detail={selId === detail?.id ? detail : null} onRefresh={fetchDetail} />
        </div>
      </div>
      <StatusBar connected={connected} serverVersion={serverVersion} count={torrents.length} downSpeed={down} upSpeed={up} />

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
