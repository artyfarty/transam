import { useEffect, useState } from 'react';
import type { Torrent, TorrentDetail } from '../../shared/types';
import { humanSize, speed, percent, ratio, eta, statusText } from '../format';
import { PieceBar } from './PieceBar';
import { FilesTable } from './FilesTable';
import { StatusIcon } from './icons';

type Tab = 'general' | 'files' | 'peers' | 'trackers';

interface Props {
  torrent: Torrent | null;
  detail: TorrentDetail | null;
  onRefresh: () => void;
  height: number;
}

export function DetailsPane({ torrent, detail, onRefresh, height }: Props) {
  const [tab, setTab] = useState<Tab>('general');

  if (!torrent) {
    return (
      <div className="details" style={{ height }}>
        <div className="empty">No torrent selected</div>
      </div>
    );
  }

  return (
    <div className="details" style={{ height }}>
      <div className="tabs">
        {(['general', 'files', 'peers', 'trackers'] as Tab[]).map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {t === 'files' && detail ? ` (${detail.files.length})` : ''}
            {t === 'peers' && detail ? ` (${detail.peers.length})` : ''}
          </div>
        ))}
      </div>
      <div className={`tab-content ${tab === 'files' ? 'files-pane' : ''}`}>
        {tab === 'general' && <General t={torrent} d={detail} onRefresh={onRefresh} />}
        {tab === 'files' &&
          (detail ? <Files t={torrent} d={detail} onRefresh={onRefresh} /> : <div className="empty">Loading…</div>)}
        {tab === 'peers' && <Peers d={detail} />}
        {tab === 'trackers' && <Trackers d={detail} />}
      </div>
    </div>
  );
}

