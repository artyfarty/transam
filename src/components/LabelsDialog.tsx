import { useState } from 'react';

interface Props {
  initial: string;
  count: number;
  onApply: (labels: string[]) => Promise<void> | void;
  onCancel: () => void;
}

export function LabelsDialog({ initial, count, onApply, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function apply() {
    const labels = [...new Set(text.split(',').map((s) => s.trim()).filter(Boolean))];
    setBusy(true);
    await onApply(labels);
  }

  return (
    <div className="modal-back" onMouseDown={onCancel}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Edit labels</h2>
        <div className="field">
          <label>Labels for {count} torrent(s) — comma separated</label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="anime, 4k, keep"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && apply()}
          />
        </div>
        <div className="actions">
          <button onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className="primary" onClick={apply} disabled={busy}>
            {busy ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
