/**
 * Virtual device catalog — what can be wired to each channel kind.
 *
 * The simulator consults the active bindings (channel → deviceId) when
 * generating channel values, so swapping a Thermocouple for a Potentiometer
 * on AI0 fundamentally changes how `ai_read('AI0')` behaves.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Lightbulb, Bell, Hand, ToggleLeft, ToggleRight,
  Thermometer, Gauge, Activity, Move, SlidersHorizontal,
  RotateCw, Flame, Cpu,
} from 'lucide-react';

export type ChannelKind = 'ai' | 'ao' | 'di' | 'do';

/** What interaction model an input device exposes to the user. */
export type InputControl = 'momentary' | 'latched' | 'slider' | 'auto';

export interface DeviceSpec {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  kind: ChannelKind;
  description: string;
  /** for AI/DI inputs — what kind of user control surfaces in the panel */
  control?: InputControl;
  /** for AI slider devices — slider range */
  range?: { min: number; max: number; step?: number; unit?: string };
}

export const DEVICES: DeviceSpec[] = [
  // ── DO actuators ──────────────────────────────────────
  {
    id: 'led',
    name: 'LED',
    shortName: 'LED',
    icon: Lightbulb,
    kind: 'do',
    description: 'HIGH 시 점등',
  },
  {
    id: 'buzzer',
    name: 'Buzzer',
    shortName: 'BUZ',
    icon: Bell,
    kind: 'do',
    description: 'HIGH 시 비프 인디케이터',
  },

  // ── DI sources ────────────────────────────────────────
  {
    id: 'button',
    name: 'Pushbutton',
    shortName: 'BTN',
    icon: Hand,
    kind: 'di',
    description: '누르고 있는 동안 HIGH',
    control: 'momentary',
  },
  {
    id: 'switch',
    name: 'Toggle Switch',
    shortName: 'SW',
    icon: ToggleRight,
    kind: 'di',
    description: '클릭으로 HIGH/LOW 래치',
    control: 'latched',
  },

  // ── AI sources ────────────────────────────────────────
  {
    id: 'thermo',
    name: 'Thermocouple',
    shortName: 'TC',
    icon: Thermometer,
    kind: 'ai',
    description: '온도 20~30°C 사인 모델',
    control: 'auto',
  },
  {
    id: 'pressure',
    name: 'Pressure',
    shortName: 'P',
    icon: Gauge,
    kind: 'ai',
    description: '압력 ~1.0 bar 모델',
    control: 'auto',
  },
  {
    id: 'strain',
    name: 'Strain Gauge',
    shortName: 'ST',
    icon: Activity,
    kind: 'ai',
    description: '스트레인 ~120 με',
    control: 'auto',
  },
  {
    id: 'accel',
    name: 'Accelerometer',
    shortName: 'ACC',
    icon: Move,
    kind: 'ai',
    description: '3축 가속도 사인 모델',
    control: 'auto',
  },
  {
    id: 'pot',
    name: 'Potentiometer',
    shortName: 'POT',
    icon: SlidersHorizontal,
    kind: 'ai',
    description: '슬라이더로 0~5V 수동',
    control: 'slider',
    range: { min: 0, max: 5, step: 0.05, unit: 'V' },
  },

  // ── AO actuators ──────────────────────────────────────
  {
    id: 'motor',
    name: 'DC Motor',
    shortName: 'M',
    icon: RotateCw,
    kind: 'ao',
    description: 'AO 전압에 비례 회전',
  },
  {
    id: 'heater',
    name: 'Heating Element',
    shortName: 'HEAT',
    icon: Flame,
    kind: 'ao',
    description: 'AO 전압에 따른 발열량',
  },
  {
    id: 'aoSource',
    name: 'Manual AO Source',
    shortName: 'SRC',
    icon: SlidersHorizontal,
    kind: 'ao',
    description: '슬라이더로 AO 채널에 0~5V 직접 인가 (블록 없이 수동 출력)',
    control: 'slider',
    range: { min: 0, max: 5, step: 0.05, unit: 'V' },
  },
];

export const DEVICE_BY_ID: Record<string, DeviceSpec> = DEVICES.reduce(
  (acc, d) => { acc[d.id] = d; return acc; },
  {} as Record<string, DeviceSpec>,
);

export const FALLBACK_ICON = Cpu;

// Bindings: channel name → device id
export type Bindings = Record<string, string>;
// User inputs: channel name → current value (number for AI, boolean for DI)
export type Inputs = Record<string, number | boolean>;

export interface HardwareConfig {
  bindings: Bindings;
  inputs: Inputs;
}

export const EMPTY_HARDWARE: HardwareConfig = { bindings: {}, inputs: {} };

export function channelKind(channelName: string): ChannelKind | null {
  if (channelName.startsWith('AI')) return 'ai';
  if (channelName.startsWith('AO')) return 'ao';
  if (channelName.startsWith('DI')) return 'di';
  if (channelName.startsWith('DO')) return 'do';
  return null;
}

/** Default per-channel binding for the BIT_Sequence_v3 demo, so the
 *  Hardware tab feels "wired up" on first impression. */
export const DEFAULT_BINDINGS: Bindings = {
  DO0: 'led',
  DO1: 'led',
  DI0: 'button',
  DI1: 'switch',
  AI0: 'thermo',
  AI1: 'pressure',
  AI2: 'pot',
  AO0: 'motor',
  AO1: 'heater',
};
