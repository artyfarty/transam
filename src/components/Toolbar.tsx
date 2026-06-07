import { IconPlus, IconPlay, IconPause, IconTrash, IconGear, IconSearch } from './icons';

interface Props {
  selectionCount: number;
  search: string;
  onSearch: (s: string) => void;
  onAdd: () => void;
  onStart: () => void;
  onPause: () => void;
  onRemove: () => void;
  onSettings: () => void;
}

export function Toolbar(p: Props) {
  const none = p.selectionCount === 0;
  return (
    <div className="toolbar">
      <button onClick={p.onAdd} title="Add torrent">
        <IconPlus />
        <span>Add</span>
      </button>
      <span className="sep" />
      <button disabled={none} onClick={p.onStart} title="Start">
        <IconPlay />
        <span>Start</span>
      </button>
      <button disabled={none} onClick={p.onPause} title="Pause">
        <IconPause />
        <span>Pause</span>
      </button>
      <button disabled={none} onClick={p.onRemove} title="Remove">
        <IconTrash />
        <span>Remove</span>
      </button>
      <span className="spacer" />
      <div className="search-wrap">
        <IconSearch />
        <input className="search" placeholder="Filter…" value={p.search} onChange={(e) => p.onSearch(e.target.value)} />
      </div>
      <span className="sep" />
      <button className="icon-only" onClick={p.onSettings} title="Connection settings">
        <IconGear />
      </button>
    </div>
  );
}
