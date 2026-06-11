'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Save, Rocket, Play, Square, ChevronDown,
  HelpCircle, FileCode2, Check, Sun, Moon, Monitor, Cpu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Template } from '@/lib/templates';
import type { ThemeMode } from '@/lib/theme';
import type { TargetSpec } from '@/lib/targets/types';

interface TopBarProps {
  workspaceName: string;
  unsaved: boolean;
  running: boolean;
  templates: Template[];
  activeTemplateId: string;
  targets: TargetSpec[];
  activeTargetId: string;
  themeMode: ThemeMode;
  onSave: () => void;
  onDeploy: () => void;
  onRun: () => void;
  onStop: () => void;
  onPickTemplate: (id: string) => void;
  onPickTarget: (id: string) => void;
  onHelp: () => void;
  onPickTheme: (m: ThemeMode) => void;
}

export function TopBar({
  workspaceName,
  unsaved,
  running,
  templates,
  activeTemplateId,
  targets,
  activeTargetId,
  themeMode,
  onSave,
  onDeploy,
  onRun,
  onStop,
  onPickTemplate,
  onPickTarget,
  onHelp,
  onPickTheme,
}: TopBarProps) {
  return (
    <header className="h-14 border-b border-border bg-surface px-4 flex items-center justify-between shrink-0 relative z-30">
      {/* Left: brand + templates */}
      <div className="flex items-center gap-4 min-w-[280px]">
        <div className="flex items-baseline gap-2">
          <span className="mono font-semibold text-text tracking-tight text-base">Nexys</span>
          <span className="text-text-muted text-sm">· Blockly Studio</span>
        </div>
        <span className="h-5 w-px bg-border" />
        <TemplateMenu
          templates={templates}
          activeId={activeTemplateId}
          onPick={onPickTemplate}
        />
        <TargetMenu
          targets={targets}
          activeId={activeTargetId}
          onPick={onPickTarget}
        />
      </div>

      {/* Center: workspace identity */}
      <div className="flex items-center gap-3">
        <span className="overline">Workspace</span>
        <span className="text-text font-medium mono text-sm">{workspaceName}</span>
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            unsaved ? 'bg-warn' : 'bg-signal animate-pulse-signal'
          )}
          aria-label={unsaved ? 'unsaved changes' : 'saved'}
        />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 min-w-[320px] justify-end">
        <ThemeToggle mode={themeMode} onPick={onPickTheme} />
        <button
          onClick={onHelp}
          className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          title="Quick start guide"
          aria-label="Help"
        >
          <HelpCircle size={15} strokeWidth={1.75} />
        </button>
        <span className="h-5 w-px bg-border mx-0.5" />
        {!running ? (
          <button
            onClick={onRun}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-signal/60 text-signal hover:bg-signal hover:text-bg transition-colors"
            title="Run virtually — no hardware needed"
          >
            <Play size={12} strokeWidth={2} fill="currentColor" />
            Run
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-alarm/60 text-alarm hover:bg-alarm hover:text-bg transition-colors"
            title="Stop simulation"
          >
            <Square size={12} strokeWidth={2} fill="currentColor" />
            Stop
          </button>
        )}
        <button
          onClick={onSave}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
        >
          <Save size={13} strokeWidth={1.75} />
          Save
        </button>
        <button
          onClick={onDeploy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-signal text-bg font-medium hover:opacity-90 transition-opacity"
        >
          <Rocket size={13} strokeWidth={2} />
          Deploy
        </button>
      </div>
    </header>
  );
}

