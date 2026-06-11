'use client';

/**
 * Per-device SVG visualizations for the Hardware tab.
 *
 * Each component is ~36px tall and is rendered inside a bound channel cell.
 * Animations driven by CSS keyframes (defined in tailwind.config / globals).
 */

import { cn } from '@/lib/utils';

// ----------------------------------------------------------------
//  Shared chrome
// ----------------------------------------------------------------

function ValueChip({
  value, unit, tone = 'signal',
}: { value: string; unit: string; tone?: 'signal' | 'info' | 'warn' | 'alarm' }) {
  const cls = {
    signal: 'text-signal',
    info:   'text-info',
    warn:   'text-warn',
    alarm:  'text-alarm',
  }[tone];
  return (
    <span className={cn('mono text-[10px] tabular-nums', cls)}>
      {value}<span className="text-text-muted/60 ml-0.5">{unit}</span>
    </span>
  );
}

// ----------------------------------------------------------------
//  LED — bulb with glow
// ----------------------------------------------------------------
export function LedVisual({ on }: { on: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="22" height="28" viewBox="0 0 22 28" className="shrink-0">
        <defs>
          <radialGradient id={`led-grad-${on}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={on ? 'hsl(160 100% 70%)' : 'hsl(220 14% 25%)'} />
            <stop offset="100%" stopColor={on ? 'hsl(160 64% 38%)' : 'hsl(220 14% 14%)'} />
          </radialGradient>
        </defs>
        {/* glow halo */}
        {on && (
          <circle cx="11" cy="10" r="13" fill="hsl(var(--signal))" opacity="0.18">
            <animate attributeName="opacity" values="0.18;0.35;0.18" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
        {/* bulb body */}
        <path d="M5,11 a6,6 0 0 1 12,0 v3 a3,3 0 0 1 -3,3 h-6 a3,3 0 0 1 -3,-3 z"
              fill={`url(#led-grad-${on})`}
              stroke={on ? 'hsl(var(--signal))' : 'hsl(var(--border))'}
              strokeWidth="0.8" />
        {/* leads */}
        <line x1="8" y1="18" x2="8" y2="26" stroke="hsl(var(--text-muted))" strokeWidth="0.8" />
        <line x1="14" y1="18" x2="14" y2="26" stroke="hsl(var(--text-muted))" strokeWidth="0.8" />
        {/* filament when on */}
        {on && (
          <path d="M8,11 Q11,8 14,11" fill="none" stroke="hsl(50 100% 80%)" strokeWidth="0.6" />
        )}
      </svg>
      <span className={cn('mono text-[9px]', on ? 'text-signal' : 'text-text-muted/50')}>
        {on ? 'ON' : 'off'}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------
//  Buzzer — speaker with animated sound waves
// ----------------------------------------------------------------
export function BuzzerVisual({ on }: { on: boolean }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="32" height="22" viewBox="0 0 32 22" className="shrink-0">
        {/* speaker body */}
        <path d="M3,7 h5 l5,-4 v16 l-5,-4 h-5 z"
              fill={on ? 'hsl(var(--warn))' : 'hsl(var(--surface-2))'}
              stroke="hsl(var(--border))" strokeWidth="0.8" />
        {/* sound waves */}
        {on && [0, 1, 2].map(i => (
          <path key={i}
                d={`M${15 + i * 4},11 q${3 + i},-4 0,-8 m0,8 q${3 + i},4 0,8`}
                fill="none"
                stroke="hsl(var(--warn))"
                strokeWidth="1"
                strokeLinecap="round"
                opacity={0.8 - i * 0.2}>
            <animate attributeName="opacity"
                     values={`${0.8 - i * 0.2};0.1;${0.8 - i * 0.2}`}
                     dur="0.6s"
                     begin={`${i * 0.15}s`}
                     repeatCount="indefinite" />
          </path>
        ))}
      </svg>
      <span className={cn('mono text-[9px]', on ? 'text-warn' : 'text-text-muted/50')}>
        {on ? 'BEEP' : 'mute'}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------
//  Pushbutton — 3D cap that depresses on press
// ----------------------------------------------------------------
export function PushbuttonVisual({
  on, onMouseDown, onMouseUp, onMouseLeave,
}: {
  on: boolean;
  onMouseDown: () => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <button
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        className="shrink-0 cursor-pointer"
        title="Press to set HIGH"
      >
        <svg width="32" height="28" viewBox="0 0 32 28">
          {/* base ring */}
          <ellipse cx="16" cy="24" rx="12" ry="2.5" fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" strokeWidth="0.6" />
          {/* button body — shifts down when pressed */}
          <g transform={`translate(0, ${on ? 3 : 0})`} style={{ transition: 'transform 60ms' }}>
            <ellipse cx="16" cy="18" rx="10" ry="3" fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth="0.6" />
            <rect x="6" y="9" width="20" height="9" fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth="0.6" />
            <ellipse cx="16" cy="9" rx="10" ry="3"
                     fill={on ? 'hsl(var(--signal) / 0.85)' : 'hsl(var(--surface-2))'}
                     stroke={on ? 'hsl(var(--signal))' : 'hsl(var(--border))'}
                     strokeWidth="0.8" />
          </g>
        </svg>
      </button>
      <span className={cn('mono text-[9px]', on ? 'text-signal' : 'text-text-muted/50')}>
        {on ? 'HIGH' : 'PUSH'}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------
//  Toggle switch — slider physically moves L/R
// ----------------------------------------------------------------
export function SwitchVisual({
  on, onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1">
      <button onClick={onClick} className="shrink-0 cursor-pointer" title="Toggle">
        <svg width="36" height="20" viewBox="0 0 36 20">
          {/* track */}
          <rect x="1" y="4" width="34" height="12" rx="6"
                fill={on ? 'hsl(var(--signal) / 0.25)' : 'hsl(var(--surface-2))'}
                stroke={on ? 'hsl(var(--signal))' : 'hsl(var(--border))'}
                strokeWidth="0.8" />
          {/* knob */}
          <circle cx={on ? 27 : 9} cy="10" r="6"
                  fill={on ? 'hsl(var(--signal))' : 'hsl(var(--text-muted))'}
                  stroke="hsl(var(--bg))" strokeWidth="0.8"
                  style={{ transition: 'cx 120ms ease-out' }} />
        </svg>
      </button>
      <span className={cn('mono text-[9px]', on ? 'text-signal' : 'text-text-muted/50')}>
        {on ? 'HIGH' : 'LOW'}
      </span>
    </div>
  );
}

// ----------------------------------------------------------------
//  Thermometer — mercury rises with temperature
// ----------------------------------------------------------------
export function ThermoVisual({ value }: { value: number }) {
  // map -20°C..50°C → 0..1 fill ratio
  const ratio = Math.max(0, Math.min(1, (value + 20) / 70));
  const fillH = ratio * 16; // tube is 16 tall
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="14" height="32" viewBox="0 0 14 32" className="shrink-0">
        {/* scale marks */}
        {[6, 11, 16, 21].map(y => (
          <line key={y} x1="9" x2="11" y1={y} y2={y} stroke="hsl(var(--text-muted))" strokeWidth="0.4" />
        ))}
        {/* tube outline */}
        <rect x="5" y="3" width="4" height="20" rx="2" fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" strokeWidth="0.6" />
        {/* mercury column */}
        <rect x="5.5" y={23 - fillH} width="3" height={fillH}
              fill="hsl(0 75% 50%)"
              style={{ transition: 'all 200ms' }} />
        {/* bulb */}
        <circle cx="7" cy="26" r="4" fill="hsl(0 75% 50%)" stroke="hsl(0 75% 40%)" strokeWidth="0.6" />
      </svg>
      <ValueChip value={value.toFixed(1)} unit="°C" tone="signal" />
    </div>
  );
}

// ----------------------------------------------------------------
//  Pressure gauge — analog dial with needle
// ----------------------------------------------------------------
export function PressureVisual({ value }: { value: number }) {
  // map 0..2 bar → -135°..+135° needle rotation
  const ratio = Math.max(0, Math.min(1, value / 2));
  const angle = -135 + ratio * 270;
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
        {/* dial face */}
        <circle cx="16" cy="16" r="13" fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        {/* arc */}
        <path d="M 7.5,22 A 11,11 0 1 1 24.5,22" fill="none" stroke="hsl(var(--border))" strokeWidth="0.6" />
        {/* tick marks */}
        {[-135, -90, -45, 0, 45, 90, 135].map((a, i) => {
          const rad = (a - 90) * Math.PI / 180;
          const x1 = 16 + Math.cos(rad) * 11;
          const y1 = 16 + Math.sin(rad) * 11;
          const x2 = 16 + Math.cos(rad) * 9;
          const y2 = 16 + Math.sin(rad) * 9;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--text-muted))" strokeWidth="0.4" />;
        })}
        {/* needle */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '16px 16px', transition: 'transform 250ms ease-out' }}>
          <line x1="16" y1="16" x2="16" y2="5" stroke="hsl(var(--info))" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="16" cy="16" r="2" fill="hsl(var(--info))" />
        </g>
      </svg>
      <ValueChip value={value.toFixed(2)} unit="bar" tone="info" />
    </div>
  );
}

// ----------------------------------------------------------------
//  Strain — horizontal bar that flexes
// ----------------------------------------------------------------
export function StrainVisual({ value }: { value: number }) {
  // map 100..140 μs → -3..+3 px deflection
  const deflect = Math.max(-4, Math.min(4, (value - 120) / 5));
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="36" height="22" viewBox="0 0 36 22" className="shrink-0">
        {/* supports */}
        <rect x="1" y="14" width="3" height="6" fill="hsl(var(--text-muted))" />
        <rect x="32" y="14" width="3" height="6" fill="hsl(var(--text-muted))" />
        {/* beam (curved) */}
        <path d={`M 4,12 Q 18,${12 + deflect * 1.5} 32,12`}
              fill="none" stroke="hsl(var(--signal))" strokeWidth="2.5" strokeLinecap="round"
              style={{ transition: 'd 200ms' }} />
        {/* force arrow */}
        <path d={`M 18,2 L 18,${10 + deflect * 1.5}`}
              stroke="hsl(var(--warn))" strokeWidth="1" markerEnd="url(#arrow)" />
        <defs>
          <marker id="arrow" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4 z" fill="hsl(var(--warn))" />
          </marker>
        </defs>
      </svg>
      <ValueChip value={value.toFixed(0)} unit="με" tone="signal" />
    </div>
  );
}

// ----------------------------------------------------------------
//  Accel — ball position represents axis acceleration
// ----------------------------------------------------------------
export function AccelVisual({ value }: { value: number }) {
  // map -10..10 → ball position 4..28 (x in SVG)
  const px = 16 + Math.max(-12, Math.min(12, value * 1.2));
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="36" height="22" viewBox="0 0 36 22" className="shrink-0">
        {/* tube */}
        <rect x="2" y="8" width="32" height="6" rx="3"
              fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" strokeWidth="0.6" />
        {/* center line */}
        <line x1="18" y1="6" x2="18" y2="16" stroke="hsl(var(--text-muted))" strokeWidth="0.4" strokeDasharray="1,1" />
        {/* ball */}
        <circle cx={px} cy="11" r="2.5" fill="hsl(var(--warn))"
                style={{ transition: 'cx 150ms ease-out' }} />
      </svg>
      <ValueChip value={value.toFixed(2)} unit="m/s²" tone="warn" />
    </div>
  );
}

