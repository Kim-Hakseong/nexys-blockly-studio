'use client';

import * as Dialog from '@radix-ui/react-dialog';
import {
  X, MousePointer2, Code2, Play, Rocket, FileCode2,
  Sparkles, Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTryDemo: () => void;
}

const STEPS = [
  {
    icon: MousePointer2,
    title: '블록을 끌어다 놓아 워크스페이스를 구성',
    body: '좌측 카테고리(Channels · Timing · Signal · Logic · Output · Functions)에서 원하는 블록을 가운데 작업 영역으로 드래그하세요. 코딩 지식 없이 계측 시퀀스를 조립할 수 있습니다.',
    tone: 'signal' as const,
  },
  {
    icon: Code2,
    title: 'Python 코드가 실시간 생성',
    body: '우측 Code 탭에서 블록과 1:1로 대응되는 nexys SDK Python 코드가 자동 생성됩니다. loop_every 블록은 별도 함수로 분리되어 가독성이 높습니다.',
    tone: 'info' as const,
  },
  {
    icon: Play,
    title: '하드웨어 없이 로컬 시뮬레이션',
    body: '상단 Run 버튼을 누르면 워크스페이스를 가상 런타임에서 즉시 실행합니다. AI 채널은 사인파 + 노이즈로, 센서는 현실적인 값으로 시뮬레이션됩니다. 우측 Runtime 탭에서 로그·채널 상태를 확인하세요.',
    tone: 'signal' as const,
  },
  {
    icon: Rocket,
    title: '실제 디바이스로 Deploy',
    body: '검증된 워크스페이스는 Deploy 버튼으로 라즈베리파이 기반 Nexys 계측 모듈에 전송됩니다(MVP는 모의 배포). Devices 탭에서 등록된 유닛을 확인할 수 있습니다.',
    tone: 'info' as const,
  },
];

const TIPS = [
  { icon: FileCode2, text: '상단 Templates 메뉴에서 BIT / Vibration / Voltage sweep 등 샘플 워크스페이스를 즉시 불러올 수 있습니다.' },
  { icon: Sparkles, text: 'Functions 카테고리에서 직접 함수를 정의해 재사용 가능한 시퀀스를 만들 수 있습니다.' },
  { icon: Lightbulb, text: 'Ctrl/Cmd + 휠로 워크스페이스를 확대·축소할 수 있습니다.' },
];

export function WelcomeDialog({ open, onOpenChange, onTryDemo }: WelcomeDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
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
          <div className="px-6 py-5 border-b border-border flex items-start justify-between shrink-0">
            <div>
              <div className="overline text-signal">Welcome</div>
              <Dialog.Title className="text-base font-medium text-text mt-1">
                Nexys Blockly Studio
              </Dialog.Title>
              <Dialog.Description className="text-xs text-text-muted mt-1">
                라즈베리파이 계측 모듈을 코딩 없이 30% 커스터마이즈하는 비주얼 IDE.
                4단계로 사용법을 익혀보세요.
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="p-1 text-text-muted hover:text-text"
              aria-label="Close"
            >
              <X size={16} strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          {/* Steps */}
          <div className="overflow-y-auto px-6 py-4 space-y-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="flex gap-3 p-3 border border-border bg-surface-2/50"
                >
                  <div className="shrink-0">
                    <div
                      className={cn(
                        'w-9 h-9 flex items-center justify-center border',
                        s.tone === 'signal'
                          ? 'border-signal/60 text-signal'
                          : 'border-info/60 text-info'
                      )}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </div>
                    <div className="text-center overline text-[9px] mt-1 text-text-muted">
                      0{i + 1}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-text font-medium">{s.title}</div>
                    <div className="text-[12px] text-text-muted leading-relaxed mt-1">
                      {s.body}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Tips */}
            <div className="border border-border bg-bg p-3 mt-3">
              <div className="overline mb-2 text-text-muted">Tips</div>
              <ul className="space-y-1.5">
                {TIPS.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <li key={i} className="flex gap-2 text-[12px] text-text-muted">
                      <Icon size={11} strokeWidth={1.75} className="text-signal/70 shrink-0 mt-0.5" />
                      <span>{t.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-3 border-t border-border flex items-center justify-between gap-2 shrink-0">
            <span className="overline text-text-muted">
              v0.1 · Defense MVP · 본 환경은 시뮬레이션입니다
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenChange(false)}
                className="px-3 py-1.5 text-sm border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
              >
                Got it
              </button>
              <button
                onClick={() => {
                  onTryDemo();
                  onOpenChange(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-signal text-bg font-medium hover:opacity-90 transition-opacity"
              >
                <Play size={12} strokeWidth={2} fill="currentColor" />
                Try demo
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
