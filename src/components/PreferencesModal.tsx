import { useState } from 'react';
import type { LabelRule } from '../labelRules';

type Theme = 'dark' | 'light';

interface Props {
  theme: Theme;
  onTheme: (t: Theme) => void;
  zoom: number;
  onZoom: (z: number) => void;
  labelRules: LabelRule[];
  onLabelRules: (rules: LabelRule[]) => void;
  onRunLabelRules: () => void;
  onClose: () => void;
}

export function PreferencesModal({ theme, onTheme, zoom, onZoom, labelRules, onLabelRules, onRunLabelRules, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function associate() {
    setBusy(true);
    setMsg('');
    try {
      setMsg(await window.api.associate());
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  const update = (i: number, patch: Partial<LabelRule>) =>
    onLabelRules(labelRules.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal prefs" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Client Preferences</h2>

        <div className="field">
          <label>Theme</label>
          <select value={theme} onChange={(e) => onTheme(e.target.value as Theme)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </div>

        <div className="field">
          <label>Interface scale</label>
          <select value={zoom} onChange={(e) => onZoom(Number(e.target.value))}>
            <option value={1}>100%</option>
            <option value={1.1}>110%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
            <option value={1.75}>175%</option>
            <option value={2}>200%</option>
          </select>
        </div>

        <div className="field">
          <label>Label rules — path wildcard → label (auto-applied to new torrents)</label>
          {labelRules.map((r, i) => (
            <div className="rule-row" key={i}>
              <input
                placeholder="*/Movies/*"
                value={r.pattern}
                onChange={(e) => update(i, { pattern: e.target.value })}
              />
              <span className="arrow">→</span>
              <input className="rule-label" placeholder="Movie" value={r.label} onChange={(e) => update(i, { label: e.target.value })} />
              <button className="del" title="Remove" onClick={() => onLabelRules(labelRules.filter((_, j) => j !== i))}>
                ✕
              </button>
            </div>
          ))}
          <div className="rule-actions">
            <button className="add-map" onClick={() => onLabelRules([...labelRules, { pattern: '', label: '' }])}>
              + Add rule
            </button>
            <button className="assoc-btn" onClick={onRunLabelRules}>
              Apply to existing torrents
            </button>
          </div>
        </div>

        <div className="field">
          <label>File associations</label>
          <button className="assoc-btn" onClick={associate} disabled={busy}>
            {busy ? 'Registering…' : 'Register magnet links & .torrent files'}
          </button>
          {msg && <pre className="assoc-msg">{msg}</pre>}
        </div>

        <div className="actions">
          <button className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
