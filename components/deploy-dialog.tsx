'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Device } from '@/lib/types';
import type { TargetSpec } from '@/lib/targets/types';
import { getPinMap } from '@/lib/targets/pinmap';
import { findTarget } from '@/lib/targets';
import {
  X, Rocket, ChevronRight, ChevronDown, CheckCircle2, Wifi, WifiOff,
  AlertTriangle, Cable,
} from 'lucide-react';

interface DeployDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devices: Device[];
  initialDeviceId: string;
  workspaceName: string;
  workspaceJson: unknown;
  pythonCode: string;
  /** Active compile target — used for compatibility check + pin map. */
  target: TargetSpec;
}

export function DeployDialog({
  open,
  onOpenChange,
  devices,
  initialDeviceId,
  workspaceName,
  workspaceJson,
  pythonCode,
  target,
}: DeployDialogProps) {
  const [selectedId, setSelectedId] = useState(initialDeviceId);
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      setSelectedId(initialDeviceId);
      setJsonExpanded(false);
      setPinmapExpanded(false);
      setDeploying(false);
      setProgress(0);
    }
  }, [open, initialDeviceId]);

  const [pinmapExpanded, setPinmapExpanded] = useState(false);

  const selected = devices.find(d => d.id === selectedId) ?? devices[0];
  // target/device compatibility: device.targetId must match active compile target
  const incompatible = !!selected && selected.targetId !== target.id;
  const canDeploy = selected?.status === 'online' && !deploying && !incompatible;
  const selectedTargetName = selected ? (findTarget(selected.targetId)?.name ?? selected.targetId) : '';

  const channelSummary = useMemo(() => summarizeChannels(pythonCode), [pythonCode]);
  const pinMap = useMemo(
    () => getPinMap(target.id, channelSummary.length ? channelSummary : undefined),
    [target.id, channelSummary]
  );

  const prettyJson = useMemo(() => {
    try {
      return JSON.stringify(workspaceJson, null, 2);
    } catch {
      return '{}';
    }
  }, [workspaceJson]);

  const handleDeploy = () => {
    if (!canDeploy) return;
    setDeploying(true);
    setProgress(0);

    const start = Date.now();
    const duration = 3000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          setDeploying(false);
          onOpenChange(false);
          toast.success('Deployed successfully', {
            description: `${workspaceName}${target.fileExt} → ${selected.name} (${target.shortName})`,
            duration: 4000,
          });
        }, 300);
      }
    }, 50);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !deploying && onOpenChange(o)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-bg/70 backdrop-blur-[2px] z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[min(720px,calc(100vw-32px))] max-h-[calc(100vh-64px)]',
            'bg-surface border border-border shadow-2xl flex flex-col animate-fade-in',
            'focus:outline-none'
          )}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <Dialog.Title className="text-base font-medium text-text">
                Deploy workspace to device
              </Dialog.Title>
              <Dialog.Description className="text-xs text-text-muted mt-0.5">
                Workspace JSON will be transferred to the selected unit and validated before execution.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="p-1 text-text-muted hover:text-text disabled:opacity-30"
              disabled={deploying}
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            {/* Selected device card */}
            <section>
              <div className="overline mb-2">Target Device</div>
              <div className="grid grid-cols-1 gap-2">
                {devices.map(d => {
                  const isSel = d.id === selectedId;
                  const devMismatch = d.targetId !== target.id;
                  return (
                    <button
                      key={d.id}
                      disabled={d.status === 'offline' || deploying}
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        'text-left p-3 border transition-colors flex items-start gap-3',
                        isSel
                          ? (devMismatch ? 'border-warn bg-surface-2' : 'border-signal bg-surface-2')
                          : 'border-border hover:bg-surface-2',
                        d.status === 'offline' && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {d.status === 'online' ? (
                          <Wifi size={14} strokeWidth={1.75} className="text-signal" />
                        ) : (
                          <WifiOff size={14} strokeWidth={1.75} className="text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text">{d.name}</span>
                          <span
                            className={cn(
                              'mono text-[9px] px-1 py-0.5 border',
                              devMismatch ? 'border-warn/50 text-warn' : 'border-signal/50 text-signal'
                            )}
                          >
                            {findTarget(d.targetId)?.shortName ?? d.targetId}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted mt-0.5 uppercase tracking-overline">
                          {d.mode} · {d.status} · {d.id}
                        </div>
                      </div>
                      {isSel && !devMismatch && (
                        <CheckCircle2 size={14} strokeWidth={2} className="text-signal mt-0.5" />
                      )}
                      {isSel && devMismatch && (
                        <AlertTriangle size={14} strokeWidth={2} className="text-warn mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Compatibility banner */}
              {incompatible && (
                <div className="mt-2 flex items-start gap-2 p-2.5 border border-warn/50 bg-warn/10 text-warn">
                  <AlertTriangle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
                  <div className="text-[11px] leading-relaxed">
                    <span className="font-medium">타겟 불일치</span> — 현재 컴파일 타겟은{' '}
                    <span className="mono">{target.name}</span>인데, 선택한 디바이스는{' '}
                    <span className="mono">{selectedTargetName}</span> 펌웨어를 실행합니다.
                    상단 Target 메뉴를 <span className="mono">{selectedTargetName}</span>로 바꾸거나
                    호환 디바이스를 선택하세요.
                  </div>
                </div>
              )}
            </section>

            {/* Channel usage summary */}
            <section>
              <div className="overline mb-2">Channel Usage</div>
              <div className="p-3 bg-surface-2 border border-border mono text-[11px] text-text">
                {channelSummary.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {channelSummary.map(c => (
                      <span
                        key={c}
                        className="px-1.5 py-0.5 border border-border bg-surface text-text-muted"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-text-muted">No channels referenced</span>
                )}
              </div>
            </section>

            {/* Pin map (collapsible) — target-specific channel → pin */}
            <section>
              <button
                onClick={() => setPinmapExpanded(v => !v)}
                className="w-full flex items-center justify-between overline mb-2 hover:text-text transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Cable size={11} strokeWidth={2} />
                  Pin Map · {target.name}
                </span>
                {pinmapExpanded ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
              </button>
              {pinmapExpanded ? (
                <div className="border border-border bg-bg p-2 grid grid-cols-2 gap-x-4 gap-y-1 max-h-56 overflow-auto">
                  {pinMap.map(e => (
                    <div key={e.channel} className="flex items-center justify-between mono text-[11px]">
                      <span className="text-text-muted">{e.channel}</span>
                      <span className="text-text">
                        {e.pin}
                        {e.note && <span className="text-text-muted/50 ml-1 text-[9px]">{e.note}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[11px] text-text-muted mono">
                  {pinMap.length} channels mapped to {target.framework}
                </div>
              )}
            </section>

            {/* JSON preview (collapsible) */}
            <section>
              <button
                onClick={() => setJsonExpanded(v => !v)}
                className="w-full flex items-center justify-between overline mb-2 hover:text-text transition-colors"
              >
                <span>Workspace JSON Payload</span>
                {jsonExpanded ? (
                  <ChevronDown size={12} strokeWidth={2} />
                ) : (
                  <ChevronRight size={12} strokeWidth={2} />
                )}
              </button>
              {jsonExpanded && (
                <pre
                  className={cn(
                    'mono text-[11px] text-text-muted bg-bg border border-border',
                    'p-3 overflow-auto max-h-56 whitespace-pre'
                  )}
                >
                  {prettyJson}
                </pre>
              )}
              {!jsonExpanded && (
                <div className="text-[11px] text-text-muted mono">
                  {prettyJson.length.toLocaleString()} bytes · schema 1.0
                </div>
              )}
            </section>
          </div>

          {/* Progress bar overlay */}
          {deploying && (
            <div className="px-5 py-3 border-t border-border bg-surface-2 shrink-0">
              <div className="flex items-center justify-between mb-2 text-[11px]">
                <span className="overline text-warn">Deploying…</span>
                <span className="mono text-text-muted">{Math.round(progress)}%</span>
              </div>
              <div className="h-[3px] bg-border overflow-hidden">
                <div
                  className="h-full bg-warn transition-[width] duration-100 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mono text-[10px] text-text-muted mt-2">
                {progress < 40
                  ? `→ cross-compiling ${target.language} for ${target.shortName}`
                  : progress < 80
                  ? '→ flashing firmware · validating channel map'
                  : '→ launching runtime'}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={() => onOpenChange(false)}
              disabled={deploying}
              className="px-3 py-1.5 text-sm border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={!canDeploy}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-opacity',
                canDeploy
                  ? 'bg-signal text-bg hover:opacity-90'
                  : 'bg-border text-text-muted cursor-not-allowed'
              )}
            >
              <Rocket size={13} strokeWidth={2} />
              Deploy now
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function summarizeChannels(python: string): string[] {
  const used = new Set<string>();
  const re = /'(A[IO]\d|D[IO]\d)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(python)) !== null) {
    used.add(m[1]);
  }
  return Array.from(used).sort();
}
