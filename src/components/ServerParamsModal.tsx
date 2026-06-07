import { useEffect, useState, type ReactNode } from 'react';

// Every mutable session-set field on a modern Transmission (4.x, rpc >= 17).
// Grouped the same way transgui's "Transmission options" dialog was, plus the
// fields transgui never exposed (download-dir, peer-limit-per-torrent,
// start-added-torrents, trash-original-torrent-files, default-trackers, and the
// torrent script hooks).
const FIELDS = [
  // Downloads
  'download-dir',
  'incomplete-dir-enabled',
  'incomplete-dir',
  'rename-partial-files',
  'cache-size-mb',
  'start-added-torrents',
  'trash-original-torrent-files',
  'seedRatioLimited',
  'seedRatioLimit',
  'idle-seeding-limit-enabled',
  'idle-seeding-limit',
  // Network
  'peer-port',
  'peer-port-random-on-start',
  'port-forwarding-enabled',
  'encryption',
  'peer-limit-global',
  'peer-limit-per-torrent',
  'pex-enabled',
  'dht-enabled',
  'lpd-enabled',
  'utp-enabled',
  'blocklist-enabled',
  'blocklist-url',
  'default-trackers',
  // Bandwidth
  'speed-limit-down-enabled',
  'speed-limit-down',
  'speed-limit-up-enabled',
  'speed-limit-up',
  'alt-speed-down',
  'alt-speed-up',
  'alt-speed-enabled',
  'alt-speed-time-enabled',
  'alt-speed-time-begin',
  'alt-speed-time-end',
  'alt-speed-time-day',
  // Queue
  'download-queue-enabled',
  'download-queue-size',
  'seed-queue-enabled',
  'seed-queue-size',
  'queue-stalled-enabled',
  'queue-stalled-minutes',
  // Scripts
  'script-torrent-added-enabled',
  'script-torrent-added-filename',
  'script-torrent-done-enabled',
  'script-torrent-done-filename',
  'script-torrent-done-seeding-enabled',
  'script-torrent-done-seeding-filename',
];

// Fields that must be sent back as numbers (everything else is bool/string).
const NUMERIC = new Set([
  'cache-size-mb', 'idle-seeding-limit', 'peer-port', 'peer-limit-global', 'peer-limit-per-torrent',
  'speed-limit-down', 'speed-limit-up', 'alt-speed-down', 'alt-speed-up',
  'alt-speed-time-begin', 'alt-speed-time-end', 'alt-speed-time-day',
  'download-queue-size', 'seed-queue-size', 'queue-stalled-minutes', 'seedRatioLimit',
]);

type State = Record<string, unknown>;
type Tab = 'downloads' | 'network' | 'bandwidth' | 'queue' | 'scripts';

