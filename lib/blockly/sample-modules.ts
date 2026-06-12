/**
 * Pre-built sample modules (Sub-VIs) seeded into the Modules category on first
 * load so the category isn't empty. Each bodyState is a Blockly block
 * serialization (same shape as Blockly.serialization.blocks.save).
 */

import type { ModuleDef } from './module-store';

// helpers to keep the serialized bodies readable
type B = Record<string, any>;
const link = (b: B, next?: B): B => (next ? { ...b, next: { block: next } } : b);
const chain = (...bs: B[]): B => {
  let acc = bs[bs.length - 1];
  for (let i = bs.length - 2; i >= 0; i--) acc = link(bs[i], acc);
  return acc;
};
const num = (n: number): B => ({ type: 'math_number', fields: { NUM: n } });
const vget = (name: string): B => ({ type: 'variables_get', fields: { VAR: { id: name, name } } });
const doWrite = (ch: string, lvl: 'HIGH' | 'LOW'): B => ({ type: 'do_write', fields: { CHANNEL: ch, LEVEL: lvl } });
const delayMs = (ms: number): B => ({ type: 'delay_ms', fields: { MS: ms } });
const aiRead = (ch: string): B => ({ type: 'ai_read', fields: { CHANNEL: ch } });
const logTdms = (name: string, value: B): B => ({
  type: 'log_to_tdms', fields: { CHANNEL_NAME: name }, inputs: { VALUE: { block: value } },
});
const scaleLin = (x: B, a: number, b: number): B => ({
  type: 'scale_linear', fields: { A: a, B: b }, inputs: { X: { block: x } },
});
const sensorRead = (s: string, ch = 0): B => ({ type: 'sensor_read', fields: { SENSOR_TYPE: s, CHANNEL: ch } });
const threshold = (v: B, lo: number, hi: number): B => ({
  type: 'threshold_check', fields: { LOW: lo, HIGH: hi }, inputs: { VALUE: { block: v } },
});
const ifThen = (cond: B, then: B): B => ({
  type: 'controls_if', inputs: { IF0: { block: cond }, DO0: { block: then } },
});
const alarm = (ch: string, msg: string): B => ({ type: 'send_alarm', fields: { CHANNEL: ch, MESSAGE: msg } });
const bitResult = (verdict: 'PASS' | 'FAIL', v: B): B => ({
  type: 'bit_result', fields: { VERDICT: verdict }, inputs: { VALUE: { block: v } },
});

function countBlocks(state: any): number {
  let n = 0;
  const walk = (b: any) => {
    if (!b) return; n++;
    if (b.inputs) for (const k of Object.keys(b.inputs)) { if (b.inputs[k]?.block) walk(b.inputs[k].block); }
    if (b.next?.block) walk(b.next.block);
  };
  walk(state);
  return n;
}

function def(id: string, name: string, body: B, params: string[] = []): ModuleDef {
  return {
    id, name, bodyState: body,
    createdAt: '2026-06-12T00:00:00.000Z',
    blockCount: countBlocks(body),
    params: params.map(n => ({ name: n })),
  };
}

export const SAMPLE_MODULES: ModuleDef[] = [
  // 1) BIT_Pulse — DO0 자극 펄스 (HIGH→대기→LOW)
  def('mod_bit_pulse', 'BIT_Pulse',
    chain(doWrite('DO0', 'HIGH'), delayMs(10), doWrite('DO0', 'LOW'))),

  // 2) LogScaled — 자유변수 raw를 스케일해 TDMS 로깅 (입력 1개: raw)
  def('mod_log_scaled', 'LogScaled',
    logTdms('scaled', scaleLin(vget('raw'), 2, 0)),
    ['raw']),

  // 3) HotAlarm — 열전대 30°C 초과 시 Slack 알람
  def('mod_hot_alarm', 'HotAlarm',
    ifThen(threshold(sensorRead('thermocouple', 0), 30, 999), alarm('slack', '온도 초과'))),

  // 4) BitCheck — AI0이 [1.5,3.5]면 PASS, 자극은 호출측에서 (입력 없음)
  def('mod_bit_check', 'BitCheck',
    chain(
      bitResult('PASS', aiRead('AI0')),
      logTdms('bit_ai0', aiRead('AI0')),
    )),
];
