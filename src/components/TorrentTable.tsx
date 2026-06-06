import { useLayoutEffect, useRef, useState } from 'react';
import type { Torrent } from '../../shared/types';
import { TorrentStatus } from '../../shared/types';
import { humanSize, speed, percent, ratio, eta, statusText } from '../format';

const ROW_H = 23;
const OVERSCAN = 8;

interface Column {
  key: string;
  label: string;
  width: number; // 0 = flexible (name)
  cls?: string;
  render: (t: Torrent) => React.ReactNode;
}

const columns: Column[] = [
  { key: 'name', label: 'Name', width: 0, render: (t) => t.name },
  { key: 'size', label: 'Size', width: 80, cls: 'num', render: (t) => humanSize(t.sizeWhenDone || t.totalSize) },
  {
    key: 'done',
    label: 'Done',
    width: 110,
    render: (t) => {
      const cls = t.status === TorrentStatus.Stopped ? 'paused' : t.percentDone >= 1 ? 'done' : '';
      return (
        <div className={`bar ${cls}`}>
          <i style={{ width: `${Math.min(100, t.percentDone * 100)}%` }} />
          <span>{percent(t.percentDone)}</span>
        </div>
      );
    },
  },
  { key: 'status', label: 'Status', width: 96, render: (t) => statusText(t) },
  { key: 'seeds', label: 'Seeds', width: 54, cls: 'num', render: (t) => String(t.peersSendingToUs) },
  { key: 'peers', label: 'Peers', width: 54, cls: 'num', render: (t) => String(t.peersGettingFromUs) },
  { key: 'down', label: 'Down', width: 78, cls: 'num', render: (t) => speed(t.rateDownload) },
  { key: 'up', label: 'Up', width: 78, cls: 'num', render: (t) => speed(t.rateUpload) },
  { key: 'eta', label: 'ETA', width: 70, cls: 'num', render: (t) => eta(t.eta) },
  { key: 'ratio', label: 'Ratio', width: 54, cls: 'num', render: (t) => ratio(t.uploadRatio) },
];

interface Props {
  torrents: Torrent[];
  selected: Set<number>;
  onSelect: (sel: Set<number>) => void;
}

export function TorrentTable({ torrents, selected, onSelect }: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [vh, setVh] = useState(400);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVh(el.clientHeight));
    ro.observe(el);
    setVh(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const total = torrents.length * ROW_H;
  const start = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const end = Math.min(torrents.length, Math.ceil((scrollTop + vh) / ROW_H) + OVERSCAN);
  const visible = torrents.slice(start, end);

  function clickRow(e: React.MouseEvent, t: Torrent) {
    const next = new Set(selected);
    if (e.ctrlKey || e.metaKey) {
      next.has(t.id) ? next.delete(t.id) : next.add(t.id);
    } else {
      next.clear();
      next.add(t.id);
    }
    onSelect(next);
  }

  const colStyle = (c: Column): React.CSSProperties =>
    c.width === 0 ? { flex: '1 1 auto', minWidth: 120 } : { flex: `0 0 ${c.width}px`, width: c.width };

  return (
    <div className="table">
      <div className="thead">
        {columns.map((c) => (
          <div key={c.key} className="th" style={colStyle(c)}>
            {c.label}
          </div>
        ))}
      </div>
      <div className="tbody" ref={bodyRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <div style={{ height: total }} />
        {visible.map((t, i) => {
          const index = start + i;
          const sel = selected.has(t.id);
          return (
            <div
              key={t.id}
              className={`row ${index % 2 ? 'odd' : 'even'} ${sel ? 'sel' : ''}`}
              style={{ top: index * ROW_H }}
              onMouseDown={(e) => clickRow(e, t)}
            >
              {columns.map((c) => (
                <div key={c.key} className={`cell ${c.cls ?? ''}`} style={colStyle(c)} title={c.key === 'name' ? t.name : undefined}>
                  {c.render(t)}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