function TargetMenu({
  targets,
  activeId,
  onPick,
}: {
  targets: TargetSpec[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const active = targets.find(t => t.id === activeId);
  const ActiveIcon = active?.icon ?? Cpu;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border transition-colors',
          open ? 'bg-surface-2 text-text' : 'text-text-muted hover:text-text hover:bg-surface-2'
        )}
        title="Compile target — language/framework changes per board"
      >
        <ActiveIcon size={11} strokeWidth={1.75} />
        <span className="overline normal-case tracking-normal text-[11px]">Target</span>
        <span className="text-text mono text-[11px]">{active?.shortName ?? '?'}</span>
        <ChevronDown size={10} strokeWidth={2} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && mounted && pos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 2147483000 }}
          className="w-72 bg-surface border border-border shadow-xl py-1 animate-fade-in"
        >
          <div className="overline px-3 py-1.5 text-[10px]">Compile target</div>
          <div className="h-px bg-border mb-1" />
          {targets.map(t => {
            const sel = t.id === activeId;
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => { onPick(t.id); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs transition-colors flex gap-2 items-start',
                  sel ? 'bg-surface-2' : 'hover:bg-surface-2'
                )}
              >
                <Icon size={13} strokeWidth={1.75} className={cn('mt-0.5 shrink-0', sel ? 'text-signal' : 'text-text-muted')} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="mono text-text font-medium">{t.name}</span>
                    {sel && <Check size={11} strokeWidth={2.5} className="text-signal" />}
                  </div>
                  <div className="text-text-muted mt-0.5 text-[11px] leading-snug">{t.description}</div>
                  <div className="overline text-[9px] mt-1 text-text-muted/60">
                    {t.language} · {t.fileExt}
                  </div>
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}

function ThemeToggle({
  mode,
  onPick,
}: {
  mode: ThemeMode;
  onPick: (m: ThemeMode) => void;
}) {
  const opts: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: 'light',  icon: Sun,     label: 'Light' },
    { value: 'dark',   icon: Moon,    label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ];
  return (
    <div
      className="inline-flex border border-border"
      role="radiogroup"
      aria-label="Color theme"
    >
      {opts.map(o => {
        const sel = mode === o.value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={sel}
            title={o.label}
            onClick={() => onPick(o.value)}
            className={cn(
              'px-2 py-1 transition-colors',
              sel
                ? 'bg-surface-2 text-signal'
                : 'text-text-muted hover:text-text hover:bg-surface-2'
            )}
          >
            <Icon size={13} strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}

function TemplateMenu({
  templates,
  activeId,
  onPick,
}: {
  templates: Template[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Reposition under the button when opening / on resize / on scroll
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Click-outside (account for portal: check both anchor and menu)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [open]);

  const active = templates.find(t => t.id === activeId);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 text-xs border border-border transition-colors',
          open ? 'bg-surface-2 text-text' : 'text-text-muted hover:text-text hover:bg-surface-2'
        )}
      >
        <FileCode2 size={11} strokeWidth={1.75} />
        <span className="overline normal-case tracking-normal text-[11px]">Templates</span>
        <span className="text-text mono text-[11px]">{active?.name ?? 'custom'}</span>
        <ChevronDown size={10} strokeWidth={2} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && mounted && pos && createPortal(
        <div
          ref={menuRef}
          // Render to <body> so we escape any stacking context (Blockly's
          // toolbox uses high z-indexes within the workspace area).
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 2147483000 }}
          className="w-72 bg-surface border border-border shadow-xl py-1 animate-fade-in"
        >
          <div className="overline px-3 py-1.5 text-[10px]">Sample workspaces</div>
          <div className="h-px bg-border mb-1" />
          {templates.map(t => {
            const sel = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => { onPick(t.id); setOpen(false); }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs transition-colors',
                  sel ? 'bg-surface-2' : 'hover:bg-surface-2'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="mono text-text font-medium">{t.name}</span>
                  {sel && <Check size={11} strokeWidth={2.5} className="text-signal" />}
                </div>
                <div className="text-text-muted mt-0.5 text-[11px] leading-snug">
                  {t.description}
                </div>
                <div className="overline text-[9px] mt-1 text-text-muted/60">
                  {t.tag}
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
}