function KV({ k, v, wide }: { k: string; v: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`kv ${wide ? 'wide' : ''}`}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

function General({ t, d, onRefresh }: { t: Torrent; d: TorrentDetail | null; onRefresh: () => void }) {
  const added = t.addedDate ? new Date(t.addedDate * 1000).toLocaleString() : '—';
  const done = t.percentDone >= 1;
  return (
    <div className="general">
      <div className="g-head">
        <StatusIcon t={t} />
        <div className="g-name" title={t.name}>
          {t.name}
        </div>
      </div>

      <div className={`bar big ${done ? 'done' : t.status === 0 ? 'paused' : ''}`}>
        <i style={{ width: `${Math.min(100, t.percentDone * 100)}%` }} />
        <span>
          {percent(t.percentDone)} · {statusText(t)}
          {t.rateDownload > 0 ? ` · ↓ ${speed(t.rateDownload)}` : ''}
          {t.rateUpload > 0 ? ` · ↑ ${speed(t.rateUpload)}` : ''}
        </span>
      </div>

      {d?.pieces ? <PieceBar pieces={d.pieces} pieceCount={d.pieceCount} /> : null}

      <div className="g-cols">
        <section className="g-sect">
          <h4>Transfer</h4>
          <KV k="Downloaded" v={humanSize(t.downloadedEver)} />
          <KV k="Uploaded" v={humanSize(t.uploadedEver)} />
          <KV k="Ratio" v={ratio(t.uploadRatio)} />
          <KV k="Remaining" v={done ? '—' : humanSize(t.leftUntilDone)} />
          <KV k="ETA" v={eta(t.eta) || '—'} />
          <KV k="Peers" v={`${t.peersSendingToUs} seeds / ${t.peersGettingFromUs} peers`} />
        </section>
        <section className="g-sect">
          <h4>Info</h4>
          <KV k="Size" v={humanSize(t.totalSize)} />
          <KV k="Pieces" v={d ? `${d.pieceCount} × ${humanSize(d.pieceSize)}` : '…'} />
          <KV k="Added" v={added} />
          <KV k="Location" v={t.downloadDir} wide />
          {d?.hashString ? <KV k="Hash" v={<span className="mono">{d.hashString}</span>} wide /> : null}
        </section>
      </div>

      {d?.comment ? (
        <section className="g-sect">
          <KV k="Comment" v={d.comment} wide />
        </section>
      ) : null}
      {t.error ? (
        <section className="g-sect">
          <KV k="Error" v={<span style={{ color: 'var(--error)' }}>{t.errorString}</span>} wide />
        </section>
      ) : null}

      {d ? <SeedingControl t={t} d={d} onRefresh={onRefresh} /> : null}
    </div>
  );
}

function SeedingControl({ t, d, onRefresh }: { t: Torrent; d: TorrentDetail; onRefresh: () => void }) {
  const [rMode, setRMode] = useState(d.seedRatioMode);
  const [rLim, setRLim] = useState(String(d.seedRatioLimit));
  const [iMode, setIMode] = useState(d.seedIdleMode);
  const [iLim, setILim] = useState(String(d.seedIdleLimit));

  useEffect(() => {
    setRMode(d.seedRatioMode);
    setRLim(String(d.seedRatioLimit));
    setIMode(d.seedIdleMode);
    setILim(String(d.seedIdleLimit));
  }, [d.id, d.seedRatioMode, d.seedRatioLimit, d.seedIdleMode, d.seedIdleLimit]);

  async function apply() {
    await window.api.set([t.id], {
      seedRatioMode: rMode,
      seedRatioLimit: Math.max(0, parseFloat(rLim) || 0),
      seedIdleMode: iMode,
      seedIdleLimit: Math.max(0, parseInt(iLim, 10) || 0),
    });
    onRefresh();
  }

  return (
    <section className="g-sect seeding">
      <h4>Seeding limits</h4>
      <div className="seed-row">
        <span className="k">Ratio</span>
        <select value={rMode} onChange={(e) => setRMode(Number(e.target.value))}>
          <option value={0}>Use global</option>
          <option value={1}>Stop at ratio</option>
          <option value={2}>Seed forever</option>
        </select>
        <input
          type="number"
          min={0}
          step={0.1}
          value={rLim}
          disabled={rMode !== 1}
          onChange={(e) => setRLim(e.target.value)}
        />
      </div>
      <div className="seed-row">
        <span className="k">Idle</span>
        <select value={iMode} onChange={(e) => setIMode(Number(e.target.value))}>
          <option value={0}>Use global</option>
          <option value={1}>Stop when idle</option>
          <option value={2}>Unlimited</option>
        </select>
        <input
          type="number"
          min={0}
          value={iLim}
          disabled={iMode !== 1}
          onChange={(e) => setILim(e.target.value)}
        />
        <span className="unit">min</span>
      </div>
      <div className="seed-actions">
        <button className="primary" onClick={apply}>
          Apply
        </button>
      </div>
    </section>
  );
}

function Files({ t, d, onRefresh }: { t: Torrent; d: TorrentDetail; onRefresh: () => void }) {
  if (d.files.length === 0) return <div className="empty">No files</div>;
  const setWanted = async (idx: number, wanted: boolean) => {
    await window.api.set([t.id], wanted ? { 'files-wanted': [idx] } : { 'files-unwanted': [idx] });
    onRefresh();
  };
  const setPriority = async (idx: number, pr: number) => {
    const key = pr > 0 ? 'priority-high' : pr < 0 ? 'priority-low' : 'priority-normal';
    await window.api.set([t.id], { [key]: [idx] });
    onRefresh();
  };
  const openFile = (name: string) => {
    const dir = (d.downloadDir ?? '').replace(/\/+$/, '');
    void window.api.openPath(`${dir}/${name}`);
  };
  return <FilesTable detail={d} onSetWanted={setWanted} onSetPriority={setPriority} onOpen={openFile} />;
}

function Peers({ d }: { d: TorrentDetail | null }) {
  if (!d) return <div className="empty">Loading…</div>;
  if (d.peers.length === 0) return <div className="empty">No connected peers</div>;
  return (
    <table className="files">
      <thead>
        <tr>
          <th>Address</th>
          <th>Client</th>
          <th style={{ width: 60 }}>Done</th>
          <th style={{ width: 80 }}>Down</th>
          <th style={{ width: 80 }}>Up</th>
          <th style={{ width: 70 }}>Flags</th>
        </tr>
      </thead>
      <tbody>
        {d.peers.map((p, i) => (
          <tr key={i}>
            <td className="ellip">{p.address}</td>
            <td className="ellip" title={p.clientName}>
              {p.clientName}
            </td>
            <td className="num">{percent(p.progress)}</td>
            <td className="num">{speed(p.rateToClient)}</td>
            <td className="num">{speed(p.rateToPeer)}</td>
            <td>{p.flagStr}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Trackers({ d }: { d: TorrentDetail | null }) {
  if (!d) return <div className="empty">Loading…</div>;
  if (d.trackerStats.length === 0) return <div className="empty">No trackers</div>;
  return (
    <table className="files">
      <thead>
        <tr>
          <th>Tracker</th>
          <th style={{ width: 70 }}>Seeders</th>
          <th style={{ width: 70 }}>Leechers</th>
          <th>Last result</th>
        </tr>
      </thead>
      <tbody>
        {d.trackerStats.map((tr, i) => (
          <tr key={i}>
            <td className="ellip" title={tr.host}>
              {tr.host}
            </td>
            <td className="num">{tr.seederCount < 0 ? '—' : tr.seederCount}</td>
            <td className="num">{tr.leecherCount < 0 ? '—' : tr.leecherCount}</td>
            <td className="ellip" title={tr.lastAnnounceResult}>
              {tr.lastAnnounceResult || '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
