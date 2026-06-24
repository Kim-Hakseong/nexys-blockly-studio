'use client';

/**
 * Visual wiring canvas — Tinkercad-flavored, Nexys-themed.
 *
 * Capabilities
 *   - Drag a device icon from the tray onto the canvas → places a new device
 *   - Drag a placed device's body → moves it; wires update
 *   - Click a device's pin (SVG circle) → drag to a board pin to wire/rewire
 *   - Click a wire's midpoint badge → delete the wire
 *   - Zoom in/out (buttons + Ctrl/⌘+wheel), drag empty canvas to pan
 *   - Pot slider, button, switch controls live on the device itself
 */

import {
  PointerEvent, useCallback, useEffect, useRef, useState,
} from 'react';
import { cn } from '@/lib/utils';
import {
  DEVICES, DEVICE_BY_ID, type Inputs,
  type ChannelKind, type DeviceSpec, channelKind,
} from '@/lib/hardware/devices';
import {
  nextDeviceId, nextWireId, type PlacedDevice, type Wire, type WiringLayout,
} from '@/lib/hardware/wiring-state';
import type { SimSnapshot } from '@/lib/simulator/types';
import {
  LedVisual, BuzzerVisual, PushbuttonVisual, SwitchVisual,
  ThermoVisual, PressureVisual, StrainVisual, AccelVisual,
  PotVisual, MotorVisual, HeaterVisual, GenericReadout,
} from './device-visuals';
import {
  Trash2, MousePointer2, ZoomIn, ZoomOut, Maximize2,
} from 'lucide-react';
import { HostBoardIllustration } from './board-illustrations';
import { Breadboard } from './breadboard';
import { Grid3x3 } from 'lucide-react';

interface WiringCanvasProps {
  layout: WiringLayout;
  snapshot: SimSnapshot;
  inputs: Inputs;
  onLayoutChange: (next: WiringLayout) => void;
  onInputChange: (channel: string, value: number | boolean) => void;
  /** Active compile target id — drives the board illustration. */
  targetId: string;
}

// ----------------------------------------------------------------
//  Board geometry — pins per channel kind, with absolute coords
// ----------------------------------------------------------------

const CANVAS_W = 580;
const CANVAS_H = 460;
const BOARD = { x: 400, y: 20, w: 160, h: 420 };
const PIN_ROW_SPACING = 18;
const DEVICE_BOX = { w: 110, h: 50 };
const PIN_R = 6;          // device pin nub radius (SVG units)
const BOARD_PIN_R = 4;

interface PinPos {
  channel: string;
  kind: ChannelKind;
  x: number;
  y: number;
}

function computeBoardPins(): PinPos[] {
  const pins: PinPos[] = [];
  const cols: Array<{ kind: ChannelKind; prefix: string; count: number; xOff: number }> = [
    { kind: 'do', prefix: 'DO', count: 8, xOff: 20 },
    { kind: 'di', prefix: 'DI', count: 8, xOff: 60 },
    { kind: 'ai', prefix: 'AI', count: 8, xOff: 100 },
    { kind: 'ao', prefix: 'AO', count: 4, xOff: 140 },
  ];
  for (const col of cols) {
    for (let i = 0; i < col.count; i++) {
      pins.push({
        channel: `${col.prefix}${i}`,
        kind: col.kind,
        x: BOARD.x + col.xOff,
        y: BOARD.y + 70 + i * PIN_ROW_SPACING,
      });
    }
  }
  return pins;
}

const BOARD_PINS = computeBoardPins();
const PIN_BY_CHANNEL: Record<string, PinPos> = BOARD_PINS.reduce(
  (acc, p) => { acc[p.channel] = p; return acc; }, {} as Record<string, PinPos>
);

// Wires + channel pins keep the original instrument green, independent of the
// app's point color (--signal, now red). Decoupled on purpose per design.
const WIRE_GREEN = 'hsl(160 64% 45%)';
const KIND_COLOR: Record<ChannelKind, string> = {
  do: WIRE_GREEN,
  di: 'hsl(var(--info))',
  ai: 'hsl(160 50% 50%)',
  ao: 'hsl(213 90% 60%)',
};

// ----------------------------------------------------------------
//  Drag state machine
// ----------------------------------------------------------------

