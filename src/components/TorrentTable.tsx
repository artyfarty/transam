import { useEffect, useRef, useState } from 'react';
import {
  type ColumnDef,
  type ColumnSizingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Torrent } from '../../shared/types';
import { TorrentStatus } from '../../shared/types';
import { humanSize, speed, percent, ratio, eta, statusText, labelColor } from '../format';
import { StatusIcon } from './icons';
import { loadJSON, saveJSON } from '../persist';
import type { SortState } from '../sort';

const ROW_H = 24;

const columns: ColumnDef<Torrent>[] = [
  {
    id: 'status',
    header: '',
    size: 28,
    minSize: 28,
    maxSize: 28,
    enableResizing: false,
    enableHiding: false,
    cell: ({ row }) => <StatusIcon t={row.original} />,
  },
  {
    id: 'name',
    header: 'Name',
    size: 360,
    enableHiding: false,
    cell: ({ row }) => (
      <>
        <span className="ellip">{row.original.name}</span>
        {row.original.labels?.map((l) => (
          <span key={l} className="tag-chip" title={l} style={{ background: labelColor(l) }}>
            {l}
          </span>
        ))}
      </>
    ),
  },
  {
    id: 'size',
    header: 'Size',
    size: 84,
    cell: ({ row }) => <span className="num">{humanSize(row.original.sizeWhenDone || row.original.totalSize)}</span>,
  },
  {
    id: 'done',
    header: 'Done',
    size: 120,
    cell: ({ row }) => {
      const t = row.original;
      const cls = t.error ? 'error' : t.status === TorrentStatus.Stopped ? 'paused' : t.percentDone >= 1 ? 'done' : '';
      return (
        <div className={`bar ${cls}`}>
          <i style={{ width: `${Math.min(100, t.percentDone * 100)}%` }} />
          <span>{percent(t.percentDone)}</span>
        </div>
      );
    },
  },
  { id: 'status_text', header: 'Status', size: 100, cell: ({ row }) => statusText(row.original) },
  { id: 'seeds', header: 'Seeds', size: 58, cell: ({ row }) => <span className="num">{row.original.peersSendingToUs}</span> },
  { id: 'peers', header: 'Peers', size: 58, cell: ({ row }) => <span className="num">{row.original.peersGettingFromUs}</span> },
  { id: 'down', header: 'Down', size: 86, cell: ({ row }) => <span className="num">{speed(row.original.rateDownload)}</span> },
  { id: 'up', header: 'Up', size: 86, cell: ({ row }) => <span className="num">{speed(row.original.rateUpload)}</span> },
  { id: 'eta', header: 'ETA', size: 74, cell: ({ row }) => <span className="num">{eta(row.original.eta)}</span> },
  { id: 'ratio', header: 'Ratio', size: 58, cell: ({ row }) => <span className="num">{ratio(row.original.uploadRatio)}</span> },
  {
    id: 'added',
    header: 'Added',
    size: 130,
    cell: ({ row }) => <span className="num">{addedStr(row.original.addedDate)}</span>,
  },
];

