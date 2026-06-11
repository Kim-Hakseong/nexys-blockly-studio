/**
 * Wiring layout — the physical schematic the user assembles in the
 * Hardware tab. Each `PlacedDevice` is an instance of a `DeviceSpec`
 * positioned at a canvas coordinate; each `Wire` connects one device
 * instance to one channel on the Nexys board.
 *
 * Channel binding (channel → deviceType) is derived from the wires —
 * the simulator consumes that derived map and doesn't need to know
 * about positions.
 */

import type { Bindings } from './devices';

export interface PlacedDevice {
  id: string;     // unique instance id, e.g. 'd-led-1'
  type: string;   // device type id ('led', 'thermo', ...)
  x: number;      // canvas x (px)
  y: number;      // canvas y (px)
}

export interface Wire {
  id: string;          // unique wire id
  deviceId: string;    // PlacedDevice.id
  channel: string;     // 'AI0', 'DO0', etc.
}

export interface WiringLayout {
  devices: PlacedDevice[];
  wires: Wire[];
}

export const EMPTY_LAYOUT: WiringLayout = { devices: [], wires: [] };

/**
 * Default canvas layout — pre-populated to match BIT_Sequence_v3 demo
 * so first-time visitors see a meaningful wiring schematic.
 *
 * Coordinates target a ~580 × 460 canvas (board lives at right edge).
 */
export const DEFAULT_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-led-1',   type: 'led',      x: 30,  y: 30 },
    { id: 'd-led-2',   type: 'led',      x: 30,  y: 90 },
    { id: 'd-btn-1',   type: 'button',   x: 30,  y: 150 },
    { id: 'd-sw-1',    type: 'switch',   x: 30,  y: 220 },
    { id: 'd-tc-1',    type: 'thermo',   x: 150, y: 30 },
    { id: 'd-p-1',     type: 'pressure', x: 150, y: 110 },
    { id: 'd-pot-1',   type: 'pot',      x: 150, y: 200 },
    { id: 'd-motor-1', type: 'motor',    x: 150, y: 290 },
    { id: 'd-heat-1',  type: 'heater',   x: 30,  y: 320 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-led-1',   channel: 'DO0' },
    { id: 'w2', deviceId: 'd-led-2',   channel: 'DO1' },
    { id: 'w3', deviceId: 'd-btn-1',   channel: 'DI0' },
    { id: 'w4', deviceId: 'd-sw-1',    channel: 'DI1' },
    { id: 'w5', deviceId: 'd-tc-1',    channel: 'AI0' },
    { id: 'w6', deviceId: 'd-p-1',     channel: 'AI1' },
    { id: 'w7', deviceId: 'd-pot-1',   channel: 'AI2' },
    { id: 'w8', deviceId: 'd-motor-1', channel: 'AO0' },
    { id: 'w9', deviceId: 'd-heat-1',  channel: 'AO1' },
  ],
};

export function deriveBindings(layout: WiringLayout): Bindings {
  const b: Bindings = {};
  for (const wire of layout.wires) {
    const dev = layout.devices.find(d => d.id === wire.deviceId);
    if (dev) b[wire.channel] = dev.type;
  }
  return b;
}

export function nextDeviceId(layout: WiringLayout, type: string): string {
  let n = 1;
  while (layout.devices.some(d => d.id === `d-${type}-${n}`)) n++;
  return `d-${type}-${n}`;
}

export function nextWireId(layout: WiringLayout): string {
  let n = layout.wires.length + 1;
  while (layout.wires.some(w => w.id === `w${n}`)) n++;
  return `w${n}`;
}
