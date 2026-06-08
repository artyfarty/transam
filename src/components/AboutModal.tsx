import logoRaw from '../../icons/logo.svg?raw';

export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-back" onMouseDown={onClose}>
      <div className="modal about" onMouseDown={(e) => e.stopPropagation()}>
        <div className="about-logo" dangerouslySetInnerHTML={{ __html: logoRaw }} />
        <h2>Transam</h2>
        <div className="about-ver">v{__APP_VERSION__}</div>
        <p>A fast, dark, modern desktop remote for Transmission 4.x.</p>
        <div className="about-license">Licensed under the GNU GPL v3.0 (or later).</div>
        <div className="actions">
          <button className="primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
