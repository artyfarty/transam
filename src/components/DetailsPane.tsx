import type { Torrent } from '../../shared/types';
import { humanSize, speed, percent, ratio, eta, statusText } from '../format';

export function DetailsPane({ torrent }: { torrent: Torrent | null }) {
  if (!torrent) {
    return (
      <div className="details">
        <div className="empty">No torrent selected</div>
      </div>
    );
  }
  const t = torrent;
  const added = t.addedDate ? new Date(t.addedDate * 1000).toLocaleString() : '—';
  return (
    <div className="details">
      <h3>{t.name}</h3>
      <div className="grid">
        <span className="k">Status</span>
        <span>{statusText(t)}</span>
        <span className="k">Size</span>
        <span>{humanSize(t.totalSize)}</span>

        <span className="k">Progress</span>
        <span>{percent(t.percentDone)}</span>
        <span className="k">Remaining</span>
        <span>{humanSize(t.leftUntilDone)}</span>

        <span className="k">Download</span>
        <span>{speed(t.rateDownload) || '—'}</span>
        <span className="k">Upload</span>
        <span>{speed(t.rateUpload) || '—'}</span>

        <span className="k">Downloaded</span>
        <span>{humanSize(t.downloadedEver)}</span>
        <span className="k">Uploaded</span>
        <span>{humanSize(t.uploadedEver)}</span>

        <span className="k">Ratio</span>
        <span>{ratio(t.uploadRatio)}</span>
        <span className="k">ETA</span>
        <span>{eta(t.eta) || '—'}</span>

        <span className="k">Peers</span>
        <span>
          {t.peersSendingToUs} seeds / {t.peersGettingFromUs} peers ({t.peersConnected} connected)
        </span>
        <span className="k">Added</span>
        <span>{added}</span>

        <span className="k">Location</span>
        <span style={{ gridColumn: 'span 3', userSelect: 'text' }}>{t.downloadDir}</span>

        {t.error ? (
          <>
            <span className="k">Error</span>
            <span style={{ gridColumn: 'span 3', color: 'var(--error)', userSelect: 'text' }}>{t.errorString}</span>
          </>
        ) : null}
      </div>
    </div>
  );
}
