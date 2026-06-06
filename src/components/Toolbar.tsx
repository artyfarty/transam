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
      <button onClick={p.onAdd}>+ Add</button>
      <span className="sep" />
      <button disabled={none} onClick={p.onStart}>
        ▶ Start
      </button>
      <button disabled={none} onClick={p.onPause}>
        ⏸ Pause
      </button>
      <button disabled={none} onClick={p.onRemove}>
        ✕ Remove
      </button>
      <span className="spacer" />
      <input
        className="search"
        placeholder="Filter…"
        value={p.search}
        onChange={(e) => p.onSearch(e.target.value)}
      />
      <span className="sep" />
      <button onClick={p.onSettings} title="Connection settings">
        ⚙
      </button>
    </div>
  );
}