function addedStr(ts: number): string {
  if (!ts) return '';
  return new Date(ts * 1000).toLocaleString(undefined, {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// our sort keys differ from a couple of column ids
const colSortKey: Record<string, string> = { status_text: 'status' };

interface Props {
  torrents: Torrent[];
  selected: Set<number>;
  onSelect: (sel: Set<number>) => void;
  sort: SortState;
  onSort: (key: string) => void;
  busy: Set<number>;
  scrollToId?: number;
  onContext: (x: number, y: number) => void;
}

export function TorrentTable({ torrents, selected, onSelect, sort, onSort, busy, scrollToId, onContext }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const anchor = useRef<number | null>(null);

  const [colSizing, setColSizing] = useState<ColumnSizingState>(() => loadJSON<ColumnSizingState>('colSizing', {}));
  useEffect(() => saveJSON('colSizing', colSizing), [colSizing]);
  const [colVis, setColVis] = useState<VisibilityState>(() => loadJSON<VisibilityState>('colVisibility', {}));
  useEffect(() => saveJSON('colVisibility', colVis), [colVis]);
  const [colMenu, setColMenu] = useState<{ x: number; y: number } | null>(null);

  const table = useReactTable({
    data: torrents,
    columns,
    state: { columnSizing: colSizing, columnVisibility: colVis },
    onColumnSizingChange: setColSizing,
    onColumnVisibilityChange: setColVis,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { minSize: 44 },
  });

  const rows = table.getRowModel().rows;
  const totalWidth = table.getTotalSize();

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 14,
  });

  // keep the keyboard-selected row in view
  useEffect(() => {
    if (scrollToId == null) return;
    const i = torrents.findIndex((t) => t.id === scrollToId);
    if (i >= 0) virtualizer.scrollToIndex(i, { align: 'auto' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToId]);

  function clickRow(e: React.MouseEvent, t: Torrent, index: number) {
    if (e.shiftKey && anchor.current != null) {
      const [lo, hi] = anchor.current < index ? [anchor.current, index] : [index, anchor.current];
      const next = new Set<number>();
      for (let i = lo; i <= hi; i++) next.add(rows[i].original.id);
      onSelect(next);
      return;
    }
    const next = new Set(selected);
    if (e.ctrlKey || e.metaKey) {
      next.has(t.id) ? next.delete(t.id) : next.add(t.id);
    } else {
      next.clear();
      next.add(t.id);
    }
    anchor.current = index;
    onSelect(next);
  }

  function contextRow(e: React.MouseEvent, t: Torrent, index: number) {
    e.preventDefault();
    if (!selected.has(t.id)) {
      anchor.current = index;
      onSelect(new Set([t.id]));
    }
    onContext(e.clientX, e.clientY);
  }

  return (
    <div className="table">
      <div
        className="thead-wrap"
        ref={headRef}
        onContextMenu={(e) => {
          e.preventDefault();
          setColMenu({ x: e.clientX, y: e.clientY });
        }}
      >
        <div className="thead" style={{ width: totalWidth }}>
          {table.getHeaderGroups()[0].headers.map((header) => {
            const sortKey = colSortKey[header.column.id] ?? header.column.id;
            const sortable = header.column.id !== 'status'; // the icon column isn't sortable
            return (
              <div key={header.id} className="th" style={{ width: header.getSize() }}>
                <span className="th-label" onClick={sortable ? () => onSort(sortKey) : undefined}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {sortable && sort.key === sortKey && (
                    <span className="sort-arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </span>
                {header.column.getCanResize() && (
                  <div
                    className={`col-resize ${header.column.getIsResizing() ? 'on' : ''}`}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      header.getResizeHandler()(e);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="tbody"
        ref={parentRef}
        onScroll={(e) => {
          if (headRef.current) headRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }}
      >
        <div style={{ height: virtualizer.getTotalSize(), width: totalWidth, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const row = rows[vi.index];
            const t = row.original;
            const sel = selected.has(t.id);
            return (
              <div
                key={t.id}
                className={`row ${vi.index % 2 ? 'odd' : 'even'} ${sel ? 'sel' : ''} ${busy.has(t.id) ? 'busy' : ''}`}
                style={{ position: 'absolute', top: vi.start, height: ROW_H, width: totalWidth }}
                onMouseDown={(e) => clickRow(e, t, vi.index)}
                onContextMenu={(e) => contextRow(e, t, vi.index)}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    className="cell"
                    style={{ width: cell.column.getSize() }}
                    title={cell.column.id === 'name' ? t.name : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {colMenu && (
        <div className="ctx-back" onMouseDown={() => setColMenu(null)} onContextMenu={(e) => e.preventDefault()}>
          <div className="ctx col-picker" style={{ left: colMenu.x, top: colMenu.y }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="col-picker-head">Columns</div>
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <label key={c.id} className="ctx-item check">
                  <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} />
                  <span>{String(c.columnDef.header)}</span>
                </label>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
