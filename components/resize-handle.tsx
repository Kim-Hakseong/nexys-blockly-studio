'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizeHandleProps {
  /** Current width of the panel being resized (in px). */
  currentWidth: number;
  /** Min / max width in px. */
  min?: number;
  max?: number;
  /** Called on every drag-move with the new clamped width. */
  onResize: (width: number) => void;
  /** Drag direction: 'right' increases width when dragging left. */
  side?: 'right' | 'left';
  className?: string;
}

export function ResizeHandle({
  currentWidth, min = 280, max = 1200, onResize, side = 'right', className,
}: ResizeHandleProps) {
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);

  const handleDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startW: currentWidth };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (mv: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = mv.clientX - d.startX;
      // when handle is on the RIGHT panel's left edge, dragging LEFT increases panel width
      const delta = side === 'right' ? -dx : dx;
      const next = Math.max(min, Math.min(max, d.startW + delta));
      onResize(next);
    };
    const onUp = () => {
      dragRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      onPointerDown={handleDown}
      className={cn(
        'group relative w-1 shrink-0 bg-border hover:bg-signal/60 active:bg-signal cursor-col-resize transition-colors',
        className
      )}
      title="Drag to resize panel"
    >
      {/* visual grip dots */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {[0, 1, 2].map(i => (
          <span key={i} className="w-0.5 h-0.5 rounded-full bg-bg" />
        ))}
      </div>
    </div>
  );
}
