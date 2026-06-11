'use client';

/**
 * Detailed inline-SVG board illustrations for targets Wokwi has no art for
 * (Raspberry Pi 4B, Jetson Orin Nano, STM32 Nucleo). Each renders into a
 * landscape box (x, y, w, h) inside the wiring canvas SVG, drawn as the
 * "host board" beneath the Nexys shield pin header.
 *
 * These are recognizable engineering illustrations (iconic features: RPi's
 * 40-pin GPIO header + port stack, Jetson's heatsink + SoM, STM32 Nucleo's
 * ST-LINK + Morpho headers) — not photographs.
 */

const MONO = "'IBM Plex Mono', monospace";

interface BoardProps { x: number; y: number; w: number; h: number; }

// ── helpers ──
function headerPins(x: number, y: number, cols: number, rows: number, gap: number, size = 2.4, fill = '#d4af37') {
  const pins = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      pins.push(
        <rect key={`${r}-${c}`} x={x + c * gap} y={y + r * gap} width={size} height={size} rx={0.4} fill={fill} />
      );
    }
  }
  return pins;
}

// ============================================================
//  Raspberry Pi 4B
// ============================================================
export function RpiBoard({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100; // scale from design space 150×100
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id="rpi-pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f7a44" />
          <stop offset="100%" stopColor="#16623a" />
        </linearGradient>
        <linearGradient id="rpi-soc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3a3f48" />
          <stop offset="50%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#2a2e36" />
        </linearGradient>
      </defs>
      <g transform={`scale(${gx},${gy})`}>
        {/* PCB */}
        <rect x="0" y="0" width="150" height="100" rx="6" fill="url(#rpi-pcb)" stroke="#0f4528" strokeWidth="1" />
        {/* mounting holes */}
        {[[8, 8], [142, 8], [8, 92], [142, 92]].map(([mx, my], i) => (
          <circle key={i} cx={mx} cy={my} r="3.2" fill="#0d3a22" stroke="#2a8a52" strokeWidth="0.8" />
        ))}
        {/* 40-pin GPIO header */}
        <rect x="9" y="3" width="132" height="13" rx="1.5" fill="#0f1115" />
        {headerPins(11, 5, 20, 2, 6.5, 2.6)}
        {/* SoC (BCM2711) with metal lid */}
        <rect x="54" y="40" width="36" height="36" rx="2" fill="url(#rpi-soc)" stroke="#1a1d22" strokeWidth="0.8" />
        <rect x="58" y="44" width="28" height="28" rx="1" fill="none" stroke="#9aa0aa" strokeWidth="0.5" opacity="0.6" />
        <text x="72" y="60" textAnchor="middle" fill="#cfd3da" fontSize="5" fontFamily={MONO}>BCM</text>
        <text x="72" y="66" textAnchor="middle" fill="#cfd3da" fontSize="5" fontFamily={MONO}>2711</text>
        {/* LPDDR4 RAM */}
        <rect x="96" y="44" width="20" height="15" rx="1" fill="#1a1d22" stroke="#3a3f48" strokeWidth="0.6" />
        <text x="106" y="53" textAnchor="middle" fill="#7a808a" fontSize="3.5" fontFamily={MONO}>RAM</text>
        {/* USB-A stack ×2 + Ethernet on right edge */}
        <rect x="132" y="34" width="16" height="13" rx="1" fill="#b8bcc4" stroke="#8a8e96" strokeWidth="0.5" />
        <rect x="132" y="50" width="16" height="13" rx="1" fill="#1166aa" stroke="#0d4d80" strokeWidth="0.5" />
        <rect x="132" y="66" width="16" height="15" rx="1" fill="#e0b020" stroke="#b08810" strokeWidth="0.5" />
        <text x="140" y="76" textAnchor="middle" fill="#5a4810" fontSize="4" fontFamily={MONO}>ETH</text>
        {/* USB-C power + micro-HDMI ×2 + audio on bottom edge */}
        <rect x="14" y="92" width="12" height="7" rx="2" fill="#2a2e36" stroke="#4a4f58" strokeWidth="0.5" />
        <text x="20" y="98" textAnchor="middle" fill="#7a808a" fontSize="3" fontFamily={MONO}>PWR</text>
        <rect x="34" y="93" width="10" height="6" rx="1" fill="#1a1d22" />
        <rect x="48" y="93" width="10" height="6" rx="1" fill="#1a1d22" />
        <text x="46" y="98.5" textAnchor="middle" fill="#7a808a" fontSize="3" fontFamily={MONO}>HDMI</text>
        {/* microSD on left underside hint */}
        <rect x="-2" y="44" width="6" height="14" rx="1" fill="#2a2e36" />
        {/* silk */}
        <text x="72" y="86" textAnchor="middle" fill="#bfe6cf" fontSize="6" fontFamily={MONO} fontWeight="700" letterSpacing="0.5">
          Raspberry Pi 4
        </text>
      </g>
    </g>
  );
}

