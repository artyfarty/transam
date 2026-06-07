import type { Torrent } from '../../shared/types';
import { TorrentStatus } from '../../shared/types';

interface SvgProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const IconPlus = ({ size = 14 }: SvgProps) => (
  <svg {...base(size)}>
    <path d="M8 3v10M3 8h10" />
  </svg>
);
export const IconPlay = ({ size = 14 }: SvgProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <path d="M5 3.5v9l7-4.5z" />
  </svg>
);
export const IconPause = ({ size = 14 }: SvgProps) => (
  <svg {...base(size)} fill="currentColor" stroke="none">
    <rect x="4.5" y="3.5" width="2.4" height="9" rx="0.5" />
    <rect x="9.1" y="3.5" width="2.4" height="9" rx="0.5" />
  </svg>
);
export const IconTrash = ({ size = 14 }: SvgProps) => (
  <svg {...base(size)}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8h5.8l.6-8" />
  </svg>
);
export const IconGear = ({ size = 14 }: SvgProps) => (
  <svg {...base(size)}>
    <circle cx="8" cy="8" r="2.2" />
    <path d="M8 1.6v1.6M8 12.8v1.6M14.4 8h-1.6M3.2 8H1.6M12.5 3.5l-1.1 1.1M4.6 11.4l-1.1 1.1M12.5 12.5l-1.1-1.1M4.6 4.6 3.5 3.5" />
  </svg>
);
export const IconSearch = ({ size = 13 }: SvgProps) => (
  <svg {...base(size)}>
    <circle cx="6.8" cy="6.8" r="4" />
    <path d="M10 10l3 3" />
  </svg>
);
export const IconSidebar = ({ size = 14 }: SvgProps) => (
  <svg {...base(size)}>
    <rect x="2" y="3" width="12" height="10" rx="1" />
    <path d="M6 3v10" />
  </svg>
);

// --- per-torrent status glyph + color --------------------------------------
function StatusGlyph({ status, error }: { status: TorrentStatus; error: number }) {
  if (error) {
    return (
      <svg {...base(13)} style={{ color: 'var(--st-error)' }}>
        <path d="M8 2.5 14.5 13.5H1.5z" />
        <path d="M8 6.5v3M8 11.4v.1" />
      </svg>
    );
  }
  switch (status) {
    case TorrentStatus.Download:
      return (
        <svg {...base(13)} style={{ color: 'var(--st-down)' }} fill="currentColor" stroke="none">
          <path d="M8 2.5v6.4M5 6l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 12.5h9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case TorrentStatus.Seed:
      return (
        <svg {...base(13)} style={{ color: 'var(--st-seed)' }} fill="none">
          <path d="M8 13.5V7.1M5 9.5l3-3 3 3" strokeWidth="1.8" />
          <path d="M3.5 3.5h9" strokeWidth="1.8" />
        </svg>
      );
    case TorrentStatus.Stopped:
      return (
        <svg {...base(13)} style={{ color: 'var(--st-paused)' }} fill="currentColor" stroke="none">
          <rect x="4.5" y="3.5" width="2.3" height="9" rx="0.5" />
          <rect x="9.2" y="3.5" width="2.3" height="9" rx="0.5" />
        </svg>
      );
    case TorrentStatus.Check:
    case TorrentStatus.CheckWait:
      return (
        <svg {...base(13)} style={{ color: 'var(--st-check)' }}>
          <path d="M13 8a5 5 0 1 1-1.5-3.6" />
          <path d="M13 2.5V5h-2.5" />
        </svg>
      );
    default: // queued (DownloadWait / SeedWait)
      return (
        <svg {...base(13)} style={{ color: 'var(--st-queued)' }}>
          <circle cx="8" cy="8" r="5.2" />
          <path d="M8 5v3l2 1.4" />
        </svg>
      );
  }
}

export function StatusIcon({ t }: { t: Torrent }) {
  return (
    <span className="status-ico">
      <StatusGlyph status={t.status} error={t.error} />
    </span>
  );
}
