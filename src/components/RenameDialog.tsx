import { useEffect, useRef, useState } from 'react';

/** Why a new torrent/file name can't be used ('' = fine). Transmission takes one path component. */
export function badName(name: string): string {
  const n = name.trim();
  if (!n) return 'Name is empty';
  if (n.includes('/')) return 'Name can’t contain “/”';
  if (n === '.' || n === '..') return 'Not a valid name';
  return '';
}

/** Select the name without its extension, so typing replaces just the title. */
export function selectStem(input: HTMLInputElement | null): void {
  if (!input) return;
  const dot = input.value.lastIndexOf('.');
  input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
}

interface Props {
  title: string;
  initial: string;
  /** select the part before the extension (files) rather than everything */
  keepExtension?: boolean;
  onApply: (name: string) => Promise<string | void>; // resolves to an error message, if any
  onCancel: () => void;
}

export function RenameDialog({ title, initial, keepExtension, onApply, onCancel }: Props) {
  const [name, setName] = useState(initial);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    if (keepExtension) selectStem(ref.current);
    else ref.current?.select();
    // once, on open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function apply() {
    const n = name.trim();
    if (n === initial) return onCancel();
    const bad = badName(n);
    if (bad) return setErr(bad);
    setBusy(true);
    const e = await onApply(n);
    if (e) {
      setErr(e);
      setBusy(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        <div className="field">
          <label>New name</label>
          <input
            ref={ref}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErr('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void apply();
              else if (e.key === 'Escape') onCancel();
            }}
          />
        </div>
        <div className="err">{err}</div>
        <div className="actions">
          <button onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={apply} disabled={busy}>
            {busy ? 'Renaming…' : 'Rename'}
          </button>
        </div>
      </div>
    </div>
  );
}
