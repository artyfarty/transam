import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TorrentDetail, TorrentFile, TorrentFileStat } from '../../shared/types';
import { humanSize, percent } from '../format';
import { loadJSON, saveJSON } from '../persist';
import { ContextMenu, type MenuItem } from './ContextMenu';

const ROW_H = 22;

interface FileRow {
  f: TorrentFile;
  st?: TorrentFileStat;
  i: number;
}

interface FilesMeta {
  setWanted: (i: number, wanted: boolean) => void;
  setPriority: (i: number, pr: number) => void;
}

function meta(table: { options: { meta?: unknown } }): FilesMeta {
  return table.options.meta as FilesMeta;
}

// Module-level (stable) columns — recreating these each render breaks
// TanStack's column-resize drag (it holds a column reference).
const columns: ColumnDef<FileRow>[] = [
  {
    id: 'want',
    header: '',
    size: 26,
    minSize: 26,
    maxSize: 26,
    enableResizing: false,
    cell: ({ row, table }) => (
      <input
        type="checkbox"
        checked={row.original.st?.wanted ?? true}
        onChange={(e) => meta(table).setWanted(row.original.i, e.target.checked)}
      />
    ),
  },
  { id: 'name', header: 'Name', size: 300, cell: ({ row }) => <span className="ellip">{row.original.f.name}</span> },
  {
    id: 'size',
    header: 'Size',
    size: 80,
    cell: ({ row }) => <span className="num">{humanSize(row.original.f.length)}</span>,
  },
  {
    id: 'progress',
    header: 'Progress',
    size: 120,
    cell: ({ row }) => {
      const f = row.original.f;
      const done = f.length ? f.bytesCompleted / f.length : 0;
      return (
        <div className={`bar ${done >= 1 ? 'done' : ''}`}>
          <i style={{ width: `${Math.min(100, done * 100)}%` }} />
          <span>{percent(done)}</span>
        </div>
      );
    },
  },
  {
    id: 'priority',
    header: 'Priority',
    size: 84,
    cell: ({ row, table }) => (
      <select
        value={row.original.st?.priority ?? 0}
        disabled={!(row.original.st?.wanted ?? true)}
        onChange={(e) => meta(table).setPriority(row.original.i, Number(e.target.value))}
      >
        <option value={1}>High</option>
        <option value={0}>Normal</option>
        <option value={-1}>Low</option>
      </select>
    ),
  },
];

interface Props {
  detail: TorrentDetail;
  onSetWanted: (idx: number, wanted: boolean) => void;
  onSetPriority: (idx: number, pr: number) => void;
  onOpen: (name: string) => void;
  onReveal: (name: string) => void;
}

export function FilesTable({ detail, onSetWanted, onSetPriority, onOpen, onReveal }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const [colSizing, setColSizing] = useState<ColumnSizingState>(() => loadJSON<ColumnSizingState>('fileColSizing', {}));
  useEffect(() => saveJSON('fileColSizing', colSizing), [colSizing]);
  const [menu, setMenu] = useState<{ x: number; y: number; row: FileRow } | null>(null);

  const data = useMemo<FileRow[]>(
    () => detail.files.map((f, i) => ({ f, st: detail.fileStats[i], i })),
    [detail.files, detail.fileStats],
  );

  const table = useReactTable({
    data,
    columns,
    state: { columnSizing: colSizing },
    onColumnSizingChange: setColSizing,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    getCoreRowModel: getCoreRowModel(),
    defaultColumn: { minSize: 40 },
    meta: { setWanted: onSetWanted, setPriority: onSetPriority } satisfies FilesMeta,
  });

  const rows = table.getRowModel().rows;
  const totalWidth = table.getTotalSize();
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 12,
  });

  const menuItems: MenuItem[] = menu
    ? [
        { label: 'Open', onClick: () => onOpen(menu.row.f.name) },
        { label: 'Show in Explorer', onClick: () => onReveal(menu.row.f.name) },
        { separator: true },
        { label: 'Priority: High', onClick: () => onSetPriority(menu.row.i, 1) },
        { label: 'Priority: Normal', onClick: () => onSetPriority(menu.row.i, 0) },
        { label: 'Priority: Low', onClick: () => onSetPriority(menu.row.i, -1) },
        { separator: true },
        (menu.row.st?.wanted ?? true)
          ? { label: "Don't download", onClick: () => onSetWanted(menu.row.i, false) }
          : { label: 'Download', onClick: () => onSetWanted(menu.row.i, true) },
      ]
    : [];

  return (
    <div className="ftable">
      <div className="thead-wrap" ref={headRef}>
        <div className="thead" style={{ width: totalWidth }}>
          {table.getHeaderGroups()[0].headers.map((header) => (
            <div key={header.id} className="th" style={{ width: header.getSize() }}>
              <span className="th-label">{flexRender(header.column.columnDef.header, header.getContext())}</span>
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
          ))}
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
            return (
              <div
                key={row.original.i}
                className={`row ${vi.index % 2 ? 'odd' : 'even'}`}
                style={{ position: 'absolute', top: vi.start, height: ROW_H, width: totalWidth }}
                onDoubleClick={() => onOpen(row.original.f.name)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenu({ x: e.clientX, y: e.clientY, row: row.original });
                }}
                title="Double-click to open"
              >
                {row.getVisibleCells().map((cell) => (
                  <div key={cell.id} className="cell" style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menuItems} onClose={() => setMenu(null)} />}
    </div>
  );
}
