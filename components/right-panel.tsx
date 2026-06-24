'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CodePreview } from './code-preview';
import { DeviceList } from './device-list';
import { RuntimePanel } from './runtime-panel';
import { HardwarePanel } from './hardware-panel';
import type { Device } from '@/lib/types';
import type { SimSnapshot } from '@/lib/simulator/types';
import type { Bindings, Inputs } from '@/lib/hardware/devices';
import type { WiringLayout } from '@/lib/hardware/wiring-state';
import { Code2, HardDrive, Activity, Plug } from 'lucide-react';

type Tab = 'code' | 'runtime' | 'hardware' | 'devices';

interface RightPanelProps {
  code: string;
  devices: Device[];
  selectedDeviceId: string;
  onSelectDevice: (id: string) => void;

  snapshot: SimSnapshot;
  onRun: () => void;
  onStop: () => void;
  onReset: () => void;

  /** When the page wants to bring Runtime into focus (e.g. after Run clicked from top bar). */
  forcedTab?: Tab | null;
  onTabConsumed?: () => void;

  theme?: 'light' | 'dark';

  codeRegenCount?: number;
  codeRegenAt?: string | null;

  editedCode: string | null;
  onCommitEdit: (next: string | null) => void;
  codeLanguage?: 'python' | 'cpp';
  targetName?: string;
  targetId?: string;

  bindings: Bindings;
  inputs: Inputs;
  onInputChange: (channel: string, value: number | boolean) => void;
  layout: WiringLayout;
  onLayoutChange: (next: WiringLayout) => void;

  width: number;
}

export function RightPanel({
  code,
  devices,
  selectedDeviceId,
  onSelectDevice,
  snapshot,
  onRun,
  onStop,
  onReset,
  forcedTab,
  onTabConsumed,
  theme = 'dark',
  codeRegenCount = 0,
  codeRegenAt,
  editedCode,
  onCommitEdit,
  codeLanguage = 'python',
  targetName,
  targetId = 'ni_pxie',
  bindings,
  inputs,
  onInputChange,
  layout,
  onLayoutChange,
  width,
}: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('code');

  // honor external tab requests (e.g. Run pressed from top bar)
  useEffect(() => {
    if (forcedTab && forcedTab !== tab) {
      setTab(forcedTab);
      onTabConsumed?.();
    }
  }, [forcedTab, tab, onTabConsumed]);

  const codeLines = code.split('\n').length;
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const running = snapshot.status === 'running';
  const boundCount = Object.keys(bindings).length;

  return (
    <aside
      className="border-l border-border bg-surface shrink-0 flex flex-col"
      style={{ width: `${width}px` }}
    >
      {/* Tabs */}
      <div className="border-b border-border flex shrink-0">
        <TabButton
          active={tab === 'code'}
          onClick={() => setTab('code')}
          icon={Code2}
          label="Code"
          badge={`${codeLines} L`}
        />
        <TabButton
          active={tab === 'runtime'}
          onClick={() => setTab('runtime')}
          icon={Activity}
          label="Runtime"
          badge={running ? '● live' : `${snapshot.logs.length}`}
          accent={running ? 'signal' : undefined}
        />
        <TabButton
          active={tab === 'hardware'}
          onClick={() => setTab('hardware')}
          icon={Plug}
          label="Wiring"
          badge={`${boundCount}`}
        />
        <TabButton
          active={tab === 'devices'}
          onClick={() => setTab('devices')}
          icon={HardDrive}
          label="Devices"
          badge={`${onlineCount}/${devices.length}`}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {tab === 'code' && (
          <CodePreview
            code={code}
            theme={theme}
            editedCode={editedCode}
            onCommitEdit={onCommitEdit}
            language={codeLanguage}
            targetName={targetName}
          />
        )}
        {tab === 'runtime' && (
          <RuntimePanel
            snapshot={snapshot}
            onRun={onRun}
            onStop={onStop}
            onReset={onReset}
          />
        )}
        {tab === 'hardware' && (
          <HardwarePanel
            snapshot={snapshot}
            layout={layout}
            inputs={inputs}
            onLayoutChange={onLayoutChange}
            onInputChange={onInputChange}
            bindings={bindings}
            targetId={targetId}
            targetName={targetName ?? targetId}
          />
        )}
        {tab === 'devices' && (
          <DeviceList
            devices={devices}
            selectedId={selectedDeviceId}
            onSelect={onSelectDevice}
          />
        )}
      </div>

      {/* Footer meta */}
      <div className="border-t border-border px-4 py-2 shrink-0 flex items-center justify-between text-[10px] text-text-muted">
        {tab === 'code' && (
          <>
            <span className="overline">
              {codeRegenAt
                ? `Regen #${codeRegenCount} · ${new Date(codeRegenAt).toLocaleTimeString()}`
                : 'Read-only · auto-generated'}
            </span>
            <span className="mono">python 3.11 · nexys-sdk</span>
          </>
        )}
        {tab === 'runtime' && (
          <>
            <span className="overline">Virtual runtime · no hardware</span>
            <span className="mono">nexys-sim 0.1</span>
          </>
        )}
        {tab === 'hardware' && (
          <>
            <span className="overline">Virtual wiring · click cell to bind</span>
            <span className="mono">{boundCount} bound</span>
          </>
        )}
        {tab === 'devices' && (
          <>
            <span className="overline">Mock devices · phase 1</span>
            <span className="mono">{devices.length} registered</span>
          </>
        )}
      </div>
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Code2;
  label: string;
  badge: string;
  accent?: 'signal';
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 px-3 py-3 text-sm flex items-center justify-center gap-1.5 transition-colors relative',
        active
          ? 'text-text bg-surface'
          : 'text-text-muted hover:text-text hover:bg-surface-2'
      )}
    >
      <Icon size={13} strokeWidth={1.75} />
      <span className="font-medium">{label}</span>
      <span
        className={cn(
          'mono text-[10px]',
          accent === 'signal' ? 'text-signal' : active ? 'text-signal' : 'text-text-muted'
        )}
      >
        {badge}
      </span>
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal" />
      )}
    </button>
  );
}
