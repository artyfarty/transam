import { speed } from '../format';

interface Props {
  connected: boolean;
  serverVersion?: string;
  count: number;
  downSpeed: number;
  upSpeed: number;
}

export function StatusBar(p: Props) {
  return (
    <div className="statusbar">
      <span className={`dot ${p.connected ? 'on' : ''}`} />
      <span>{p.connected ? `Transmission ${p.serverVersion ?? ''}`.trim() : 'Disconnected'}</span>
      <span className="spacer" style={{ flex: 1 }} />
      <span>{p.count} torrents</span>
      <span>▼ {speed(p.downSpeed) || '0 B/s'}</span>
      <span>▲ {speed(p.upSpeed) || '0 B/s'}</span>
    </div>
  );
}
