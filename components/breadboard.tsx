'use client';

/**
 * Classic solderless breadboard illustration (half+ size) for the wiring
 * canvas "Breadboard mode". Rendered as a prototyping surface beneath the
 * devices. v1 is a faithful visual (power rails + a–e / f–j tie-point banks +
 * center trench); functional hole-level jumper routing is a future iteration.
 */

const MONO = "'IBM Plex Mono', monospace";

interface BreadboardProps { x: number; y: number; w: number; h: number; cols?: number; }

export function Breadboard({ x, y, w, h, cols = 30 }: BreadboardProps) {
  const gx = w / 380;
  const gy = h / 130;
  const holeStep = 360 / cols;
  const holes = (rowY: number, color = '#9aa0aa') =>
    Array.from({ length: cols }).map((_, c) => (
      <circle key={c} cx={10 + c * holeStep + holeStep / 2} cy={rowY} r="1.5" fill="#1a1d22" stroke={color} strokeWidth="0.4" />
    ));

  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id="bb-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5f3ec" />
          <stop offset="100%" stopColor="#e6e3d8" />
        </linearGradient>
      </defs>
      <g transform={`scale(${gx},${gy})`}>
        {/* body */}
        <rect x="0" y="0" width="380" height="130" rx="5" fill="url(#bb-body)" stroke="#c8c4b6" strokeWidth="1" />

        {/* ── top power rails ── */}
        <line x1="8" y1="10" x2="372" y2="10" stroke="#d9433a" strokeWidth="0.8" />
        <line x1="8" y1="26" x2="372" y2="26" stroke="#2d6fd0" strokeWidth="0.8" />
        <text x="4" y="12" fill="#d9433a" fontSize="7" fontFamily={MONO} fontWeight="700">+</text>
        <text x="4" y="28" fill="#2d6fd0" fontSize="7" fontFamily={MONO} fontWeight="700">−</text>
        {holes(16, '#d9433a')}
        {holes(22, '#2d6fd0')}

        {/* column numbers */}
        {Array.from({ length: cols }).map((_, c) =>
          c % 5 === 4 ? (
            <text key={c} x={10 + c * holeStep + holeStep / 2} y="38" textAnchor="middle"
                  fill="#a8a496" fontSize="4.5" fontFamily={MONO}>{c + 1}</text>
          ) : null
        )}

        {/* ── upper bank a–e ── */}
        {['a', 'b', 'c', 'd', 'e'].map((row, r) => (
          <g key={row}>
            <text x="3" y={45 + r * 8 + 2} fill="#a8a496" fontSize="4.5" fontFamily={MONO}>{row}</text>
            {holes(45 + r * 8)}
          </g>
        ))}

        {/* center trench */}
        <rect x="6" y="86" width="368" height="6" fill="#d6d2c4" />
        <line x1="6" y1="89" x2="374" y2="89" stroke="#b8b4a6" strokeWidth="0.5" strokeDasharray="2,2" />

        {/* ── lower bank f–j ── */}
        {['f', 'g', 'h', 'i', 'j'].map((row, r) => (
          <g key={row}>
            <text x="3" y={97 + r * 6.5 + 2} fill="#a8a496" fontSize="4.5" fontFamily={MONO}>{row}</text>
            {holes(97 + r * 6.5)}
          </g>
        ))}

        {/* label */}
        <text x="376" y="128" textAnchor="end" fill="#b0ac9e" fontSize="5" fontFamily={MONO}>
          nexys breadboard · 30-col
        </text>
      </g>
    </g>
  );
}
