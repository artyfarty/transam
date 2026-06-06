import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ServerConfig, Torrent } from '../shared/types';
import { Toolbar } from './components/Toolbar';
import { TorrentTable } from './components/TorrentTable';
import { DetailsPane } from './components/DetailsPane';
import { StatusBar } from './components/StatusBar';
import { ConnectDialog } from './components/ConnectDialog';
import { AddDialog } from './components/AddDialog';

const POLL_MS = 1500;

export function App() {
  const [config, setConfig] = useState<ServerConfig | null | undefined>(undefined);
  const [connected, setConnected] = useState(false);
  const [serverVersion, setServerVersion] = useState<string>();
  const [torrents, setTorrents] = useState<Torrent[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [down, setDown] = useState(0);
  const [up, setUp] = useState(0);
  const [showConnect, setShowConnect] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval>>();

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
    if (!search.trim()) return torrents;
    const q = search.toLowerCase();
    return torrents.filter((t) => t.name.toLowerCase().includes(q));
  }, [torrents, search]);

  const ids = useMemo(() => [...selected], [selected]);

  async function act(action: string) {
    if (!ids.length) return;
    if (action === 'remove' && !confirm(`Remove ${ids.length} torrent(s)? (data kept on disk)`)) return;
    await window.api.action(action, ids);
    poll();
  }

  const selectedTorrent = ids.length === 1 ? torrents.find((t) => t.id === ids[0]) ?? null : null;

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
        <TorrentTable torrents={filtered} selected={selected} onSelect={setSelected} />
        <DetailsPane torrent={selectedTorrent} />
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
          onCancel={() => setShowAdd(false)}
          onAdd={async (opts) => {
            const r = await window.api.add({ url: opts.url, downloadDir: opts.downloadDir, paused: opts.paused });
            if (!r.ok) throw new Error(r.result);
            poll();
          }}
        />
      )}
    </div>
  );
}
