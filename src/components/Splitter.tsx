interface Props {
  orientation: 'v' | 'h'; // 'v' = vertical bar (resizes width), 'h' = horizontal bar (resizes height)
  onDrag: (deltaPx: number) => void;
}

export function Splitter({ orientation, onDrag }: Props) {
  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    let last = orientation === 'v' ? e.clientX : e.clientY;
    const move = (ev: MouseEvent) => {
      const cur = orientation === 'v' ? ev.clientX : ev.clientY;
      onDrag(cur - last);
      last = cur;
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    document.body.style.cursor = orientation === 'v' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }
  return <div className={`splitter ${orientation}`} onMouseDown={onMouseDown} />;
}
