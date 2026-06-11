'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { HISTORY_LEN, type LogEntry, type SimSnapshot } from '@/lib/simulator/types';
import {
  Play, Square, RotateCcw, Activity, AlertTriangle,
  CircleCheck, Database, Trash2, Filter,
} from 'lucide-react';

interface RuntimePanelProps {
  snapshot: SimSnapshot;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;
}

type LogFilter = 'all' | 'data' | 'event';

export function RuntimePanel({ snapshot, onRun, onStop, onReset }: RuntimePanelProps) {
  const consoleRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    const el = consoleRef.current;
    if (!el || !autoScroll) {
      lastCountRef.current = snapshot.logs.length;
      return;
    }
    if (snapshot.logs.length > lastCountRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastCountRef.current = snapshot.logs.length;
  }, [snapshot.logs.length, autoScroll]);

  const running = snapshot.status === 'running';
  const elapsedSec = snapshot.startedAt
    ? ((Date.now() - snapshot.startedAt) / 1000)
    : 0;

  const filteredLogs = snapshot.logs.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'data') return l.level === 'data' || l.level === 'bit';
    if (filter === 'event') return l.level === 'info' || l.level === 'warn' || l.level === 'alarm';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* ───── Controls + status ───── */}
      <div className="border-b border-border bg-surface px-4 py-3 shrink-0 flex items-center gap-2">
        {!running ? (
          <button
            onClick={onRun}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-signal text-bg font-semibold hover:opacity-90 transition-opacity"
          >
            <Play size={14} strokeWidth={2} fill="currentColor" />
            Run simulation
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-alarm text-bg font-semibold hover:opacity-90 transition-opacity"
          >
            <Square size={14} strokeWidth={2} fill="currentColor" />
            Stop
          </button>
        )}
        <button
          onClick={onReset}
          disabled={running}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 text-sm border border-border transition-colors',
            running
              ? 'text-text-muted/40 cursor-not-allowed'
              : 'text-text-muted hover:text-text hover:bg-surface-2'
          )}
        >
          <RotateCcw size={12} strokeWidth={1.75} />
          Reset
        </button>
        <div className="flex-1" />
        <StatusBadge status={snapshot.status} elapsedSec={elapsedSec} />
      </div>

      {/* ───── Metrics ───── */}
      <div className="border-b border-border bg-surface/40 px-4 py-3 shrink-0 grid grid-cols-4 gap-2">
        <Metric
          icon={Activity}
          label="ITER"
          value={snapshot.metrics.iterations.toLocaleString()}
          sub="loop ticks"
        />
        <Metric
          icon={Database}
          label="SAMPLES"
          value={snapshot.metrics.samples.toLocaleString()}
          sub="logged points"
        />
        <Metric
          icon={CircleCheck}
          label="BIT P / F"
          value={
            <span>
              <span className="text-signal">{snapshot.metrics.bitPass}</span>
              <span className="text-text-muted/60 mx-0.5">/</span>
              <span className={snapshot.metrics.bitFail > 0 ? 'text-alarm' : 'text-text-muted/60'}>
                {snapshot.metrics.bitFail}
              </span>
            </span>
          }
          sub="pass / fail"
        />
        <Metric
          icon={AlertTriangle}
          label="ALARMS"
          value={String(snapshot.metrics.alarms)}
          sub={snapshot.metrics.alarms > 0 ? 'attention' : 'none'}
          tone={snapshot.metrics.alarms > 0 ? 'warn' : 'muted'}
        />
      </div>

      {/* ───── Channels ───── */}
      <div className="border-b border-border bg-surface/20 px-4 py-3 shrink-0 space-y-3">
        <ChannelSection
          label="DIGITAL OUT"
          subLabel="DO0–DO7"
          values={snapshot.channels.do}
          render={(v, i) => <BinaryCell idx={i} on={v} tone="signal" />}
        />
        <ChannelSection
          label="DIGITAL IN"
          subLabel="DI0–DI7"
          values={snapshot.channels.di}
          render={(v, i) => <BinaryCell idx={i} on={v} tone="info" />}
        />
        <ChannelSection
          label="ANALOG IN"
          subLabel="AI0–AI7"
          values={snapshot.channels.ai}
          cols={4}
          render={(v, i) => (
            <AnalogCell idx={i} prefix="AI" value={v} history={snapshot.channels.aiHistory[i] ?? []} tone="signal" />
          )}
        />
        <ChannelSection
          label="ANALOG OUT"
          subLabel="AO0–AO3"
          values={snapshot.channels.ao}
          cols={4}
          render={(v, i) => (
            <AnalogCell idx={i} prefix="AO" value={v} history={snapshot.channels.aoHistory[i] ?? []} tone="info" />
          )}
        />
      </div>

      {/* ───── Console ───── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2 border-b border-border bg-surface/60 flex items-center gap-2 shrink-0">
          <span className="overline text-[11px]">Console</span>
          <span className="text-text-muted mono text-[11px]">
            {filteredLogs.length}{filter !== 'all' && ` / ${snapshot.logs.length}`} entries
          </span>
          <div className="flex-1" />
          <FilterChip active={filter === 'all'}   onClick={() => setFilter('all')}>all</FilterChip>
          <FilterChip active={filter === 'data'}  onClick={() => setFilter('data')}>data</FilterChip>
          <FilterChip active={filter === 'event'} onClick={() => setFilter('event')}>events</FilterChip>
          <button
            onClick={() => setAutoScroll(s => !s)}
            className={cn(
              'flex items-center gap-1 px-1.5 py-0.5 text-[10px] border border-border transition-colors',
              autoScroll
                ? 'text-signal border-signal/60'
                : 'text-text-muted hover:text-text hover:bg-surface-2'
            )}
            title="Toggle auto-scroll to newest"
          >
            <Filter size={10} strokeWidth={2} />
            follow
          </button>
        </div>
        <div
          ref={consoleRef}
          className="flex-1 overflow-y-auto px-4 py-3 mono text-[12px] leading-[1.55] bg-bg"
        >
          {filteredLogs.length === 0 ? (
            <div className="text-text-muted text-center py-16 normal-case">
              <Play size={28} strokeWidth={1.5} className="mx-auto mb-3 opacity-40" />
              <div className="text-sm">Workspace ready to simulate</div>
              <div className="text-[11px] mt-1 text-text-muted/70">
                Click <span className="text-signal">Run simulation</span> — no hardware required
              </div>
            </div>
          ) : (
            filteredLogs.map((l, i) => <LogLine key={i} entry={l} />)
          )}
        </div>
      </div>
    </div>
  );
}

// ================================================================
//  Header status badge — larger, includes elapsed time
// ================================================================

function StatusBadge({ status, elapsedSec }: { status: SimSnapshot['status']; elapsedSec: number }) {
  const meta = {
    idle:    { label: 'IDLE',    dot: 'bg-text-muted',                       text: 'text-text-muted',     border: 'border-border' },
    running: { label: 'RUNNING', dot: 'bg-signal animate-pulse-signal',      text: 'text-signal',         border: 'border-signal/40' },
    stopped: { label: 'STOPPED', dot: 'bg-text-muted',                       text: 'text-text-muted',     border: 'border-border' },
    error:   { label: 'ERROR',   dot: 'bg-alarm',                            text: 'text-alarm',          border: 'border-alarm/40' },
  }[status];
  return (
    <div className={cn('flex items-center gap-2 px-2.5 py-1.5 border', meta.border)}>
      <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
      <span className={cn('mono text-xs font-semibold tracking-wider uppercase', meta.text)}>{meta.label}</span>
      {status === 'running' && (
        <span className="mono text-xs text-text-muted tabular-nums">t+{elapsedSec.toFixed(1)}s</span>
      )}
    </div>
  );
}

// ================================================================
//  Metric card — large prominent value
// ================================================================

function Metric({
  icon: Icon, label, value, sub, tone = 'signal',
}: {
  icon: any; label: string; value: React.ReactNode; sub?: string;
  tone?: 'signal' | 'warn' | 'muted';
}) {
  const valueColor =
    tone === 'warn' ? 'text-warn'
    : tone === 'muted' ? 'text-text'
    : 'text-text';
  return (
    <div className="border border-border bg-surface-2/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-text-muted overline text-[10px]">
        <Icon size={11} strokeWidth={2} />
        {label}
      </div>
      <div className={cn('mono text-xl mt-1.5 font-medium tabular-nums leading-none', valueColor)}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-text-muted/60 mt-1.5 truncate">{sub}</div>}
    </div>
  );
}

// ================================================================
//  Channel section header + grid
// ================================================================

function ChannelSection<T>({
  label, subLabel, values, render, cols = 8,
}: {
  label: string;
  subLabel: string;
  values: T[];
  render: (v: T, i: number) => React.ReactNode;
  cols?: number;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="overline text-[10px]">{label}</span>
        <span className="mono text-[10px] text-text-muted/60">{subLabel}</span>
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {values.map((v, i) => <div key={i}>{render(v, i)}</div>)}
      </div>
    </section>
  );
}

// ── Binary (DO/DI) ──
function BinaryCell({ idx, on, tone }: { idx: number; on: boolean; tone: 'signal' | 'info' }) {
  const onColor = tone === 'signal' ? 'bg-signal border-signal' : 'bg-info border-info';
  return (
    <div className="border border-border bg-surface-2/30 p-1.5 flex flex-col items-center gap-1">
      <span className="mono text-[10px] text-text-muted">{idx}</span>
      <div
        className={cn(
          'w-full h-3.5 border transition-all',
          on
            ? cn(onColor, tone === 'signal' ? 'shadow-[0_0_8px_hsl(var(--signal))]' : 'shadow-[0_0_8px_hsl(var(--info))]')
            : 'bg-surface border-border/60'
        )}
      />
      <span className={cn(
        'mono text-[10px] tabular-nums',
        on ? (tone === 'signal' ? 'text-signal font-semibold' : 'text-info font-semibold') : 'text-text-muted/40'
      )}>
        {on ? 'HIGH' : 'LOW'}
      </span>
    </div>
  );
}

// ── Analog (AI/AO) — sparkline + bigger value ──
function AnalogCell({
  idx, prefix, value, history, tone,
}: {
  idx: number;
  prefix: string;
  value: number;
  history: number[];
  tone: 'signal' | 'info';
}) {
  const stroke = tone === 'signal' ? 'hsl(160, 84%, 45%)' : 'hsl(213, 90%, 60%)';
  const valColor = value >= 0
    ? (tone === 'signal' ? 'text-signal' : 'text-info')
    : 'text-warn';
  return (
    <div className="border border-border bg-surface-2/30 p-2 flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="mono text-xs text-text-muted font-medium">{prefix}{idx}</span>
        <span className={cn('mono text-sm tabular-nums font-semibold', valColor)}>
          {value >= 0 ? '+' : ''}{value.toFixed(2)}
          <span className="text-text-muted/60 ml-1 text-[10px] font-normal">V</span>
        </span>
      </div>
      <Sparkline data={history} stroke={stroke} />
    </div>
  );
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const W = 100;
  const H = 32;
  const padded =
    data.length >= HISTORY_LEN
      ? data.slice(-HISTORY_LEN)
      : [...Array(HISTORY_LEN - data.length).fill(0), ...data];

  let min = Math.min(...padded);
  let max = Math.max(...padded);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max - min < 0.5) {
    const mid = (min + max) / 2 || 0;
    min = mid - 0.5;
    max = mid + 0.5;
  }

  const step = W / Math.max(1, HISTORY_LEN - 1);
  const pts = padded.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / (max - min)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const showZero = min < 0 && max > 0;
  const zeroY = H - ((0 - min) / (max - min)) * H;
  const areaPath = `M 0,${H} L ${pts.join(' L ')} L ${W},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8">
      <defs>
        <linearGradient id={`g-${stroke.replace(/[^a-z]/g, '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showZero && (
        <line x1={0} x2={W} y1={zeroY} y2={zeroY}
              stroke="hsl(220 10% 25%)" strokeWidth={0.5} strokeDasharray="2 2" />
      )}
      {data.length > 1 && (
        <>
          <path d={areaPath} fill={`url(#g-${stroke.replace(/[^a-z]/g, '')})`} />
          <polyline
            points={pts.join(' ')} fill="none"
            stroke={stroke} strokeWidth={1.4}
            strokeLinejoin="round" strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}

// ================================================================
//  Console filter chip
// ================================================================

function FilterChip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-0.5 mono text-[10px] border transition-colors',
        active
          ? 'bg-signal/15 text-signal border-signal/60'
          : 'text-text-muted hover:text-text hover:bg-surface-2 border-border'
      )}
    >
      {children}
    </button>
  );
}

// ================================================================
//  Console line — larger, better hierarchy
// ================================================================

function LogLine({ entry }: { entry: LogEntry }) {
  const toneClass = {
    info:  'text-text-muted',
    data:  'text-text',
    warn:  'text-warn',
    alarm: 'text-alarm font-medium',
    bit:   'text-signal font-medium',
  }[entry.level];
  const sourceClass = {
    info:  'text-text-muted/70',
    data:  'text-info/80',
    warn:  'text-warn',
    alarm: 'text-alarm',
    bit:   'text-signal',
  }[entry.level];
  return (
    <div className="flex gap-3 hover:bg-surface-2/30 px-1 -mx-1 py-0.5">
      <span className="text-text-muted/50 shrink-0 w-16 tabular-nums">
        t+{(entry.t / 1000).toFixed(2)}s
      </span>
      <span className={cn('shrink-0 w-36 truncate', sourceClass)}>{entry.source}</span>
      <span className={cn('flex-1 break-all', toneClass)}>{entry.message}</span>
    </div>
  );
}
