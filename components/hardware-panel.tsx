'use client';

import { useMemo } from 'react';
import { Plug, Trash2, RotateCcw } from 'lucide-react';
import type { Bindings, Inputs } from '@/lib/hardware/devices';
import type { SimSnapshot } from '@/lib/simulator/types';
import { EMPTY_LAYOUT, DEFAULT_LAYOUT, type WiringLayout } from '@/lib/hardware/wiring-state';
import { WiringCanvas } from './wiring-canvas';
import { toast } from 'sonner';

interface HardwarePanelProps {
  snapshot: SimSnapshot;
  layout: WiringLayout;
  inputs: Inputs;
  onLayoutChange: (next: WiringLayout) => void;
  onInputChange: (channel: string, value: number | boolean) => void;
  bindings: Bindings;
  targetId: string;
  targetName: string;
}

export function HardwarePanel({
  snapshot, layout, inputs, onLayoutChange, onInputChange, bindings, targetId, targetName,
}: HardwarePanelProps) {
  const boundCount = useMemo(() => Object.keys(bindings).length, [bindings]);

  const handleClear = () => {
    if (layout.devices.length === 0 && layout.wires.length === 0) return;
    onLayoutChange(EMPTY_LAYOUT);
    toast.success('Wiring cleared', {
      description: 'All devices and wires removed.',
      duration: 1800,
    });
  };

  const handleResetDefault = () => {
    onLayoutChange(DEFAULT_LAYOUT);
    toast.success('Reset to default wiring', {
      description: 'BIT_Sequence_v3 demo layout restored.',
      duration: 1800,
    });
  };

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="border-b border-border bg-surface px-3 py-2 shrink-0 flex items-center gap-2">
        <Plug size={13} strokeWidth={1.75} className="text-signal" />
        <span className="text-sm font-medium text-text">Virtual Wiring</span>
        <span className="text-[10px] mono text-text-muted">{boundCount} wires</span>
        <span className="mono text-[10px] px-1.5 py-0.5 border border-border text-signal">{targetName}</span>
        <div className="flex-1" />
        <button
          onClick={handleResetDefault}
          className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-text-muted hover:text-text hover:bg-surface-2 transition-colors border border-border"
          title="Reset to BIT_Sequence_v3 default wiring"
        >
          <RotateCcw size={10} strokeWidth={1.75} />
          Default
        </button>
        <button
          onClick={handleClear}
          className="flex items-center gap-1 px-1.5 py-1 text-[10px] text-text-muted hover:text-alarm hover:bg-alarm/10 transition-colors border border-border"
          title="Remove all devices and wires"
        >
          <Trash2 size={10} strokeWidth={1.75} />
          Clear
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <WiringCanvas
          layout={layout}
          snapshot={snapshot}
          inputs={inputs}
          onLayoutChange={onLayoutChange}
          onInputChange={onInputChange}
          targetId={targetId}
        />
      </div>
    </div>
  );
}