// ============================================================
//  NVIDIA Jetson Orin Nano (carrier + SoM + heatsink)
// ============================================================
export function JetsonBoard({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id="jet-pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16201a" />
          <stop offset="100%" stopColor="#0e1612" />
        </linearGradient>
        <linearGradient id="jet-hs" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a5560" />
          <stop offset="100%" stopColor="#2a313a" />
        </linearGradient>
      </defs>
      <g transform={`scale(${gx},${gy})`}>
        <rect x="0" y="0" width="150" height="100" rx="6" fill="url(#jet-pcb)" stroke="#243029" strokeWidth="1" />
        {/* mounting holes */}
        {[[8, 8], [142, 8], [8, 92], [142, 92]].map(([mx, my], i) => (
          <circle key={i} cx={mx} cy={my} r="3" fill="#0a100c" stroke="#3a4a3e" strokeWidth="0.8" />
        ))}
        {/* SoM + heatsink (dominant, center) */}
        <rect x="38" y="22" width="74" height="56" rx="3" fill="url(#jet-hs)" stroke="#1a2026" strokeWidth="1" />
        {/* heatsink fins */}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={i} x1={43 + i * 6.4} y1="26" x2={43 + i * 6.4} y2="74"
                stroke="#1f262e" strokeWidth="2.2" />
        ))}
        {/* NVIDIA green strip */}
        <rect x="38" y="78" width="74" height="4" fill="#76b900" opacity="0.85" />
        {/* 40-pin header (top) */}
        <rect x="40" y="3" width="70" height="11" rx="1.5" fill="#0f1512" />
        {headerPins(40, 5, 20, 2, 3.5, 1.8, '#c8a430')}
        {/* ports right edge: USB stack + RJ45 */}
        <rect x="133" y="30" width="15" height="14" rx="1" fill="#b8bcc4" />
        <rect x="133" y="48" width="15" height="14" rx="1" fill="#e0b020" />
        <text x="140.5" y="58" textAnchor="middle" fill="#5a4810" fontSize="3.5" fontFamily={MONO}>ETH</text>
        {/* M.2 slot hint (bottom-left) */}
        <rect x="6" y="60" width="26" height="6" rx="1" fill="#243029" stroke="#3a4a3e" strokeWidth="0.5" />
        <text x="19" y="65" textAnchor="middle" fill="#5a6a5e" fontSize="3" fontFamily={MONO}>M.2</text>
        <text x="75" y="94" textAnchor="middle" fill="#9ed957" fontSize="6" fontFamily={MONO} fontWeight="700" letterSpacing="0.4">
          JETSON ORIN
        </text>
      </g>
    </g>
  );
}

