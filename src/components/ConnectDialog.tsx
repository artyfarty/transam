import { useState } from 'react';
import type { ServerConfig, PathMapping } from '../../shared/types';

const DEFAULTS: ServerConfig = {
  host: '',
  port: 9091,
  rpcPath: '/transmission/rpc',
  useHttps: false,
  username: '',
  password: '',
  pathMappings: [],
};

interface Props {
  initial: ServerConfig | null;
  onSaved: (cfg: ServerConfig) => void;
  onCancel?: () => void;
}

export function ConnectDialog({ initial, onSaved, onCancel }: Props) {
  const [cfg, setCfg] = useState<ServerConfig>({ ...DEFAULTS, ...(initial ?? {}) });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const up = (patch: Partial<ServerConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const mappings: PathMapping[] = cfg.pathMappings ?? [];
  const setMappings = (m: PathMapping[]) => up({ pathMappings: m });
  const updateMapping = (i: number, patch: Partial<PathMapping>) =>
    setMappings(mappings.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  async function saveAndTest() {
    if (!cfg.host.trim()) {
      setErr('Host is required');
      return;
    }
    const clean: ServerConfig = {
      ...cfg,
      pathMappings: (cfg.pathMappings ?? []).filter((m) => m.local.trim() && m.remote.trim()),
    };
    setBusy(true);
    setErr('');
    await window.api.setConfig(clean);
    const r = await window.api.test();
    setBusy(false);
    if (!r.ok) {
      setErr(r.result || 'connection failed');
      return;
    }
    onSaved(clean);
  }

  return (
    <div className="modal-back">
      <div className="modal">
        <h2>Connect to Transmission</h2>
        <div className="field">
          <label>Host</label>
          <input value={cfg.host} onChange={(e) => up({ host: e.target.value })} placeholder="nas.local or 192.168.x.x" autoFocus />
        </div>
        <div className="field row2">
          <div className="field" style={{ flex: 1 }}>
            <label>Port</label>
            <input type="number" value={cfg.port} onChange={(e) => up({ port: Number(e.target.value) })} />
          </div>
          <div className="field" style={{ flex: 2 }}>
            <label>RPC path</label>
            <input value={cfg.rpcPath} onChange={(e) => up({ rpcPath: e.target.value })} />
          </div>
        </div>
        <div className="field row2">
          <div className="field" style={{ flex: 1 }}>
            <label>Username</label>
            <input value={cfg.username} onChange={(e) => up({ username: e.target.value })} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Password</label>
            <input type="password" value={cfg.password} onChange={(e) => up({ password: e.target.value })} />
          </div>
        </div>
        <div className="field row2">
          <input id="https" type="checkbox" checked={cfg.useHttps} onChange={(e) => up({ useHttps: e.target.checked })} />
          <label htmlFor="https" style={{ cursor: 'pointer' }}>
            Use HTTPS
          </label>
        </div>

        <div className="field">
          <label>Path mappings (local mount → daemon path)</label>
          {mappings.map((m, i) => (
            <div className="map-row" key={i}>
              <input
                placeholder="Z:\downloads"
                value={m.local}
                onChange={(e) => updateMapping(i, { local: e.target.value })}
              />
              <span className="arrow">→</span>
              <input
                placeholder="/mnt/downloads"
                value={m.remote}
                onChange={(e) => updateMapping(i, { remote: e.target.value })}
              />
              <button className="del" onClick={() => setMappings(mappings.filter((_, j) => j !== i))} title="Remove">
                ✕
              </button>
            </div>
          ))}
          <button className="add-map" onClick={() => setMappings([...mappings, { local: '', remote: '' }])}>
            + Add mapping
          </button>
        </div>

        <div className="err">{err}</div>
        <div className="actions">
          {onCancel && (
            <button onClick={onCancel} disabled={busy}>
              Cancel
            </button>
          )}
          <button className="primary" onClick={saveAndTest} disabled={busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}
