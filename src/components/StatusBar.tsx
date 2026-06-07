import { useEffect, useState } from 'react';
import { speed as fmtSpeed } from '../format';
import type { SpeedLimits } from '../../shared/types';

interface Props {
  connected: boolean;
  serverVersion?: string;
  count: number;
  downSpeed: number;
  upSpeed: number;
  limits: SpeedLimits | null;
  onSetLimit: (dir: 'down' | 'up', enabled: boolean, kbps: number) => void;
}

export function StatusBar(p: Props) {
  return (
    <div className="statusbar">
      <span className={`dot ${p.connected ? 'on' : ''}`} />
      <span>{p.connected ? `Transmission ${p.serverVersion ?? ''}`.trim() : 'Disconnected'}</span>
      <span style={{ flex: 1 }} />
      <span>{p.count} torrents</span>
      <SpeedControl
        dir="down"
        bytesPerSec={p.downSpeed}
        enabled={p.limits?.downEnabled ?? false}
        kbps={p.limits?.downKbps ?? 0}
        onApply={(en, kb) => p.onSetLimit('down', en, kb)}
      />
      <SpeedControl
        dir="up"
        bytesPerSec={p.upSpeed}
        enabled={p.limits?.upEnabled ?? false}
        kbps={p.limits?.upKbps ?? 0}
        onApply={(en, kb) => p.onSetLimit('up', en, kb)}
      />
    </div>
  );
}

function SpeedControl({
  dir,
  bytesPerSec,
  enabled,
  kbps,
  onApply,
}: {
  dir: 'down' | 'up';
  bytesPerSec: number;
  enabled: boolean;
  kbps: number;
  onApply: (enabled: boolean, kbps: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [en, setEn] = useState(enabled);
  const [val, setVal] = useState(String(kbps));

  // keep local form in sync with server while the popover is closed
  useEffect(() => {
    if (!open) {
      setEn(enabled);
      setVal(String(kbps));
    }
  }, [enabled, kbps, open]);

  const arrow = dir === 'down' ? '▼' : '▲';

  function apply() {
    const n = Math.max(0, parseInt(val, 10) || 0);
    onApply(en, n);
    setOpen(false);
  }

  return (
    <div className="speed-ctl">
      <span className="speed-trigger" onClick={() => setOpen((o) => !o)} title={`${dir} speed — click to set a limit`}>
        {arrow} {fmtSpeed(bytesPerSec) || '0 B/s'}
        {enabled && <span className="limit-badge">≤ {kbps} KB/s</span>}
      </span>
      {open && (
        <>
          <div className="popover-back" onMouseDown={() => setOpen(false)} />
          <div className="popover" onMouseDown={(e) => e.stopPropagation()}>
            <label className="pop-row">
              <input type="checkbox" checked={en} onChange={(e) => setEn(e.target.checked)} />
              <span>Limit {dir === 'down' ? 'download' : 'upload'}</span>
            </label>
            <div className="pop-row">
              <input
                className="kb"
                type="number"
                min={0}
                value={val}
                disabled={!en}
                onChange={(e) => setVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && apply()}
              />
              <span>KB/s</span>
            </div>
            <div className="pop-actions">
              <button className="primary" onClick={apply}>
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
