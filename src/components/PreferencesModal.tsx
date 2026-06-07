import { useState } from 'react';

type Theme = 'dark' | 'light';

interface Props {
  theme: Theme;
  onTheme: (t: Theme) => void;
  onClose: () => void;
}

export function PreferencesModal({ theme, onTheme, onClose }: Props) {
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

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Client Preferences</h2>

        <div className="field">
          <label>Theme</label>
          <select value={theme} onChange={(e) => onTheme(e.target.value as Theme)}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
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
