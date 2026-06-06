import { useState } from 'react';

interface Props {
  onAdd: (opts: { url: string; downloadDir?: string; paused: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function AddDialog({ onAdd, onCancel }: Props) {
  const [url, setUrl] = useState('');
  const [dir, setDir] = useState('');
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick() {
    const r = await window.api.pickFolder();
    if (r) setDir(r.remote);
  }

  async function submit() {
    if (!url.trim()) {
      setErr('Paste a magnet link or .torrent URL');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await onAdd({ url: url.trim(), downloadDir: dir.trim() || undefined, paused });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      return;
    }
    onCancel();
  }

  return (
    <div className="modal-back">
      <div className="modal">
        <h2>Add torrent</h2>
        <div className="field">
          <label>Magnet link or .torrent URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="magnet:?xt=…" autoFocus />
        </div>
        <div className="field">
          <label>Download to (server path)</label>
          <div className="field row2">
            <input style={{ flex: 1 }} value={dir} onChange={(e) => setDir(e.target.value)} placeholder="default" />
            <button onClick={pick} style={{ padding: '6px 10px' }}>
              Browse…
            </button>
          </div>
        </div>
        <div className="field row2">
          <input id="paused" type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} />
          <label htmlFor="paused" style={{ cursor: 'pointer' }}>
            Add paused
          </label>
        </div>
        <div className="err">{err}</div>
        <div className="actions">
          <button onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={submit} disabled={busy}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
