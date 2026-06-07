import { useState } from 'react';

interface Item {
  label?: string;
  action?: string;
  sep?: boolean;
}
interface Menu {
  label: string;
  items: Item[];
}

const MENUS: Menu[] = [
  {
    label: 'File',
    items: [
      { label: 'Add Torrent / Magnet…', action: 'add' },
      { sep: true },
      { label: 'Connection Settings…', action: 'settings' },
      { label: 'Client Preferences…', action: 'preferences' },
      { sep: true },
      { label: 'Quit', action: 'quit' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Start', action: 'start' },
      { label: 'Start Now', action: 'start-now' },
      { label: 'Pause', action: 'stop' },
      { sep: true },
      { label: 'Verify', action: 'verify' },
      { label: 'Reannounce', action: 'reannounce' },
      { label: 'Set Location…', action: 'relocate' },
      { sep: true },
      { label: 'Remove', action: 'remove' },
      { label: 'Remove + Delete Data', action: 'remove-data' },
    ],
  },
  { label: 'Help', items: [{ label: 'About Transam', action: 'about' }] },
];

export function MenuBar({ onAction }: { onAction: (action: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="menubar">
      {open && <div className="menu-back" onMouseDown={() => setOpen(null)} />}
      {MENUS.map((m) => (
        <div className="menu-root" key={m.label}>
          <button
            className={`menu-label ${open === m.label ? 'on' : ''}`}
            onClick={() => setOpen((o) => (o === m.label ? null : m.label))}
            onMouseEnter={() => open && setOpen(m.label)}
          >
            {m.label}
          </button>
          {open === m.label && (
            <div className="menu-drop">
              {m.items.map((it, i) =>
                it.sep ? (
                  <div key={i} className="ctx-sep" />
                ) : (
                  <div
                    key={i}
                    className="ctx-item"
                    onClick={() => {
                      setOpen(null);
                      onAction(it.action!);
                    }}
                  >
                    {it.label}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
