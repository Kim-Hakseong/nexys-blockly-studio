'use client';

/**
 * Real board illustration via @wokwi/elements (MIT licensed) web components.
 *
 * Only registers/renders for targets Wokwi actually ships art for (Arduino).
 * The custom element auto-registers on import (@customElement decorator), so we
 * dynamic-import it client-side, then render the tag. Renders nothing until the
 * element has loaded — the parent shows a stylized fallback in that window and
 * for targets Wokwi has no art for (RPi / Jetson / STM32).
 */

import { createElement, useEffect, useState } from 'react';

const WOKWI_TAG: Record<string, string> = {
  arduino: 'wokwi-arduino-uno',
};

export function hasWokwiBoard(targetId: string): boolean {
  return !!WOKWI_TAG[targetId];
}

export function WokwiBoard({ targetId }: { targetId: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // Importing the package registers all element custom tags.
        await import('@wokwi/elements');
        if (alive) setReady(true);
      } catch (err) {
        console.warn('[nexys] wokwi-elements load failed', err);
      }
    })();
    return () => { alive = false; };
  }, [targetId]);

  const tag = WOKWI_TAG[targetId];
  if (!tag || !ready) return null;

  return createElement(tag, {
    style: { width: '100%', height: '100%', display: 'block' },
  });
}