const TABS: Tab[] = ['downloads', 'network', 'bandwidth', 'queue', 'scripts'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // bit0 = Sunday

function minutesToHHMM(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

export function ServerParamsModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [tab, setTab] = useState<Tab>('downloads');
  const [s, setS] = useState<State>({});
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [portMsg, setPortMsg] = useState('');

  useEffect(() => {
    window.api.sessionGet(FIELDS).then((r) => {
      if (r.ok && r.arguments) setS(r.arguments as State);
      else setErr(r.result || 'could not load server settings');
      setLoaded(true);
    });
  }, []);

  const set = (k: string, v: unknown) => setS((p) => ({ ...p, [k]: v }));
  const bool = (k: string) => !!s[k];
  const numv = (k: string) => (s[k] === undefined || s[k] === null ? '' : (s[k] as number));
  const strv = (k: string) => (s[k] === undefined || s[k] === null ? '' : (s[k] as string));
  const has = (k: string) => s[k] !== undefined; // server actually exposes this field

  async function save() {
    setBusy(true);
    setErr('');
    const args: State = {};
    for (const k of FIELDS) {
      if (s[k] === undefined) continue;
      args[k] = NUMERIC.has(k) ? Number(s[k]) || 0 : s[k];
    }
    const r = await window.api.sessionSet(args);
    setBusy(false);
    if (!r.ok) {
      setErr(r.result || 'failed to save');
      return;
    }
    onSaved();
    onClose();
  }

  async function browse(k: string) {
    const r = await window.api.pickFolder();
    if (r) set(k, r.remote); // the daemon-side path
  }

  async function testPort() {
    setPortMsg('Testing…');
    const r = await window.api.portTest();
    if (r.ok && r.arguments) {
      setPortMsg((r.arguments as { 'port-is-open': boolean })['port-is-open'] ? 'Port is open ✓' : 'Port is closed ✗');
    } else {
      setPortMsg(r.result || 'test failed');
    }
  }

  // --- field builders (plain functions, NOT components, so inputs keep focus) ---
  const check = (k: string, label: string): ReactNode => (
    <label className="cfg-check" key={k}>
      <input type="checkbox" checked={bool(k)} onChange={(e) => set(k, e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  // number, optionally gated by an enable checkbox
  const numField = (k: string, label: string, unit?: string, gate?: string): ReactNode => {
    const disabled = gate ? !bool(gate) : false;
    return (
      <div className="cfg-row" key={k}>
        {gate ? (
          <label className="cfg-gate">
            <input type="checkbox" checked={bool(gate)} onChange={(e) => set(gate, e.target.checked)} />
            <span>{label}</span>
          </label>
        ) : (
          <span className="cfg-name">{label}</span>
        )}
        <input
          className="cfg-num"
          type="number"
          value={numv(k)}
          disabled={disabled}
          onChange={(e) => set(k, e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unit && <span className="cfg-unit">{unit}</span>}
      </div>
    );
  };

  const textField = (k: string, label: string, opts?: { browse?: boolean; placeholder?: string; gate?: string }): ReactNode => {
    const disabled = opts?.gate ? !bool(opts.gate) : false;
    return (
      <div className="field" key={k}>
        <label>{label}</label>
        <div className="cfg-text-row">
          <input value={strv(k)} placeholder={opts?.placeholder} disabled={disabled} onChange={(e) => set(k, e.target.value)} />
          {opts?.browse && (
            <button className="browse-btn" type="button" disabled={disabled} onClick={() => browse(k)}>
              Browse…
            </button>
          )}
        </div>
      </div>
    );
  };

  function body(): ReactNode {
    if (!loaded) return <div className="cfg-loading">Loading…</div>;
    switch (tab) {
      case 'downloads':
        return (
          <>
            {textField('download-dir', 'Default download folder (on the server)', { browse: true })}
            <div className="cfg-sub">
              {check('incomplete-dir-enabled', 'Keep incomplete files in a separate folder')}
              {textField('incomplete-dir', '', { browse: true, gate: 'incomplete-dir-enabled' })}
            </div>
            {check('rename-partial-files', 'Append “.part” to incomplete files')}
            {check('start-added-torrents', 'Start torrents as soon as they are added')}
            {check('trash-original-torrent-files', 'Move the .torrent file to trash after adding')}
            {numField('cache-size-mb', 'Disk cache size', 'MB')}
            {numField('seedRatioLimit', 'Stop seeding at ratio', undefined, 'seedRatioLimited')}
            {numField('idle-seeding-limit', 'Stop seeding when idle for', 'min', 'idle-seeding-limit-enabled')}
          </>
        );
      case 'network':
        return (
          <>
            {numField('peer-port', 'Incoming peer port')}
            {check('peer-port-random-on-start', 'Pick a random port on start')}
            <div className="cfg-row">
              <button className="browse-btn port-test" type="button" onClick={testPort}>
                Test port
              </button>
              {portMsg && <span className="cfg-portmsg">{portMsg}</span>}
            </div>
            {check('port-forwarding-enabled', 'Enable port forwarding (UPnP / NAT-PMP)')}
            <div className="cfg-row">
              <span className="cfg-name">Encryption</span>
              <select value={strv('encryption') || 'preferred'} onChange={(e) => set('encryption', e.target.value)}>
                <option value="tolerated">Allow</option>
                <option value="preferred">Prefer</option>
                <option value="required">Require</option>
              </select>
            </div>
            {numField('peer-limit-global', 'Global peer limit')}
            {numField('peer-limit-per-torrent', 'Per-torrent peer limit')}
            {check('pex-enabled', 'Peer Exchange (PEX)')}
            {check('dht-enabled', 'Distributed Hash Table (DHT)')}
            {check('lpd-enabled', 'Local Peer Discovery (LPD)')}
            {has('utp-enabled') && check('utp-enabled', 'µTP (uTP)')}
            {check('blocklist-enabled', 'Enable blocklist')}
            {has('blocklist-url') && textField('blocklist-url', 'Blocklist URL', { placeholder: 'https://…' })}
            {has('default-trackers') && (
              <div className="field">
                <label>Default trackers (added to every public torrent, one per line)</label>
                <textarea
                  className="cfg-area"
                  value={strv('default-trackers')}
                  onChange={(e) => set('default-trackers', e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </>
        );
      case 'bandwidth':
        return (
          <>
            <div className="cfg-group">Global limits</div>
            {numField('speed-limit-down', 'Maximum download speed', 'KB/s', 'speed-limit-down-enabled')}
            {numField('speed-limit-up', 'Maximum upload speed', 'KB/s', 'speed-limit-up-enabled')}

            <div className="cfg-group">Alternate (turtle) limits</div>
            {numField('alt-speed-down', 'Alternate download speed', 'KB/s')}
            {numField('alt-speed-up', 'Alternate upload speed', 'KB/s')}
            {check('alt-speed-enabled', 'Use alternate limits now')}
            {check('alt-speed-time-enabled', 'Use alternate limits on a schedule')}
            <div className="cfg-row">
              <span className="cfg-name">From</span>
              <input
                className="cfg-time"
                type="time"
                value={minutesToHHMM(Number(s['alt-speed-time-begin'] ?? 0))}
                disabled={!bool('alt-speed-time-enabled')}
                onChange={(e) => set('alt-speed-time-begin', hhmmToMinutes(e.target.value))}
              />
              <span className="cfg-name">to</span>
              <input
                className="cfg-time"
                type="time"
                value={minutesToHHMM(Number(s['alt-speed-time-end'] ?? 0))}
                disabled={!bool('alt-speed-time-enabled')}
                onChange={(e) => set('alt-speed-time-end', hhmmToMinutes(e.target.value))}
              />
            </div>
            <div className="cfg-days">
              {DAYS.map((d, i) => {
                const mask = Number(s['alt-speed-time-day'] ?? 0);
                const on = (mask & (1 << i)) !== 0;
                return (
                  <label key={d} className={`cfg-day ${on ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!bool('alt-speed-time-enabled')}
                      onChange={(e) => set('alt-speed-time-day', e.target.checked ? mask | (1 << i) : mask & ~(1 << i))}
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          </>
        );
      case 'queue':
        return (
          <>
            {numField('download-queue-size', 'Download queue size', undefined, 'download-queue-enabled')}
            {numField('seed-queue-size', 'Seed queue size', undefined, 'seed-queue-enabled')}
            {numField('queue-stalled-minutes', 'Treat as stalled when idle for', 'min', 'queue-stalled-enabled')}
          </>
        );
      case 'scripts':
        return (
          <>
            <div className="cfg-note">Scripts run on the server; paths are on the daemon's filesystem.</div>
            {check('script-torrent-added-enabled', 'Run a script when a torrent is added')}
            {has('script-torrent-added-filename') &&
              textField('script-torrent-added-filename', 'Added script', { placeholder: '/path/on/server/added.sh' })}
            {check('script-torrent-done-enabled', 'Run a script when a torrent finishes downloading')}
            {textField('script-torrent-done-filename', 'Done script', { placeholder: '/path/on/server/done.sh' })}
            {has('script-torrent-done-seeding-enabled') && (
              <>
                {check('script-torrent-done-seeding-enabled', 'Run a script when a torrent finishes seeding')}
                {textField('script-torrent-done-seeding-filename', 'Done-seeding script', {
                  placeholder: '/path/on/server/done-seeding.sh',
                })}
              </>
            )}
          </>
        );
    }
  }

  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal server" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Server Parameters</h2>

        <div className="tabs">
          {TABS.map((t) => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </div>
          ))}
        </div>

        <div className="tab-content server-body">{body()}</div>

        {err && <div className="err">{err}</div>}
        <div className="actions">
          <button onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={save} disabled={busy || !loaded}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
