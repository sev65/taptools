"use client";

import { useEffect, useRef, useState } from "react";

export type Bar = { key: string; tick?: string; tip: string; value: number };

const H = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * pow >= v) return m * pow;
  return 10 * pow;
}

// Bar with a 4px rounded data-end and a square baseline.
function barPath(x: number, y: number, w: number, h: number) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export default function BarChart({ bars, unit = "taps", height = H }: { bars: Bar[]; unit?: string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  // Draw in real pixels so axis text stays readable on a phone.
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(700);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const plotW = W - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...bars.map((b) => b.value)));
  const slot = plotW / bars.length;
  const bw = Math.max(2, Math.min(24, slot - 2)); // 2px surface gap between bars
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const h = hover !== null ? bars[hover] : null;

  return (
    <div className="chart" ref={ref} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`Bar chart of ${unit}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--muted)">
              {t}
            </text>
          </g>
        ))}
        {bars.map((b, i) => {
          const x = PAD.left + i * slot + (slot - bw) / 2;
          const top = y(b.value);
          return (
            <g key={b.key}>
              <path
                d={barPath(x, top, bw, PAD.top + plotH - top)}
                fill="var(--series)"
                opacity={hover === null || hover === i ? 1 : 0.45}
              />
              {b.tick && (
                <text x={Math.min(x + bw / 2, W - PAD.right - 16)} y={height - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {b.tick}
                </text>
              )}
              {/* hit target: the full column, wider than the bar */}
              <rect
                x={PAD.left + i * slot}
                y={PAD.top}
                width={slot}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              />
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div
          className="tip"
          style={{
            left: `${((PAD.left + (hover + 0.5) * slot) / W) * 100}%`,
            top: `${(y(h.value) / height) * 100}%`,
          }}
        >
          {h.tip}: <b>{h.value}</b> {h.value === 1 ? unit.replace(/s$/, "") : unit}
        </div>
      )}
    </div>
  );
}