type DragState =
  | { kind: 'idle' }
  | { kind: 'palette'; deviceId: string; x: number; y: number }
  | { kind: 'move'; instanceId: string; dx: number; dy: number; x: number; y: number }
  | { kind: 'wire'; from: { deviceId: string }; x: number; y: number }
  | { kind: 'pan'; startClientX: number; startClientY: number; startVbX: number; startVbY: number };

const DEFAULT_VB = { x: 0, y: 0, w: CANVAS_W, h: CANVAS_H };
const MIN_VB = 200;     // most zoomed in (smaller w/h = more zoom)
const MAX_VB = 1400;    // most zoomed out

export function WiringCanvas({
  layout, snapshot, inputs, onLayoutChange, onInputChange, targetId,
}: WiringCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragState>({ kind: 'idle' });
  const [hoverPin, setHoverPin] = useState<string | null>(null);
  const [vb, setVb] = useState(DEFAULT_VB);
  const [showBreadboard, setShowBreadboard] = useState(false);

  // convert client → canvas coords, honoring current viewBox
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: vb.x + ((clientX - rect.left) / rect.width) * vb.w,
      y: vb.y + ((clientY - rect.top) / rect.height) * vb.h,
    };
  }, [vb]);

  // ── global pointer move/up while dragging ──
  useEffect(() => {
    if (drag.kind === 'idle') return;
    const onMove = (e: globalThis.PointerEvent) => {
      if (drag.kind === 'pan') {
        // pan in screen pixels, scaled to viewBox units
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const dx = (e.clientX - drag.startClientX) * (vb.w / rect.width);
        const dy = (e.clientY - drag.startClientY) * (vb.h / rect.height);
        setVb(v => ({ ...v, x: drag.startVbX - dx, y: drag.startVbY - dy }));
        return;
      }
      const c = toCanvas(e.clientX, e.clientY);
      setDrag(d => {
        if (d.kind === 'idle' || d.kind === 'pan') return d;
        if (d.kind === 'palette') return { ...d, x: c.x, y: c.y };
        if (d.kind === 'move')    return { ...d, x: c.x - d.dx, y: c.y - d.dy };
        if (d.kind === 'wire')    return { ...d, x: c.x, y: c.y };
        return d;
      });
    };
    const onUp = (e: globalThis.PointerEvent) => {
      if (drag.kind === 'pan') {
        setDrag({ kind: 'idle' });
        return;
      }
      const c = toCanvas(e.clientX, e.clientY);
      commitDrag(c.x, c.y);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, toCanvas, vb]);

  const commitDrag = (cx: number, cy: number) => {
    setDrag(d => {
      if (d.kind === 'palette') {
        if (cy < 5 || cx < 5 || cx > CANVAS_W - 5 || cy > CANVAS_H - 5) return { kind: 'idle' };
        if (cx > BOARD.x - DEVICE_BOX.w) return { kind: 'idle' };
        const id = nextDeviceId(layout, d.deviceId);
        const newDevice: PlacedDevice = {
          id, type: d.deviceId,
          x: cx - DEVICE_BOX.w / 2,
          y: cy - DEVICE_BOX.h / 2,
        };
        onLayoutChange({ ...layout, devices: [...layout.devices, newDevice] });
      } else if (d.kind === 'move') {
        const nx = clamp(d.x, 0, BOARD.x - DEVICE_BOX.w - 8);
        const ny = clamp(d.y, 0, CANVAS_H - DEVICE_BOX.h);
        onLayoutChange({
          ...layout,
          devices: layout.devices.map(dev =>
            dev.id === d.instanceId ? { ...dev, x: nx, y: ny } : dev
          ),
        });
      } else if (d.kind === 'wire') {
        if (hoverPin) {
          const dev = layout.devices.find(x => x.id === d.from.deviceId);
          if (dev) {
            const spec = DEVICE_BY_ID[dev.type];
            const pin = PIN_BY_CHANNEL[hoverPin];
            if (spec && pin && spec.kind === pin.kind) {
              const filtered = layout.wires.filter(
                w => w.channel !== hoverPin && w.deviceId !== d.from.deviceId
              );
              const newWire: Wire = {
                id: nextWireId({ ...layout, wires: filtered }),
                deviceId: d.from.deviceId,
                channel: hoverPin,
              };
              onLayoutChange({ ...layout, wires: [...filtered, newWire] });
            }
          }
        }
      }
      return { kind: 'idle' };
    });
    setHoverPin(null);
  };

  // ── zoom & pan controls ──
  const setZoom = (factor: number, around?: { x: number; y: number }) => {
    setVb(v => {
      const newW = clamp(v.w * factor, MIN_VB, MAX_VB);
      const newH = clamp(v.h * factor, MIN_VB * (CANVAS_H / CANVAS_W), MAX_VB * (CANVAS_H / CANVAS_W));
      const cx = around?.x ?? v.x + v.w / 2;
      const cy = around?.y ?? v.y + v.h / 2;
      return {
        x: cx - (cx - v.x) * (newW / v.w),
        y: cy - (cy - v.y) * (newH / v.h),
        w: newW,
        h: newH,
      };
    });
  };
  const zoomIn  = () => setZoom(0.8);
  const zoomOut = () => setZoom(1.25);
  const resetView = () => setVb(DEFAULT_VB);

  const onWheel = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const c = toCanvas(e.clientX, e.clientY);
    setZoom(e.deltaY > 0 ? 1.1 : 0.9, c);
  };

  // ── background pointerdown → start pan ──
  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    // only the SVG itself or our background rect
    const target = e.target as Element;
    if (target.tagName === 'svg' || target.id === 'canvas-bg' || target.id === 'canvas-grid-rect') {
      setDrag({
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        startVbX: vb.x,
        startVbY: vb.y,
      });
      e.preventDefault();
    }
  };

  // ── element-level drag starters ──
  const startPaletteDrag = (e: PointerEvent, deviceId: string) => {
    const c = toCanvas(e.clientX, e.clientY);
    setDrag({ kind: 'palette', deviceId, x: c.x, y: c.y });
    (e.target as Element).releasePointerCapture?.(e.pointerId);
  };
  const startMove = (e: PointerEvent, dev: PlacedDevice) => {
    if ((e.target as Element).closest('[data-control], [data-delete]')) return;
    const c = toCanvas(e.clientX, e.clientY);
    setDrag({ kind: 'move', instanceId: dev.id, dx: c.x - dev.x, dy: c.y - dev.y, x: dev.x, y: dev.y });
    e.preventDefault();
  };
  const startWire = (e: PointerEvent, dev: PlacedDevice) => {
    const c = toCanvas(e.clientX, e.clientY);
    setDrag({ kind: 'wire', from: { deviceId: dev.id }, x: c.x, y: c.y });
    e.stopPropagation();
    e.preventDefault();
  };

  const removeDevice = (id: string) => {
    onLayoutChange({
      devices: layout.devices.filter(d => d.id !== id),
      wires: layout.wires.filter(w => w.deviceId !== id),
    });
  };
  const removeWire = (id: string) => {
    onLayoutChange({ ...layout, wires: layout.wires.filter(w => w.id !== id) });
  };

  const liveValue = (channel: string): number | boolean => {
    const k = channelKind(channel);
    const idx = parseInt(channel.replace(/^[A-Z]+/, ''), 10);
    if (k === 'do') return snapshot.channels.do[idx] ?? false;
    if (k === 'di') return snapshot.channels.di[idx] ?? false;
    if (k === 'ai') return snapshot.channels.ai[idx] ?? 0;
    if (k === 'ao') return snapshot.channels.ao[idx] ?? 0;
    return 0;
  };

  const renderedPos = (dev: PlacedDevice) => {
    if (drag.kind === 'move' && drag.instanceId === dev.id) {
      return { x: drag.x, y: drag.y };
    }
    return { x: dev.x, y: dev.y };
  };
  const devicePinPos = (dev: PlacedDevice) => {
    const { x, y } = renderedPos(dev);
    return { x: x + DEVICE_BOX.w + PIN_R, y: y + DEVICE_BOX.h / 2 };
  };

  // ── render ──
  return (
    <div className="flex flex-col h-full bg-bg select-none">
      {/* Device tray */}
      <div className="border-b border-border bg-surface px-2 py-1.5 shrink-0 flex items-center gap-1 overflow-x-auto">
        <span className="overline text-[10px] mr-1.5 shrink-0">Tray</span>
        {DEVICES.map(d => {
          const Icon = d.icon;
          return (
            <button
              key={d.id}
              onPointerDown={(e) => startPaletteDrag(e, d.id)}
              className="shrink-0 flex flex-col items-center gap-0.5 px-1.5 py-1 border border-border bg-surface-2/40 hover:bg-surface-2 hover:border-signal/60 transition-colors cursor-grab active:cursor-grabbing"
              title={`Drag ${d.name} onto canvas`}
            >
              <Icon size={13} strokeWidth={1.75} className="text-text-muted" />
              <span className="mono text-[8px] text-text-muted">{d.shortName}</span>
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="overline text-[9px] shrink-0 flex items-center gap-1">
          <MousePointer2 size={9} /> drag · ⌘/Ctrl+wheel · pan empty
        </span>
      </div>

      {/* SVG canvas (relative for floating controls) */}
      <div className="flex-1 min-h-0 overflow-hidden bg-workspace relative">
        {/* breadboard toggle — top-left */}
        <button
          onClick={() => setShowBreadboard(v => !v)}
          className={cn(
            'absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 text-[11px] border backdrop-blur-[2px] transition-colors',
            showBreadboard
              ? 'bg-signal/15 border-signal/60 text-signal'
              : 'bg-surface/90 border-border text-text-muted hover:text-text hover:bg-surface-2'
          )}
          title="브레드보드 프로토타이핑 표면 표시/숨김"
        >
          <Grid3x3 size={12} strokeWidth={1.75} />
          Breadboard
        </button>

        {/* zoom controls — floating top-right, instrument-style */}
        <div className="absolute top-2 right-2 z-10 flex flex-col bg-surface/90 backdrop-blur-[2px] border border-border">
          <button onClick={zoomIn}    className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2" title="Zoom in">
            <ZoomIn size={13} strokeWidth={1.75} />
          </button>
          <div className="h-px bg-border" />
          <button onClick={zoomOut}   className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2" title="Zoom out">
            <ZoomOut size={13} strokeWidth={1.75} />
          </button>
          <div className="h-px bg-border" />
          <button onClick={resetView} className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2" title="Reset view">
            <Maximize2 size={13} strokeWidth={1.75} />
          </button>
        </div>
        {/* zoom indicator */}
        <div className="absolute bottom-2 right-2 z-10 mono text-[10px] text-text-muted/60 pointer-events-none">
          {Math.round((CANVAS_W / vb.w) * 100)}%
        </div>

        <svg
          ref={svgRef}
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          className="block"
          style={{
            touchAction: 'none',
            cursor: drag.kind === 'pan' ? 'grabbing' : 'default',
          }}
          onWheel={onWheel}
          onPointerDown={onBackgroundPointerDown}
        >
          <defs>
            <pattern id="canvasGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--border) / 0.4)" strokeWidth="0.4" />
            </pattern>
            <filter id="boardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>
          <rect id="canvas-grid-rect" x="0" y="0" width={CANVAS_W} height={CANVAS_H} fill="url(#canvasGrid)" />
          {/* generous background pad so panning into empty space works */}
          <rect id="canvas-bg" x="-1000" y="-1000" width="3000" height="3000" fill="transparent" />

          {/* breadboard prototyping surface (under devices) */}
          {showBreadboard && (
            <g filter="url(#boardShadow)" style={{ pointerEvents: 'none' }}>
              <Breadboard x={12} y={CANVAS_H - 138} w={360} h={124} />
            </g>
          )}

          {/* board */}
          <NexysBoard snapshot={snapshot} hoverPin={hoverPin} targetId={targetId} />

          {/* wires */}
          {layout.wires.map(wire => {
            const dev = layout.devices.find(d => d.id === wire.deviceId);
            const pin = PIN_BY_CHANNEL[wire.channel];
            if (!dev || !pin) return null;
            return (
              <WirePath
                key={wire.id}
                from={devicePinPos(dev)}
                to={{ x: pin.x, y: pin.y }}
                color={KIND_COLOR[pin.kind]}
                onDelete={() => removeWire(wire.id)}
              />
            );
          })}

          {/* preview wire */}
          {drag.kind === 'wire' && (() => {
            const dev = layout.devices.find(x => x.id === drag.from.deviceId);
            if (!dev) return null;
            const from = devicePinPos(dev);
            const targetPin = hoverPin ? PIN_BY_CHANNEL[hoverPin] : null;
            const spec = DEVICE_BY_ID[dev.type];
            const valid = !!(targetPin && spec && targetPin.kind === spec.kind);
            return (
              <WirePath
                from={from}
                to={targetPin ? { x: targetPin.x, y: targetPin.y } : { x: drag.x, y: drag.y }}
                color={targetPin ? (valid ? KIND_COLOR[targetPin.kind] : 'hsl(var(--alarm))') : 'hsl(var(--text-muted))'}
                dashed={!targetPin}
                preview
              />
            );
          })()}

          {/* device cards (HTML body inside foreignObject) + pin nub as SVG circle */}
          {layout.devices.map(dev => {
            const spec = DEVICE_BY_ID[dev.type];
            if (!spec) return null;
            const { x, y } = renderedPos(dev);
            const wire = layout.wires.find(w => w.deviceId === dev.id);
            const ch = wire?.channel;
            const live = ch ? liveValue(ch) : (spec.kind === 'do' || spec.kind === 'di' ? false : 0);
            const pin = devicePinPos(dev);
            const wired = !!ch;
            return (
              <g key={dev.id}>
                <foreignObject x={x} y={y} width={DEVICE_BOX.w} height={DEVICE_BOX.h + 14}
                               style={{ overflow: 'visible' }}>
                  <DeviceCard
                    spec={spec}
                    wireChannel={ch}
                    live={live}
                    inputs={inputs}
                    onStartMove={(e) => startMove(e, dev)}
                    onDelete={() => removeDevice(dev.id)}
                    onInputChange={onInputChange}
                  />
                </foreignObject>
                {/* SVG pin nub — reliable pointer events, outside HTML island */}
                <circle
                  cx={pin.x} cy={pin.y} r={PIN_R}
                  fill={wired
                    ? (spec.kind === 'do' || spec.kind === 'ai' ? WIRE_GREEN : 'hsl(var(--info))')
                    : 'hsl(var(--surface))'}
                  stroke={wired
                    ? (spec.kind === 'do' || spec.kind === 'ai' ? WIRE_GREEN : 'hsl(var(--info))')
                    : 'hsl(var(--text-muted))'}
                  strokeWidth="1.4"
                  onPointerDown={(e) => startWire(e, dev)}
                  style={{ cursor: 'crosshair' }}
                />
                {/* outer hover ring for hit area */}
                <circle
                  cx={pin.x} cy={pin.y} r={PIN_R + 4}
                  fill="transparent"
                  onPointerDown={(e) => startWire(e, dev)}
                  style={{ cursor: 'crosshair' }}
                />
              </g>
            );
          })}

          {/* board pin hit targets — only active while wiring */}
          {drag.kind === 'wire' && BOARD_PINS.map(pin => {
            const sourceSpec = DEVICE_BY_ID[
              layout.devices.find(d => d.id === drag.from.deviceId)?.type ?? ''
            ];
            const compatible = !!(sourceSpec && sourceSpec.kind === pin.kind);
            return (
              <circle
                key={pin.channel}
                cx={pin.x} cy={pin.y} r={11}
                fill="transparent"
                onPointerEnter={() => setHoverPin(pin.channel)}
                onPointerLeave={() => setHoverPin(curr => (curr === pin.channel ? null : curr))}
                style={{ pointerEvents: 'all', cursor: compatible ? 'pointer' : 'not-allowed' }}
              />
            );
          })}

          {/* palette drag preview */}
          {drag.kind === 'palette' && (() => {
            const spec = DEVICE_BY_ID[drag.deviceId];
            if (!spec) return null;
            const Icon = spec.icon;
            return (
              <foreignObject x={drag.x - 20} y={drag.y - 20} width="80" height="40" style={{ pointerEvents: 'none' }}>
                <div className="border border-signal bg-surface-2/90 px-2 py-1 inline-flex items-center gap-1 shadow-lg">
                  <Icon size={12} className="text-signal" />
                  <span className="mono text-[10px] text-signal">{spec.shortName}</span>
                </div>
              </foreignObject>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}

// ================================================================
//  Board SVG — pins, labels, status lights
// ================================================================

interface BoardTheme {
  pcb: string; stroke: string; text: string; sub: string; accent: string;
  label: string; subtitle: string; pinUnlit: string; pinStroke: string;
}

const BOARD_THEMES: Record<string, BoardTheme> = {
  // NI instruments — slate chassis + NI green accent
  ni_pxie: {
    pcb: 'hsl(210 12% 17%)', stroke: 'hsl(210 12% 30%)',
    text: 'hsl(150 24% 84%)', sub: 'hsl(210 10% 60%)', accent: 'hsl(150 45% 58%)',
    label: 'NI PXIe', subtitle: 'PXIe-1092 · DAQmx',
    pinUnlit: 'hsl(210 10% 24%)', pinStroke: 'hsl(210 12% 34%)',
  },
  ni_crio: {
    pcb: 'hsl(210 12% 17%)', stroke: 'hsl(210 12% 30%)',
    text: 'hsl(150 24% 84%)', sub: 'hsl(210 10% 60%)', accent: 'hsl(150 45% 58%)',
    label: 'NI CompactRIO', subtitle: 'cRIO-9045 · NI Linux RT',
    pinUnlit: 'hsl(210 10% 24%)', pinStroke: 'hsl(210 12% 34%)',
  },
  ni_cdaq: {
    pcb: 'hsl(210 12% 17%)', stroke: 'hsl(210 12% 30%)',
    text: 'hsl(150 24% 84%)', sub: 'hsl(210 10% 60%)', accent: 'hsl(150 45% 58%)',
    label: 'NI CompactDAQ', subtitle: 'cDAQ-9178 · DAQmx',
    pinUnlit: 'hsl(210 10% 24%)', pinStroke: 'hsl(210 12% 34%)',
  },
};

function NexysBoard({
  snapshot, hoverPin, targetId,
}: { snapshot: SimSnapshot; hoverPin: string | null; targetId: string }) {
  const th = BOARD_THEMES[targetId] ?? BOARD_THEMES.ni_pxie;
  const cx = BOARD.x + BOARD.w / 2;
  return (
    <g filter="url(#boardShadow)">
      {/* PCB body */}
      <rect x={BOARD.x} y={BOARD.y} width={BOARD.w} height={BOARD.h}
            fill={th.pcb} stroke={th.stroke} strokeWidth="1" rx="6" />
      {/* silkscreen header */}
      <text x={cx} y={BOARD.y + 20} textAnchor="middle"
            fill={th.text} fontSize="8.5" fontFamily="'IBM Plex Mono', monospace"
            fontWeight="700" letterSpacing="0.08em">
        {th.label}
      </text>
      <text x={cx} y={BOARD.y + 31} textAnchor="middle"
            fill={th.sub} fontSize="6" fontFamily="'IBM Plex Mono', monospace">
        {th.subtitle} · 8AI 4AO 8DI 8DO
      </text>
      {/* PWR led */}
      <circle cx={BOARD.x + 12} cy={BOARD.y + 16} r="2.5" fill="hsl(var(--signal))">
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x={BOARD.x + 17} y={BOARD.y + 18.5} fill={th.sub} fontSize="4.5" fontFamily="'IBM Plex Mono'">PWR</text>

      {/* column headers */}
      {['DO', 'DI', 'AI', 'AO'].map((label, i) => (
        <text key={label} x={BOARD.x + 20 + i * 40} y={BOARD.y + 50} textAnchor="middle"
              fill={th.text} fontSize="7" fontFamily="'IBM Plex Mono', monospace" fontWeight="600">
          {label}
        </text>
      ))}

      {/* GPIO header backing strip */}
      <rect x={BOARD.x + 8} y={BOARD.y + 56} width={BOARD.w - 16} height={150}
            fill="hsl(0 0% 0% / 0.18)" rx="3" />

      {/* pins (functional — wiring targets) */}
      {BOARD_PINS.map(pin => {
        const isHover = hoverPin === pin.channel;
        const idx = parseInt(pin.channel.replace(/^[A-Z]+/, ''), 10);
        let lit = false;
        if (pin.kind === 'do') lit = snapshot.channels.do[idx] === true;
        else if (pin.kind === 'di') lit = snapshot.channels.di[idx] === true;
        else if (pin.kind === 'ai') lit = Math.abs(snapshot.channels.ai[idx] ?? 0) > 0.1;
        else if (pin.kind === 'ao') lit = Math.abs(snapshot.channels.ao[idx] ?? 0) > 0.1;
        return (
          <g key={pin.channel}>
            <circle cx={pin.x} cy={pin.y} r={BOARD_PIN_R}
                    fill={lit ? KIND_COLOR[pin.kind] : th.pinUnlit}
                    stroke={isHover ? 'hsl(var(--signal))' : th.pinStroke}
                    strokeWidth={isHover ? 1.5 : 0.5}
                    style={{ transition: 'fill 100ms' }} />
            {lit && (
              <circle cx={pin.x} cy={pin.y} r="7" fill="none" stroke={KIND_COLOR[pin.kind]} strokeWidth="0.5" opacity="0.6">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.2s" repeatCount="indefinite" />
              </circle>
            )}
            <text x={pin.x + 8} y={pin.y + 2.5} fontSize="5"
                  fontFamily="'IBM Plex Mono', monospace" fill={th.sub}>
              {pin.channel.slice(-1)}
            </text>
          </g>
        );
      })}

      {/* board-specific art in the lower zone */}
      <BoardArt targetId={targetId} th={th} />

      {/* power rail label */}
      <text x={cx} y={BOARD.y + BOARD.h - 5} textAnchor="middle"
            fill={th.sub} fontSize="5" fontFamily="'IBM Plex Mono'">
        GND · 3V3 · 5V (virtual)
      </text>
    </g>
  );
}

/** Recognizable board components drawn in the lower zone (y ≈ 230..405). */
function BoardArt({ targetId, th }: { targetId: string; th: BoardTheme }) {
  const x0 = BOARD.x;
  const cx = BOARD.x + BOARD.w / 2;
  const top = BOARD.y + 224;   // start of art zone
  const mono = "'IBM Plex Mono', monospace";

  // Detailed host-board illustration — same inline-SVG style for all targets.
  {
    const foW = BOARD.w - 10;
    const foH = foW * 0.66;
    const bx = x0 + 5;
    const by = top + 12;
    return (
      <g>
        <text x={cx} y={top + 4} textAnchor="middle" fill={th.sub} fontSize="5.5" fontFamily={mono}>
          ▸ host board
        </text>
        <HostBoardIllustration targetId={targetId} x={bx} y={by} w={foW} h={foH} />
      </g>
    );
  }
}

// ================================================================
//  Wire path
// ================================================================

function WirePath({
  from, to, color, dashed = false, preview = false, onDelete,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  dashed?: boolean;
  preview?: boolean;
  onDelete?: () => void;
}) {
  const dx = (to.x - from.x);
  const cx1 = from.x + Math.max(40, dx * 0.45);
  const cx2 = to.x - Math.max(40, dx * 0.45);
  const path = `M ${from.x},${from.y} C ${cx1},${from.y} ${cx2},${to.y} ${to.x},${to.y}`;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const [hover, setHover] = useState(false);
  return (
    <g onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <path d={path} stroke="transparent" strokeWidth="14" fill="none"
            style={{ pointerEvents: preview ? 'none' : 'stroke' }} />
      <path d={path} stroke={color}
            strokeWidth={preview ? 1.5 : (hover ? 2.5 : 1.8)}
            fill="none" strokeLinecap="round"
            strokeDasharray={dashed ? '4,4' : undefined}
            opacity={preview ? 0.8 : 1}
            style={{ transition: 'stroke-width 100ms' }} />
      {!preview && hover && onDelete && (
        <g style={{ cursor: 'pointer' }} onPointerDown={(e) => { e.stopPropagation(); onDelete(); }}>
          <circle cx={mx} cy={my} r="6" fill="hsl(var(--alarm))" />
          <line x1={mx - 2.5} y1={my - 2.5} x2={mx + 2.5} y2={my + 2.5} stroke="hsl(var(--bg))" strokeWidth="1.5" />
          <line x1={mx - 2.5} y1={my + 2.5} x2={mx + 2.5} y2={my - 2.5} stroke="hsl(var(--bg))" strokeWidth="1.5" />
        </g>
      )}
    </g>
  );
}

// ================================================================
//  Device card (HTML inside foreignObject)
// ================================================================

function DeviceCard({
  spec, wireChannel, live, inputs, onStartMove, onDelete, onInputChange,
}: {
  spec: DeviceSpec;
  wireChannel?: string;
  live: number | boolean;
  inputs: Inputs;
  onStartMove: (e: PointerEvent) => void;
  onDelete: () => void;
  onInputChange: (channel: string, v: number | boolean) => void;
}) {
  const Icon = spec.icon;
  const ch = wireChannel;
  const inputValue = ch ? inputs[ch] : undefined;

  let inner: React.ReactNode = null;
  switch (spec.id) {
    case 'led':      inner = <LedVisual on={!!live} />; break;
    case 'buzzer':   inner = <BuzzerVisual on={!!live} />; break;
    case 'button':
      inner = ch ? (
        <PushbuttonVisual
          on={!!inputValue}
          onMouseDown={() => onInputChange(ch, true)}
          onMouseUp={() => onInputChange(ch, false)}
          onMouseLeave={() => onInputChange(ch, false)}
        />
      ) : <span className="text-[9px] text-text-muted/60 px-1">wire to DI</span>;
      break;
    case 'switch':
      inner = ch ? (
        <SwitchVisual on={!!inputValue} onClick={() => onInputChange(ch, !inputValue)} />
      ) : <span className="text-[9px] text-text-muted/60 px-1">wire to DI</span>;
      break;
    case 'thermo':   inner = <ThermoVisual value={Number(live)} />; break;
    case 'pressure': inner = <PressureVisual value={Number(live)} />; break;
    case 'strain':   inner = <StrainVisual value={Number(live)} />; break;
    case 'accel':    inner = <AccelVisual value={Number(live)} />; break;
    case 'pot':
      inner = ch ? (
        <PotVisual
          value={typeof inputValue === 'number' ? inputValue : 0}
          min={spec.range?.min ?? 0}
          max={spec.range?.max ?? 5}
          step={spec.range?.step ?? 0.05}
          onChange={(v) => onInputChange(ch, v)}
        />
      ) : <span className="text-[9px] text-text-muted/60 px-1">wire to AI</span>;
      break;
    case 'motor':    inner = <MotorVisual value={Number(live)} />; break;
    case 'heater':   inner = <HeaterVisual value={Number(live)} />; break;
    case 'aoSource':
      inner = ch ? (
        <PotVisual
          value={typeof inputValue === 'number' ? inputValue : 0}
          min={spec.range?.min ?? 0}
          max={spec.range?.max ?? 5}
          step={spec.range?.step ?? 0.05}
          onChange={(v) => onInputChange(ch, v)}
        />
      ) : <span className="text-[9px] text-text-muted/60 px-1">wire to AO</span>;
      break;
    default:         inner = <GenericReadout value={Number(live)} unit="" />;
  }

  return (
    <div
      onPointerDown={onStartMove}
      className="bg-surface/95 border border-border shadow-md hover:border-signal/60 transition-colors cursor-grab active:cursor-grabbing relative group"
      style={{ width: DEVICE_BOX.w, minHeight: DEVICE_BOX.h }}
    >
      <div className="flex items-center gap-1 px-1 py-0.5 border-b border-border/60 bg-surface-2/40">
        <Icon size={9} strokeWidth={1.75} className="text-text-muted shrink-0" />
        <span className="mono text-[8px] text-text truncate flex-1">{spec.shortName}</span>
        {ch && <span className={cn(
          'mono text-[8px] px-0.5',
          spec.kind === 'do' ? 'text-signal'
          : spec.kind === 'di' ? 'text-info'
          : spec.kind === 'ai' ? 'text-signal' : 'text-info'
        )}>{ch}</span>}
        <button
          data-delete
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="text-text-muted/40 hover:text-alarm transition-colors opacity-0 group-hover:opacity-100"
          title="Remove device"
        >
          <Trash2 size={8} />
        </button>
      </div>
      <div data-control className="py-0.5">{inner}</div>
    </div>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
