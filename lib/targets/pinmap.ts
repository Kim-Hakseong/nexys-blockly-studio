/**
 * Channel → physical pin mapping per target, for display in the UI
 * (Deploy dialog, wiring). Mirrors the mapping logic baked into each emitter.
 */

export interface PinEntry {
  channel: string;     // 'DO0'
  pin: string;         // target-specific label, e.g. 'GPIO2', 'D2', 'PA0'
  note?: string;
}

function chParts(ch: string): { kind: string; idx: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(ch);
  return m ? { kind: m[1], idx: Number(m[2]) } : null;
}

const ALL_CHANNELS = [
  ...Array.from({ length: 8 }, (_, i) => `DO${i}`),
  ...Array.from({ length: 8 }, (_, i) => `DI${i}`),
  ...Array.from({ length: 8 }, (_, i) => `AI${i}`),
  ...Array.from({ length: 4 }, (_, i) => `AO${i}`),
];

function pinFor(targetId: string, ch: string): PinEntry {
  const p = chParts(ch);
  if (!p) return { channel: ch, pin: '?' };
  const { kind, idx } = p;

  switch (targetId) {
    // ── NI targets: NI-DAQmx physical channel strings ──
    case 'ni_pxie': return niPin('PXI1Slot2', kind, idx);
    case 'ni_crio': return niPin('cRIO1Mod1', kind, idx);
    case 'ni_cdaq': return niPin('cDAQ1Mod1', kind, idx);
  }
  return { channel: ch, pin: '—' };
}

function niPin(dev: string, kind: string, idx: number): PinEntry {
  const ch = `${kind}${idx}`;
  if (kind === 'AI') return { channel: ch, pin: `${dev}/ai${idx}`, note: 'analog in' };
  if (kind === 'AO') return { channel: ch, pin: `${dev}/ao${idx}`, note: 'analog out' };
  if (kind === 'DI') return { channel: ch, pin: `${dev}/port0/line${idx}`, note: 'DIO' };
  if (kind === 'DO') return { channel: ch, pin: `${dev}/port1/line${idx}`, note: 'DIO' };
  return { channel: ch, pin: '—' };
}

export function getPinMap(targetId: string, channels?: string[]): PinEntry[] {
  const list = channels && channels.length ? channels : ALL_CHANNELS;
  return list.map(ch => pinFor(targetId, ch));
}

export function getPin(targetId: string, channel: string): PinEntry {
  return pinFor(targetId, channel);
}