// ----------------------------------------------------------------
//  Potentiometer — rotary knob + slider control
// ----------------------------------------------------------------
export function PotVisual({
  value, min, max, step, onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  // map value → knob rotation -135..+135
  const ratio = (value - min) / (max - min);
  const angle = -135 + ratio * 270;
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
        {/* knob body */}
        <circle cx="13" cy="13" r="10" fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        <circle cx="13" cy="13" r="7.5" fill="hsl(var(--surface-2))" stroke="hsl(var(--border))" strokeWidth="0.4" />
        {/* indicator line */}
        <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '13px 13px', transition: 'transform 80ms' }}>
          <line x1="13" y1="13" x2="13" y2="5" stroke="hsl(var(--signal))" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        {/* tick marks at extremes */}
        <text x="3" y="22" fontSize="3" fill="hsl(var(--text-muted))">{min}</text>
        <text x="20" y="22" fontSize="3" fill="hsl(var(--text-muted))">{max}</text>
      </svg>
      <div className="flex-1 min-w-0 flex items-center gap-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-0.5 bg-surface-2 appearance-none cursor-pointer accent-signal"
        />
        <ValueChip value={value.toFixed(2)} unit="V" tone="signal" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
//  Motor — rotating gear, speed proportional to voltage
// ----------------------------------------------------------------
export function MotorVisual({ value }: { value: number }) {
  const absV = Math.abs(value);
  const dur = absV < 0.1 ? '0s' : `${Math.max(0.25, 2.4 - absV * 0.42)}s`;
  const reverse = value < 0;
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
        {/* shaft housing */}
        <circle cx="14" cy="14" r="13" fill="hsl(var(--surface))" stroke="hsl(var(--border))" strokeWidth="0.8" />
        {/* gear */}
        <g style={{
          animation: absV < 0.1 ? 'none' : `${reverse ? 'spinReverse' : 'spin'} ${dur} linear infinite`,
          transformOrigin: '14px 14px',
        }}>
          {/* gear teeth */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
            <rect key={a} x="12.5" y="2" width="3" height="3"
                  fill="hsl(var(--info))"
                  transform={`rotate(${a} 14 14)`} />
          ))}
          {/* hub */}
          <circle cx="14" cy="14" r="7" fill="hsl(var(--info) / 0.25)" stroke="hsl(var(--info))" strokeWidth="0.6" />
          {/* indicator notch */}
          <rect x="13" y="8" width="2" height="4" fill="hsl(var(--info))" />
          <circle cx="14" cy="14" r="1.5" fill="hsl(var(--bg))" />
        </g>
      </svg>
      <ValueChip value={value.toFixed(2)} unit="V" tone="info" />
    </div>
  );
}

