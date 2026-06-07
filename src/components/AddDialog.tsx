import { useEffect, useState } from 'react';
import type { OpenAddPayload, TorrentPreview } from '../../shared/types';
import { humanSize } from '../format';

interface Props {
  prefill?: OpenAddPayload | null;
  suggestions?: string[];
  defaultDir?: string;
  suggestDir?: (name: string) => string | undefined;
  onAdd: (opts: { url?: string; metainfo?: string; downloadDir?: string; paused: boolean }) => Promise<void>;
  onCancel: () => void;
}

export function AddDialog({ prefill, suggestions = [], defaultDir = '', suggestDir, onAdd, onCancel }: Props) {
  const opened = !!(prefill?.url || prefill?.metainfo);
  const [step, setStep] = useState<'source' | 'preview'>(opened ? 'preview' : 'source');
  const [url, setUrl] = useState(prefill?.url ?? '');
  const [preview, setPreview] = useState<TorrentPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [err, setErr] = useState('');

  const [dir, setDir] = useState(defaultDir);
  const [dirTouched, setDirTouched] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);

  async function parse(input: { url?: string; metainfo?: string }) {
    setParsing(true);
    setErr('');
    const r = await window.api.parseTorrent(input);
    setParsing(false);
    if ('error' in r) {
      setErr(r.error);
      setStep('source');
      return;
    }
    setPreview(r);
    setStep('preview');
  }

  // OS-opened magnet/.torrent → parse straight away
  useEffect(() => {
    if (prefill?.metainfo) parse({ metainfo: prefill.metainfo });
    else if (prefill?.url) parse({ url: prefill.url });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // suggest a destination from the parsed name until the user edits it
  useEffect(() => {
    if (!preview || dirTouched) return;
    setDir(suggestDir?.(preview.name) ?? defaultDir);
  }, [preview, dirTouched, suggestDir, defaultDir]);

  async function pickFile() {
    const r = await window.api.pickTorrent();
    if (r) parse({ metainfo: r.metainfo });
  }

  async function submit() {
    if (!preview) return;
    setBusy(true);
    setErr('');
    try {
      await onAdd({ ...preview.source, downloadDir: dir.trim() || undefined, paused });
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
      return;
    }
    onCancel();
  }

  return (
    <div className="modal-back">
      <div className="modal add">
        {step === 'source' ? (
          <>
            <h2>Add torrent</h2>
            <div className="field">
              <label>Magnet link or .torrent URL</label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="magnet:?xt=…"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && url.trim() && parse({ url })}
              />
            </div>
            <div className="or">— or —</div>
            <button className="file-btn" onClick={pickFile}>
              Choose a .torrent file…
            </button>
            <div className="err">{err}</div>
            <div className="actions">
              <button onClick={onCancel}>Cancel</button>
              <button className="primary" disabled={!url.trim() || parsing} onClick={() => parse({ url })}>
                {parsing ? 'Reading…' : 'Next'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>Add torrent</h2>
            {parsing || !preview ? (
              <div className="empty">Reading…</div>
            ) : (
              <>
                <div className="prev-name" title={preview.name}>
                  {preview.name}
                </div>
                <div className="prev-meta">
                  {preview.kind === 'metainfo' ? (
                    <>
                      <span>{humanSize(preview.totalSize ?? 0)}</span>
                      <span>{preview.files?.length ?? 0} file(s)</span>
                    </>
                  ) : (
                    <>
                      <span className="tag">magnet</span>
                      {preview.hash && <span className="mono">{preview.hash.slice(0, 16)}…</span>}
                      {preview.trackers?.length ? <span>{preview.trackers.length} tracker(s)</span> : null}
                    </>
                  )}
                </div>

                {preview.files && preview.files.length > 1 && (
                  <div className="prev-files">
                    {preview.files.slice(0, 200).map((f, i) => (
                      <div key={i} className="prev-file">
                        <span className="ellip">{f.name}</span>
                        <span className="num">{humanSize(f.length)}</span>
                      </div>
                    ))}
                    {preview.files.length > 200 && <div className="prev-file dim">…and {preview.files.length - 200} more</div>}
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
                    <button
                      onClick={async () => {
                        const r = await window.api.pickFolder();
                        if (r) {
                          setDir(r.remote);
                          setDirTouched(true);
                        }
                      }}
                      style={{ padding: '6px 10px' }}
                    >
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
                  {!opened && (
                    <button onClick={() => setStep('source')} disabled={busy}>
                      Back
                    </button>
                  )}
                  <button onClick={onCancel} disabled={busy}>
                    Cancel
                  </button>
                  <button className="primary" onClick={submit} disabled={busy}>
                    {busy ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
