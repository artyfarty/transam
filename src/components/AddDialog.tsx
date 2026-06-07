import { useEffect, useState } from 'react';
import type { OpenAddPayload } from '../../shared/types';
import { extractName } from '../series';

interface Props {
  prefill?: OpenAddPayload | null;
  suggestions?: string[];
  defaultDir?: string;
  suggestDir?: (name: string) => string | undefined;
  onAdd: (opts: { url?: string; metainfo?: string; downloadDir?: string; paused: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function AddDialog({ prefill, suggestions = [], defaultDir = '', suggestDir, onAdd, onCancel }: Props) {
  const [url, setUrl] = useState(prefill?.url ?? '');
  const metainfo = prefill?.metainfo;
  const [dir, setDir] = useState(defaultDir);
  const [dirTouched, setDirTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Auto-suggest the folder of an existing series, until the user edits it.
  useEffect(() => {
    if (dirTouched || !suggestDir) return;
    const name = metainfo ? (prefill?.name ?? '') : url.trim() ? extractName(url.trim()) : '';
    if (!name) return;
    const s = suggestDir(name);
    if (s) setDir(s);
  }, [url, metainfo, prefill, dirTouched, suggestDir]);

  async function pick() {
    const r = await window.api.pickFolder();
    if (r) {
      setDir(r.remote);
      setDirTouched(true);
    }
  }

  async function submit() {
    if (!metainfo && !url.trim()) {
      setErr('Paste a magnet link or .torrent URL');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await onAdd({
        url: metainfo ? undefined : url.trim(),
        metainfo,
        downloadDir: dir.trim() || undefined,
        paused,
      });
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
        {metainfo ? (
          <div className="field">
            <label>Torrent file</label>
            <input value={prefill?.name ?? 'torrent'} readOnly />
          </div>
        ) : (
          <div className="field">
            <label>Magnet link or .torrent URL</label>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="magnet:?xt=…" autoFocus />
          </div>
        )}
        <div className="field">
          <label>Download to (server path)</label>
          <div className="field row2">
            <input
              style={{ flex: 1 }}
              list="destDirs"
              value={dir}
              onChange={(e) => {
                setDir(e.target.value);
                setDirTouched(true);
              }}
              placeholder="default"
            />
            <datalist id="destDirs">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