// ============================================================
//  STM32 Nucleo-F4 (ST-LINK + Morpho/Arduino headers + MCU)
// ============================================================
export function Stm32Board({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id="stm-pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a4a6e" />
          <stop offset="100%" stopColor="#123a58" />
        </linearGradient>
      </defs>
      <g transform={`scale(${gx},${gy})`}>
        <rect x="0" y="0" width="150" height="100" rx="6" fill="url(#stm-pcb)" stroke="#0c2c44" strokeWidth="1" />
        {/* ST-LINK partition (top section) */}
        <line x1="6" y1="26" x2="144" y2="26" stroke="#2a6a98" strokeWidth="0.8" strokeDasharray="4,3" />
        <text x="10" y="11" fill="#9fd0ea" fontSize="5" fontFamily={MONO}>ST-LINK/V2-1</text>
        {/* mini-USB (top) */}
        <rect x="64" y="2" width="22" height="11" rx="1.5" fill="#c0c4cc" stroke="#9094a0" strokeWidth="0.5" />
        {/* ST-LINK MCU small */}
        <rect x="20" y="14" width="14" height="10" rx="1" fill="#0e1a24" stroke="#2a6a98" strokeWidth="0.5" />
        {/* Morpho headers — two columns down the sides */}
        <rect x="3" y="30" width="7" height="64" rx="1" fill="#0e1a24" />
        {headerPins(4.5, 32, 2, 18, 3.4, 1.8, '#1f1f1f')}
        <rect x="140" y="30" width="7" height="64" rx="1" fill="#0e1a24" />
        {headerPins(141.5, 32, 2, 18, 3.4, 1.8, '#1f1f1f')}
        {/* Arduino headers (inner, black female) */}
        <rect x="22" y="32" width="5" height="34" rx="1" fill="#111" />
        <rect x="123" y="32" width="5" height="34" rx="1" fill="#111" />
        {/* MCU LQFP (center) */}
        <rect x="58" y="42" width="34" height="34" rx="1.5" fill="#0c1620" stroke="#2a6a98" strokeWidth="0.8" />
        <circle cx="63" cy="47" r="1.6" fill="#3a8ac0" />
        {/* LQFP pin legs (4 sides) */}
        {Array.from({ length: 9 }).map((_, i) => (
          <g key={i}>
            <line x1="58" y1={45 + i * 3.6} x2="55" y2={45 + i * 3.6} stroke="#8a9aa6" strokeWidth="0.6" />
            <line x1="92" y1={45 + i * 3.6} x2="95" y2={45 + i * 3.6} stroke="#8a9aa6" strokeWidth="0.6" />
            <line x1={61 + i * 3.4} y1="42" x2={61 + i * 3.4} y2="39" stroke="#8a9aa6" strokeWidth="0.6" />
            <line x1={61 + i * 3.4} y1="76" x2={61 + i * 3.4} y2="79" stroke="#8a9aa6" strokeWidth="0.6" />
          </g>
        ))}
        <text x="75" y="62" textAnchor="middle" fill="#7fb8d8" fontSize="4.5" fontFamily={MONO}>STM32</text>
        {/* user LED + button */}
        <circle cx="40" cy="84" r="2.6" fill="#76b900" opacity="0.8" />
        <text x="46" y="86" fill="#9fd0ea" fontSize="3.5" fontFamily={MONO}>LD2</text>
        <rect x="104" y="80" width="9" height="9" rx="2" fill="#1f6ea8" stroke="#9fd0ea" strokeWidth="0.5" />
        <text x="108.5" y="95" textAnchor="middle" fill="#9fd0ea" fontSize="3.5" fontFamily={MONO}>B1</text>
        <text x="75" y="92" textAnchor="middle" fill="#bfe0f2" fontSize="5.5" fontFamily={MONO} fontWeight="700">
          NUCLEO-F4
        </text>
      </g>
    </g>
  );
}

