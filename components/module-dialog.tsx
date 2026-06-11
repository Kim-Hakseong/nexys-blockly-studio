'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Combine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** number of blocks captured in the current selection */
  blockCount: number;
  onConfirm: (name: string) => void;
}

export function ModuleDialog({ open, onOpenChange, blockCount, onConfirm }: ModuleDialogProps) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-bg/70 backdrop-blur-[2px] z-40 animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[min(440px,calc(100vw-32px))]',
            'bg-surface border border-border shadow-2xl flex flex-col animate-fade-in focus:outline-none'
          )}
        >
          <div className="px-5 py-4 border-b border-border flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Combine size={16} strokeWidth={1.75} className="text-signal" />
              <div>
                <Dialog.Title className="text-base font-medium text-text">Make Module</Dialog.Title>
                <Dialog.Description className="text-xs text-text-muted mt-0.5">
                  선택한 {blockCount}개 블록을 재사용 가능한 모듈(Sub-VI)로 묶습니다.
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close className="p-1 text-text-muted hover:text-text" aria-label="Close">
              <X size={16} strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          <div className="px-5 py-4 space-y-2">
            <label className="overline text-[10px]">Module name</label>
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="예: BIT_Pulse"
              className="w-full bg-surface-2 border border-border px-3 py-2 text-sm text-text mono focus:outline-none focus:border-signal"
            />
            <p className="text-[11px] text-text-muted leading-relaxed">
              모듈은 Modules 카테고리에 단일 블록으로 추가되어 여러 번 드래그해 재사용할 수 있습니다.
              코드는 공유 함수 1개 + 호출들로 생성됩니다.
            </p>
          </div>

          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="px-3 py-1.5 text-sm border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!name.trim()}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-opacity',
                name.trim() ? 'bg-signal text-bg hover:opacity-90' : 'bg-border text-text-muted cursor-not-allowed'
              )}
            >
              <Combine size={13} strokeWidth={2} />
              Create module
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
