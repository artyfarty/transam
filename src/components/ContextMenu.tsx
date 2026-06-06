export interface MenuItem {
  label?: string;
  onClick?: () => void;
  danger?: boolean;
  separator?: boolean;
  disabled?: boolean;
}

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  return (
    <div className="ctx-back" onMouseDown={onClose} onContextMenu={(e) => e.preventDefault()}>
      <div
        className="ctx"
        style={{ left: x, top: y }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {items.map((it, i) =>
          it.separator ? (
            <div key={i} className="ctx-sep" />
          ) : (
            <div
              key={i}
              className={`ctx-item ${it.danger ? 'danger' : ''} ${it.disabled ? 'disabled' : ''}`}
              onClick={() => {
                if (it.disabled) return;
                it.onClick?.();
                onClose();
              }}
            >
              {it.label}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
