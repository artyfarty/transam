import { UiIcon } from './UiIcon';

interface Props {
  selectionCount: number;
  search: string;
  onSearch: (s: string) => void;
  onAdd: () => void;
  onStart: () => void;
  onPause: () => void;
  onRemove: () => void;
  onSettings: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Toolbar(p: Props) {
  const none = p.selectionCount === 0;
  return (
    <div className="toolbar">
      <button
        className={`icon-only ${p.sidebarOpen ? 'active' : ''}`}
        onClick={p.onToggleSidebar}
        title="Toggle sidebar"
      >
        <UiIcon name="sidebar" />
      </button>
      <span className="sep" />
      <button onClick={p.onAdd} title="Add torrent">
        <UiIcon name="add" />
        <span>Add</span>
      </button>
      <span className="sep" />
      <button disabled={none} onClick={p.onStart} title="Start">
        <UiIcon name="start" />
        <span>Start</span>
      </button>
      <button disabled={none} onClick={p.onPause} title="Pause">
        <UiIcon name="pause" />
        <span>Pause</span>
      </button>
      <button disabled={none} onClick={p.onRemove} title="Remove">
        <UiIcon name="remove" />
        <span>Remove</span>
      </button>
      <span className="spacer" />
      <div className="search-wrap">
        <UiIcon name="search" />
        <input className="search" placeholder="Filter…" value={p.search} onChange={(e) => p.onSearch(e.target.value)} />
      </div>
      <span className="sep" />
      <button className="icon-only" onClick={p.onSettings} title="Connection settings">
        <UiIcon name="settings" />
      </button>
    </div>
  );
}