// ----------------------------------------------------------------
//  Heater — coil glows red, intensity from voltage
// ----------------------------------------------------------------
export function HeaterVisual({ value }: { value: number }) {
  const ratio = Math.max(0, Math.min(1, value / 5));
  const glowColor = ratio < 0.3
    ? `hsl(220 50% ${30 + ratio * 100}%)`
    : ratio < 0.7
      ? `hsl(${30 + (1 - ratio) * 20} 90% ${40 + ratio * 30}%)`
      : `hsl(0 85% ${45 + ratio * 25}%)`;
  return (
    <div className="flex items-center gap-2 px-1">
      <svg width="36" height="22" viewBox="0 0 36 22" className="shrink-0">
        <defs>
          <filter id="heatGlow">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>
        {/* heat ripples */}
        {ratio > 0.2 && [0, 1, 2].map(i => (
          <path key={i}
                d={`M ${4 + i * 10},6 q 2,-2 4,0 t 4,0`}
                fill="none" stroke={glowColor} strokeWidth="0.6" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur={`${0.8 + i * 0.2}s`} repeatCount="indefinite" />
            <animate attributeName="d"
                     values={`M ${4 + i * 10},8 q 2,-2 4,0 t 4,0;M ${4 + i * 10},5 q 2,-2 4,0 t 4,0;M ${4 + i * 10},8 q 2,-2 4,0 t 4,0`}
                     dur={`${1 + i * 0.2}s`} repeatCount="indefinite" />
          </path>
        ))}
        {/* coil (zigzag) */}
        <path d="M 4,14 L 8,18 L 12,14 L 16,18 L 20,14 L 24,18 L 28,14 L 32,18"
              fill="none" stroke={glowColor} strokeWidth="2" strokeLinecap="round"
              filter={ratio > 0.5 ? 'url(#heatGlow)' : undefined}
              style={{ transition: 'stroke 150ms' }} />
        {/* leads */}
        <line x1="2" y1="14" x2="4" y2="14" stroke="hsl(var(--text-muted))" strokeWidth="0.6" />
        <line x1="32" y1="18" x2="34" y2="18" stroke="hsl(var(--text-muted))" strokeWidth="0.6" />
      </svg>
      <ValueChip value={value.toFixed(2)} unit="V" tone={ratio > 0.6 ? 'alarm' : ratio > 0.3 ? 'warn' : 'info'} />
    </div>
  );
}

