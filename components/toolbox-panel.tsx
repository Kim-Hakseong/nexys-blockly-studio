'use client';

import { cn } from '@/lib/utils';
import { Shield, Zap, Activity, Menu, ChevronLeft, ChevronRight } from 'lucide-react';

type ModuleId = 'defense' | 'voltage' | 'vibration';

interface ToolboxPanelProps {
  activeModule: ModuleId;
  onModuleChange?: (m: ModuleId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const MODULES: { id: ModuleId; label: string; icon: typeof Shield; available: boolean }[] = [
  { id: 'defense', label: 'Defense', icon: Shield, available: true },
  { id: 'voltage', label: 'Voltage', icon: Zap, available: false },
  { id: 'vibration', label: 'Vibration', icon: Activity, available: false },
];

const CATEGORIES = [
  { name: 'Channels',          desc: 'AI · AO · DI · DO · Sensors', color: 'bg-signal',     items: 5 },
  { name: 'Timing',            desc: 'Loop · Delay · Wait · Repeat', color: 'bg-warn',      items: 4 },
  { name: 'Signal Processing', desc: 'Scale · RMS · LPF · Threshold', color: 'bg-info',     items: 4 },
  { name: 'Logic',             desc: 'If · Compare · Boolean',       color: 'bg-text-muted', items: 2 },
  { name: 'Output',            desc: 'TDMS · MQTT · Alarm · BIT',    color: 'bg-info',      items: 4 },
];

export function ToolboxPanel({ activeModule, onModuleChange, collapsed, onToggleCollapse }: ToolboxPanelProps) {
  if (collapsed) {
    return (
      <aside className="w-9 border-r border-border bg-surface shrink-0 flex flex-col items-center py-2 gap-2">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <Menu size={15} strokeWidth={1.75} />
        </button>
        <div className="w-full h-px bg-border" />
        {/* category color dots as vertical preview */}
        <div className="flex flex-col gap-2 mt-1">
          {CATEGORIES.map(c => (
            <span
              key={c.name}
              className={cn('w-2 h-2 rounded-full', c.color)}
              title={c.name}
            />
          ))}
        </div>
        <div className="flex-1" />
        <button
          onClick={onToggleCollapse}
          className="p-1 text-text-muted/40 hover:text-text hover:bg-surface-2 transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight size={12} strokeWidth={1.75} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 border-r border-border bg-surface shrink-0 flex flex-col overflow-hidden">
      {/* Header with collapse toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <button
          onClick={onToggleCollapse}
          className="p-1 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <Menu size={14} strokeWidth={1.75} />
        </button>
        <span className="overline text-[10px]">Sidebar</span>
        <button
          onClick={onToggleCollapse}
          className="p-1 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft size={13} strokeWidth={1.75} />
        </button>
      </div>

      {/* Module selector */}
      <div className="p-4 border-b border-border">
        <div className="overline mb-2">Module Mode</div>
        <div className="grid grid-cols-3 gap-1">
          {MODULES.map(m => {
            const Icon = m.icon;
            const isActive = m.id === activeModule;
            return (
              <button
                key={m.id}
                disabled={!m.available}
                onClick={() => m.available && onModuleChange?.(m.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 px-1 border text-[11px] transition-colors',
                  isActive
                    ? 'border-signal bg-surface-2 text-signal'
                    : 'border-border text-text-muted',
                  m.available
                    ? 'hover:bg-surface-2 hover:text-text cursor-pointer'
                    : 'opacity-30 cursor-not-allowed'
                )}
                title={m.available ? m.label : `${m.label} (Phase 2)`}
              >
                <Icon size={14} strokeWidth={1.75} />
                <span className="font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="overline mt-3 text-text-muted">8 AI · 4 AO · 8 DI · 8 DO</div>
      </div>

      {/* Categories — visual reference (real toolbox is in Blockly) */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="overline mb-3">Block Catalog</div>
        <ul className="space-y-2">
          {CATEGORIES.map(c => (
            <li key={c.name} className="group">
              <div className="flex items-center gap-2.5 py-1.5">
                <span className={cn('w-2 h-2 rounded-full shrink-0', c.color)} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text font-medium leading-tight">{c.name}</div>
                  <div className="overline mt-0.5 normal-case tracking-normal text-[10px] text-text-muted truncate">
                    {c.desc}
                  </div>
                </div>
                <span className="mono text-[10px] text-text-muted/70">{c.items}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer tip */}
      <div className="p-4 border-t border-border">
        <div className="overline mb-1.5">Tip</div>
        <p className="text-text-muted text-[11px] leading-relaxed">
          블록은 워크스페이스의 카테고리 트레이에서 드래그합니다.
          좌측 트레이를 클릭해 펼친 뒤 끌어다 놓으세요.
        </p>
      </div>
    </aside>
  );
}
