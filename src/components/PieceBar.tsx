import { useEffect, useRef } from 'react';

interface Props {
  pieces: string; // base64 bitfield
  pieceCount: number;
  height?: number;
}

// Renders the per-piece availability map (like the classic transgui piece bar)
// onto a canvas, blending fill density per pixel column.
export function PieceBar({ pieces, pieceCount, height = 16 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const draw = () => {
      const W = Math.max(1, Math.floor(wrap.clientWidth));
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);

      const css = getComputedStyle(document.documentElement);
      const bg = css.getPropertyValue('--bar-bg').trim() || '#2a2e36';
      const fill = css.getPropertyValue('--bar-fill').trim() || '#3f7fbf';
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, height);

      if (!pieces || pieceCount <= 0) return;
      let bytes: string;
      try {
        bytes = atob(pieces);
      } catch {
        return;
      }
      const bit = (i: number) => (bytes.charCodeAt(i >> 3) >> (7 - (i & 7))) & 1;

      ctx.fillStyle = fill;
      for (let x = 0; x < W; x++) {
        const p0 = Math.floor((x / W) * pieceCount);
        const p1 = Math.max(p0 + 1, Math.floor(((x + 1) / W) * pieceCount));
        let have = 0;
        let total = 0;
        for (let p = p0; p < p1 && p < pieceCount; p++) {
          total++;
          if (bit(p)) have++;
        }
        if (have === 0) continue;
        ctx.globalAlpha = total ? have / total : 0;
        ctx.fillRect(x, 0, 1, height);
      }
      ctx.globalAlpha = 1;
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [pieces, pieceCount, height]);

  return (
    <div className="piecebar" ref={wrapRef}>
      <canvas ref={ref} />
    </div>
  );
}
