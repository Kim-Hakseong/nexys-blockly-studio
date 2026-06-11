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
    case 'rpi': {
      // Nexys-RPi-Mod HAT virtual mapping over BCM GPIO
      if (kind === 'DO') return { channel: ch, pin: `GPIO${2 + idx}` };
      if (kind === 'DI') return { channel: ch, pin: `GPIO${14 + idx}` };
      if (kind === 'AI') return { channel: ch, pin: `MCP3008 CH${idx}`, note: 'SPI ADC' };
      if (kind === 'AO') return { channel: ch, pin: `MCP4922 ${idx < 2 ? 'A' : 'B'}${idx % 2}`, note: 'SPI DAC' };
      break;
    }
    case 'jetson': {
      if (kind === 'DO') return { channel: ch, pin: `40-pin #${7 + idx}` };
      if (kind === 'DI') return { channel: ch, pin: `40-pin #${11 + idx}` };
      if (kind === 'AI') return { channel: ch, pin: `ADS1115 CH${idx}`, note: 'I²C ADC' };
      if (kind === 'AO') return { channel: ch, pin: `MCP4728 CH${idx}`, note: 'I²C DAC' };
      break;
    }
    case 'arduino': {
      if (kind === 'DO') return { channel: ch, pin: `D${2 + idx}` };
      if (kind === 'DI') return { channel: ch, pin: `D${22 + idx}` };
      if (kind === 'AI') return { channel: ch, pin: `A${idx}` };
      if (kind === 'AO') return { channel: ch, pin: `PWM ${[5, 6, 9, 10][idx] ?? 5}`, note: '8-bit PWM' };
      break;
    }
    case 'stm32': {
      if (kind === 'DO') return { channel: ch, pin: `PA${idx}` };
      if (kind === 'DI') return { channel: ch, pin: `PB${idx}` };
      if (kind === 'AI') return { channel: ch, pin: `ADC1_IN${idx}` };
      if (kind === 'AO') return idx < 2
        ? { channel: ch, pin: `DAC_OUT${idx + 1}` }
        : { channel: ch, pin: `TIM3_CH${idx}`, note: 'PWM' };
      break;
    }
  }
  return { channel: ch, pin: '—' };
}

export function getPinMap(targetId: string, channels?: string[]): PinEntry[] {
  const list = channels && channels.length ? channels : ALL_CHANNELS;
  return list.map(ch => pinFor(targetId, ch));
}

export function getPin(targetId: string, channel: string): PinEntry {
  return pinFor(targetId, channel);
}
