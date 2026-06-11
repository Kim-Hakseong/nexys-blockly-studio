'use client';

import { cn, formatRelativeTime } from '@/lib/utils';
import type { Device } from '@/lib/types';

interface StatusBarProps {
  mode: string;
  device: Device;
  unsaved: boolean;
  lastChangeAt: string | null;
}

export function StatusBar({ mode, device, unsaved, lastChangeAt }: StatusBarProps) {
  const channels = device.channels;
  const channelSummary = `${channels.ai} AI · ${channels.ao} AO · ${channels.di} DI · ${channels.do} DO`;

  return (
    <footer className="h-7 border-t border-border bg-surface px-4 flex items-center justify-between text-xs text-text-muted shrink-0">
      <div className="flex items-center gap-5">
        <span>
          <span className="overline mr-1.5">Mode</span>
          <span className="text-text">{mode}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="overline mr-1.5">Channels</span>
          <span className="mono text-text">{channelSummary}</span>
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="overline mr-1.5">Device</span>
          <span className="text-text">{device.name}</span>
        </span>
      </div>

      <div className="flex items-center gap-2">
        {lastChangeAt && (
          <span className="mono text-text-muted">
            edited {formatRelativeTime(lastChangeAt)}
          </span>
        )}
        <span className="text-border">|</span>
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            unsaved ? 'bg-warn' : 'bg-signal'
          )}
        />
        <span>{unsaved ? 'Unsaved' : 'Saved'}</span>
      </div>
    </footer>
  );
}