// ----------------------------------------------------------------
//  Generic — used for unknown bindings
// ----------------------------------------------------------------
export function GenericReadout({ value, unit, tone = 'info' }: { value: number; unit: string; tone?: 'signal' | 'info' | 'warn' }) {
  return (
    <div className="flex items-center justify-end px-1 py-0.5">
      <ValueChip value={value.toFixed(2)} unit={unit} tone={tone} />
    </div>
  );
}

// ----------------------------------------------------------------
//  Empty cell readout (unbound)
// ----------------------------------------------------------------
export function EmptyReadout({ value, kind }: { value: number | boolean; kind: 'ai' | 'ao' | 'di' | 'do' }) {
  if (kind === 'do' || kind === 'di') {
    return (
      <div className="h-3 flex items-center px-1">
        <div className={cn(
          'w-2 h-2 rounded-full',
          value ? 'bg-text-muted/40' : 'bg-surface border border-border'
        )} />
        <span className="ml-1.5 mono text-[8px] text-text-muted/40">
          {value ? 'HIGH' : 'LOW'}
        </span>
      </div>
    );
  }
  return (
    <div className="h-3 flex items-center justify-end px-1 mono text-[9px] text-text-muted/40">
      {typeof value === 'number' ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}` : ''}
    </div>
  );
}
