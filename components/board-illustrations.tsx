'use client';

/**
 * Detailed inline-SVG illustrations of the NI instruments (PXIe, CompactRIO,
 * CompactDAQ). Each renders into a landscape box (x, y, w, h) inside the wiring
 * canvas SVG, drawn as the "host instrument" beneath the Nexys shield pin
 * header. Recognizable engineering illustrations — not photographs.
 */

const MONO = "'IBM Plex Mono', monospace";

interface BoardProps { x: number; y: number; w: number; h: number; }

// ============================================================
//  NI PXIe — chassis with controller + peripheral module slots
// ============================================================
const NI_GREEN = '#4fb878';
export function NiPxieBoard({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id="ni-chassis" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33393f" />
          <stop offset="100%" stopColor="#23282d" />
        </linearGradient>
      </defs>
      <g transform={`scale(${gx},${gy})`}>
        <rect x="0" y="0" width="150" height="100" rx="4" fill="url(#ni-chassis)" stroke="#11161a" strokeWidth="1" />
        {/* top + bottom rails (rack ears) */}
        <rect x="0" y="0" width="150" height="8" fill="#1a1f24" />
        <rect x="0" y="92" width="150" height="8" fill="#1a1f24" />
        {[6, 144].map((hx) => [4, 96].map((hy, j) => (
          <circle key={`${hx}-${j}`} cx={hx} cy={hy} r="1.6" fill="#0c1014" />
        )))}
        {/* fan grille left */}
        <rect x="5" y="14" width="10" height="72" rx="1" fill="#1a1f24" stroke="#11161a" strokeWidth="0.5" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1="6" y1={18 + i * 8} x2="14" y2={18 + i * 8} stroke="#2e353b" strokeWidth="1" />
        ))}
        {/* controller slot (wider, NI green face) */}
        <rect x="18" y="13" width="20" height="74" rx="1.5" fill="#1d2429" stroke={NI_GREEN} strokeWidth="0.8" />
        <rect x="20" y="16" width="16" height="10" rx="1" fill={NI_GREEN} opacity="0.85" />
        <text x="28" y="84" textAnchor="middle" fill={NI_GREEN} fontSize="4" fontFamily={MONO}>CTRL</text>
        {/* peripheral module slots */}
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i}>
            <rect x={42 + i * 17} y="13" width="14" height="74" rx="1.5" fill="#262c31" stroke="#3a4148" strokeWidth="0.6" />
            <rect x={44 + i * 17} y="16" width="10" height="6" rx="0.5" fill="#0e1216" />
            {/* connector strip */}
            <rect x={44 + i * 17} y="74" width="10" height="9" rx="0.5" fill="#0e1216" />
            {Array.from({ length: 3 }).map((__, k) => (
              <line key={k} x1={45 + i * 17} y1={76 + k * 2.5} x2={53 + i * 17} y2={76 + k * 2.5} stroke="#d4af37" strokeWidth="0.5" />
            ))}
          </g>
        ))}
        {/* power LED */}
        <circle cx="10" cy="11" r="1.6" fill={NI_GREEN} />
        <text x="118" y="98" textAnchor="middle" fill="#9fb8a8" fontSize="6" fontFamily={MONO} fontWeight="700">NI · PXIe</text>
      </g>
    </g>
  );
}

