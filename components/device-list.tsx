'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Device, DeviceStatus } from '@/lib/types';
import { Cpu, Wifi, WifiOff, Loader2 } from 'lucide-react';

interface DeviceListProps {
  devices: Device[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const STATUS_META: Record<DeviceStatus, { label: string; dot: string; ring: string; icon: typeof Wifi }> = {
  online: { label: 'Online', dot: 'bg-signal', ring: 'animate-pulse-signal', icon: Wifi },
  offline: { label: 'Offline', dot: 'bg-text-muted', ring: '', icon: WifiOff },
  deploying: { label: 'Deploying…', dot: 'bg-warn', ring: 'animate-pulse', icon: Loader2 },
};

export function DeviceList({ devices, selectedId, onSelect }: DeviceListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <ul className="divide-y divide-border">
        {devices.map(d => {
          const meta = STATUS_META[d.status];
          const Icon = meta.icon;
          const selected = d.id === selectedId;
          return (
            <li key={d.id}>
              <button
                onClick={() => onSelect(d.id)}
                className={cn(
                  'w-full text-left px-4 py-3 transition-colors relative',
                  'hover:bg-surface-2',
                  selected && 'bg-surface-2'
                )}
              >
                {selected && (
                  <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-signal" />
                )}

                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    <Icon
                      size={14}
                      strokeWidth={1.75}
                      className={cn(
                        d.status === 'online' && 'text-signal',
                        d.status === 'offline' && 'text-text-muted',
                        d.status === 'deploying' && 'text-warn animate-spin'
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-text font-medium truncate">{d.name}</span>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.dot, meta.ring)} />
                    </div>
                    <div className="mono text-[10px] text-text-muted mt-0.5 truncate">{d.id}</div>

                    {d.description && (
                      <p className="text-[11px] text-text-muted mt-1.5 leading-relaxed line-clamp-2">
                        {d.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <Cpu size={10} strokeWidth={1.5} />
                        <span className="uppercase tracking-overline">{d.mode}</span>
                      </span>
                      <span className="text-border">·</span>
                      <span className="mono">
                        {d.channels.ai}AI · {d.channels.ao}AO · {d.channels.di}DI · {d.channels.do}DO
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {d.modulesInstalled.slice(0, 2).map(mod => (
                          <span
                            key={mod}
                            className="text-[9px] px-1.5 py-0.5 border border-border text-text-muted mono"
                          >
                            {mod}
                          </span>
                        ))}
                        {d.modulesInstalled.length > 2 && (
                          <span className="text-[9px] px-1.5 py-0.5 text-text-muted">
                            +{d.modulesInstalled.length - 2}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-muted mono shrink-0">
                        {formatRelativeTime(d.lastSeen)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