// ============================================================
//  Arduino (UNO/Mega style) — blue PCB, USB-B, ATmega DIP, headers
// ============================================================
export function ArduinoBoard({ x, y, w, h }: BoardProps) {
  const gx = w / 150, gy = h / 100;
  return (
    <g transform={`translate(${x},${y})`}>
      <defs>
        <linearGradient id="ard-pcb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a7cb8" />
          <stop offset="100%" stopColor="#1c5a86" />
        </linearGradient>
      </defs>
      <g transform={`scale(${gx},${gy})`}>
        {/* PCB */}
        <rect x="0" y="0" width="150" height="100" rx="6" fill="url(#ard-pcb)" stroke="#0f3e5e" strokeWidth="1" />
        {/* mounting holes */}
        {[[8, 50], [142, 10], [142, 90], [40, 92]].map(([mx, my], i) => (
          <circle key={i} cx={mx} cy={my} r="2.6" fill="#103a56" stroke="#5aa0cc" strokeWidth="0.7" />
        ))}
        {/* USB-B (top-left, silver) */}
        <rect x="4" y="14" width="20" height="22" rx="1.5" fill="#c0c4cc" stroke="#9094a0" strokeWidth="0.6" />
        <rect x="6" y="17" width="16" height="16" rx="1" fill="#9aa0aa" />
        {/* barrel jack (bottom-left, black) */}
        <rect x="4" y="62" width="22" height="16" rx="3" fill="#0e1418" stroke="#3a4048" strokeWidth="0.6" />
        {/* top digital header */}
        <rect x="40" y="3" width="106" height="9" rx="1.5" fill="#0f1115" />
        {headerPins(43, 5, 18, 1, 5.6, 2.4, '#0f1115')}
        {Array.from({ length: 18 }).map((_, c) => (
          <circle key={c} cx={44.2 + c * 5.6} cy={7.4} r="1.3" fill="#2a2e36" stroke="#4a5058" strokeWidth="0.4" />
        ))}
        {/* bottom analog/power header */}
        <rect x="40" y="88" width="106" height="9" rx="1.5" fill="#0f1115" />
        {Array.from({ length: 18 }).map((_, c) => (
          <circle key={c} cx={44.2 + c * 5.6} cy={92.4} r="1.3" fill="#2a2e36" stroke="#4a5058" strokeWidth="0.4" />
        ))}
        {/* ATmega DIP IC (center) */}
        <rect x="58" y="38" width="46" height="24" rx="1" fill="#0e1216" stroke="#2a3038" strokeWidth="0.7" />
        <circle cx="63" cy="43" r="1.6" fill="none" stroke="#6a7078" strokeWidth="0.6" />
        {/* DIP pin legs */}
        {Array.from({ length: 14 }).map((_, i) => (
          <g key={i}>
            <rect x={60 + i * 3.1} y="35.5" width="1.4" height="2.5" fill="#aab0b8" />
            <rect x={60 + i * 3.1} y="62" width="1.4" height="2.5" fill="#aab0b8" />
          </g>
        ))}
        <text x="81" y="52" textAnchor="middle" fill="#8a9aa6" fontSize="4.5" fontFamily={MONO}>ATmega</text>
        {/* 16MHz crystal (silver oval) */}
        <rect x="44" y="44" width="10" height="14" rx="4" fill="#c8ccd4" stroke="#9094a0" strokeWidth="0.5" />
        {/* reset button (top-right red) */}
        <rect x="120" y="20" width="11" height="11" rx="2" fill="#c0392b" stroke="#8a2820" strokeWidth="0.6" />
        <text x="125.5" y="40" textAnchor="middle" fill="#7fb0d4" fontSize="3.5" fontFamily={MONO}>RST</text>
        {/* power LED */}
        <circle cx="112" cy="44" r="2.2" fill="#76b900" opacity="0.85" />
        {/* silk logo */}
        <text x="81" y="78" textAnchor="middle" fill="#cfe6f2" fontSize="7" fontFamily={MONO} fontWeight="700" letterSpacing="0.5">
          ARDUINO
        </text>
        <text x="120" y="70" textAnchor="middle" fill="#bfe0f2" fontSize="5" fontFamily={MONO}>UNO</text>
      </g>
    </g>
  );
}

export function HostBoardIllustration({ targetId, x, y, w, h }: BoardProps & { targetId: string }) {
  if (targetId === 'rpi') return <RpiBoard x={x} y={y} w={w} h={h} />;
  if (targetId === 'jetson') return <JetsonBoard x={x} y={y} w={w} h={h} />;
  if (targetId === 'stm32') return <Stm32Board x={x} y={y} w={w} h={h} />;
  if (targetId === 'arduino') return <ArduinoBoard x={x} y={y} w={w} h={h} />;
  return null;
}