// ============================================================
//  NI CompactRIO — rugged controller + C-Series modules
// ============================================================
export function NiCrioBoard({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100;
  return (
    <g transform={`translate(${x},${y})`}>
      <g transform={`scale(${gx},${gy})`}>
        <rect x="0" y="0" width="150" height="100" rx="4" fill="url(#ni-chassis)" stroke="#11161a" strokeWidth="1" />
        {/* controller block (left) */}
        <rect x="6" y="14" width="44" height="72" rx="2" fill="#1d2429" stroke={NI_GREEN} strokeWidth="0.8" />
        {/* status LEDs */}
        {['POWER', 'STATUS', 'USER', 'FPGA'].map((lbl, i) => (
          <g key={lbl}>
            <circle cx="12" cy={22 + i * 11} r="2" fill={i === 0 ? NI_GREEN : i === 3 ? '#e0b020' : '#3a4148'} />
            <text x="17" y={24 + i * 11} fill="#8a9aa0" fontSize="3.5" fontFamily={MONO}>{lbl}</text>
          </g>
        ))}
        {/* ethernet ports */}
        <rect x="10" y="72" width="14" height="10" rx="1" fill="#0e1216" stroke="#3a4148" strokeWidth="0.5" />
        <rect x="28" y="72" width="14" height="10" rx="1" fill="#0e1216" stroke="#3a4148" strokeWidth="0.5" />
        {/* C-Series module bays (right) */}
        {Array.from({ length: 4 }).map((_, i) => (
          <g key={i}>
            <rect x={56 + i * 22} y="14" width="19" height="72" rx="1.5" fill="#2a3137" stroke="#3a4148" strokeWidth="0.6" />
            {/* module face: screw terminals */}
            <rect x={58 + i * 22} y="18" width="15" height="40" rx="1" fill="#0e1216" />
            {Array.from({ length: 6 }).map((__, k) => (
              <circle key={k} cx={61 + i * 22 + (k % 2) * 9} cy={24 + Math.floor(k / 2) * 11} r="2" fill="#1a1f24" stroke="#d4af37" strokeWidth="0.5" />
            ))}
            <text x={65.5 + i * 22} y="82" textAnchor="middle" fill={NI_GREEN} fontSize="4" fontFamily={MONO}>91{i}x</text>
          </g>
        ))}
        <text x="28" y="96" textAnchor="middle" fill="#9fb8a8" fontSize="5.5" fontFamily={MONO} fontWeight="700">NI cRIO</text>
      </g>
    </g>
  );
}

// ============================================================
//  NI CompactDAQ — chassis with C-Series module slots
// ============================================================
export function NiCdaqBoard({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100;
  return (
    <g transform={`translate(${x},${y})`}>
      <g transform={`scale(${gx},${gy})`}>
        <rect x="0" y="0" width="150" height="100" rx="4" fill="url(#ni-chassis)" stroke="#11161a" strokeWidth="1" />
        {/* base strip with USB/ENET + power */}
        <rect x="6" y="80" width="138" height="14" rx="1.5" fill="#1d2429" stroke="#3a4148" strokeWidth="0.5" />
        <rect x="10" y="83" width="14" height="8" rx="1" fill="#0e1216" />
        <text x="17" y="89.5" textAnchor="middle" fill="#8a9aa0" fontSize="3" fontFamily={MONO}>USB</text>
        <rect x="28" y="83" width="14" height="8" rx="1" fill="#e0b020" opacity="0.5" />
        <text x="35" y="89.5" textAnchor="middle" fill="#5a4810" fontSize="3" fontFamily={MONO}>ENET</text>
        <circle cx="138" cy="87" r="2" fill={NI_GREEN} />
        {/* 6 module slots */}
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i}>
            <rect x={8 + i * 23} y="8" width="20" height="68" rx="1.5" fill="#2a3137" stroke="#3a4148" strokeWidth="0.6" />
            <rect x={10 + i * 23} y="12" width="16" height="34" rx="1" fill="#0e1216" />
            {/* spring/screw terminals */}
            {Array.from({ length: 8 }).map((__, k) => (
              <rect key={k} x={11.5 + i * 23 + (k % 2) * 8} y={16 + Math.floor(k / 2) * 7} width="5" height="3" rx="0.5" fill="#1a1f24" stroke="#d4af37" strokeWidth="0.4" />
            ))}
            <rect x={11 + i * 23} y="50" width="14" height="3" rx="0.5" fill={NI_GREEN} opacity="0.7" />
            <text x={18 + i * 23} y="72" textAnchor="middle" fill="#9fb8a8" fontSize="3.5" fontFamily={MONO}>NI-9{i}1{i}</text>
          </g>
        ))}
        <text x="120" y="99" textAnchor="middle" fill="#9fb8a8" fontSize="5.5" fontFamily={MONO} fontWeight="700">NI cDAQ</text>
      </g>
    </g>
  );
}

export function HostBoardIllustration({ targetId, x, y, w, h }: BoardProps & { targetId: string }) {
  if (targetId === 'ni_crio') return <NiCrioBoard x={x} y={y} w={w} h={h} />;
  if (targetId === 'ni_cdaq') return <NiCdaqBoard x={x} y={y} w={w} h={h} />;
  return <NiPxieBoard x={x} y={y} w={w} h={h} />;
}
