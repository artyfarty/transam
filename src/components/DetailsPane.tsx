import { useState } from 'react';
import type { Torrent, TorrentDetail } from '../../shared/types';
import { humanSize, speed, percent, ratio, eta, statusText } from '../format';

type Tab = 'general' | 'files' | 'peers' | 'trackers';

interface Props {
  torrent: Torrent | null;
  detail: TorrentDetail | null;
  onRefresh: () => void;
}

export function DetailsPane({ torrent, detail, onRefresh }: Props) {
  const [tab, setTab] = useState<Tab>('general');

  if (!torrent) {
    return (
      <div className="details">
        <div className="empty">No torrent selected</div>
      </div>
    );
  }

  return (
    <div className="details">
      <div className="tabs">
        {(['general', 'files', 'peers', 'trackers'] as Tab[]).map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            {t === 'files' && detail ? ` (${detail.files.length})` : ''}
            {t === 'peers' && detail ? ` (${detail.peers.length})` : ''}
          </div>
        ))}
      </div>
      <div className="tab-content">
        {tab === 'general' && <General t={torrent} d={detail} />}
        {tab === 'files' && <Files t={torrent} d={detail} onRefresh={onRefresh} />}
        {tab === 'peers' && <Peers d={detail} />}
        {tab === 'trackers' && <Trackers d={detail} />}
      </div>
    </div>
  );
}

function General({ t, d }: { t: Torrent; d: TorrentDetail | null }) {
  const added = t.addedDate ? new Date(t.addedDate * 1000).toLocaleString() : '—';
  return (
    <div className="grid">
      <span className="k">Status</span>
      <span>{statusText(t)}</span>
      <span className="k">Size</span>
      <span>{humanSize(t.totalSize)}</span>

      <span className="k">Progress</span>
      <span>{percent(t.percentDone)}</span>
      <span className="k">Remaining</span>
      <span>{humanSize(t.leftUntilDone)}</span>

      <span className="k">Download</span>
      <span>{speed(t.rateDownload) || '—'}</span>
      <span className="k">Upload</span>
      <span>{speed(t.rateUpload) || '—'}</span>

      <span className="k">Downloaded</span>
      <span>{humanSize(t.downloadedEver)}</span>
      <span className="k">Uploaded</span>
      <span>{humanSize(t.uploadedEver)}</span>

      <span className="k">Ratio</span>
      <span>{ratio(t.uploadRatio)}</span>
      <span className="k">ETA</span>
      <span>{eta(t.eta) || '—'}</span>

      <span className="k">Added</span>
      <span>{added}</span>
      <span className="k">Pieces</span>
      <span>{d ? `${d.pieceCount} × ${humanSize(d.pieceSize)}` : '…'}</span>

      <span className="k">Location</span>
      <span style={{ gridColumn: 'span 3', userSelect: 'text' }}>{t.downloadDir}</span>

      {d?.hashString && (
        <>
          <span className="k">Hash</span>
          <span style={{ gridColumn: 'span 3', userSelect: 'text', font: 'var(--mono)' }}>{d.hashString}</span>
        </>
      )}
      {d?.comment && (
        <>
          <span className="k">Comment</span>
          <span style={{ gridColumn: 'span 3', userSelect: 'text' }}>{d.comment}</span>
        </>
      )}
      {t.error ? (
        <>
          <span className="k">Error</span>
          <span style={{ gridColumn: 'span 3', color: 'var(--error)', userSelect: 'text' }}>{t.errorString}</span>
        </>
      ) : null}
    </div>
  );
}

function Files({ t, d, onRefresh }: { t: Torrent; d: TorrentDetail | null; onRefresh: () => void }) {
  if (!d) return <div className="empty">Loading…</div>;
  if (d.files.length === 0) return <div className="empty">No files</div>;

  async function setWanted(idx: number, wanted: boolean) {
    await window.api.set([t.id], wanted ? { 'files-wanted': [idx] } : { 'files-unwanted': [idx] });
    onRefresh();
  }
  async function setPriority(idx: number, pr: number) {
    const key = pr > 0 ? 'priority-high' : pr < 0 ? 'priority-low' : 'priority-normal';
    await window.api.set([t.id], { [key]: [idx] });
    onRefresh();
  }

  return (
    <table className="files">
      <thead>
        <tr>
          <th style={{ width: 24 }}></th>
          <th>Name</th>
          <th style={{ width: 80 }}>Size</th>
          <th style={{ width: 60 }}>Done</th>
          <th style={{ width: 80 }}>Priority</th>
        </tr>
      </thead>
      <tbody>
        {d.files.map((f, i) => {
          const st = d.fileStats[i];
          const done = f.length ? f.bytesCompleted / f.length : 0;
          return (
            <tr key={i}>
              <td>
                <input type="checkbox" checked={st?.wanted ?? true} onChange={(e) => setWanted(i, e.target.checked)} />
              </td>
              <td className="ellip" title={f.name}>
                {f.name}
              </td>
              <td className="num">{humanSize(f.length)}</td>
              <td className="num">{percent(done)}</td>
              <td>
                <select
                  value={st?.priority ?? 0}
                  onChange={(e) => setPriority(i, Number(e.target.value))}
                  disabled={!(st?.wanted ?? true)}
                >
                  <option value={1}>High</option>
                  <option value={0}>Normal</option>
                  <option value={-1}>Low</option>
                </select>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
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
