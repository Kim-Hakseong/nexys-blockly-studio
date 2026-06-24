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
const aoWrite = (ch: string, value: B): B => ({
  type: 'ao_write', fields: { CHANNEL: ch }, inputs: { VALUE: { block: value } },
});
const computeRms = (signal: B, n: number): B => ({
  type: 'compute_rms', fields: { N: n }, inputs: { SIGNAL: { block: signal } },
});
const repeatN = (n: number, body: B): B => ({
  type: 'repeat_n_times', fields: { N: n }, inputs: { DO: { block: body } },
});
const ifChannelThen = (ch: string, lvl: 'HIGH' | 'LOW', then: B): B => ({
  type: 'if_channel_then', fields: { CHANNEL: ch, LEVEL: lvl }, inputs: { DO: { block: then } },
});
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

  // ────────────────────────────────────────────────────────────
  //  NI examples — ported from github.com/ni/nidaqmx-python/examples
  //  각 모듈은 실제 nidaqmx-python 예제 파일을 nexys 블록으로 옮긴 것.
  // ────────────────────────────────────────────────────────────

  // NI: voltage_sample.py — 단일 지점 전압 측정 후 TDMS 기록
  def('mod_ni_voltage_sample', 'NI_Voltage_Sample',
    logTdms('ai0_volts', aiRead('AI0'))),

  // NI: voltage_acq_int_clk_tdms_logging.py — 내부 클럭 유한 N샘플 수집 + TDMS 로깅
  def('mod_ni_voltage_tdms', 'NI_Voltage_TDMS',
    repeatN(100, chain(
      logTdms('ai0', aiRead('AI0')),
      delayMs(1),
    ))),

  // NI: cont_voltage_acq_int_clk.py — 연속 수집 + RMS 모니터 (200샘플)
  def('mod_ni_voltage_rms', 'NI_Voltage_RMS',
    logTdms('ai0_rms', computeRms(aiRead('AI0'), 200))),

  // NI: thrmcpl_sample.py — 단일 열전대 온도 측정 후 °C 로깅
  def('mod_ni_thermocouple', 'NI_Thermocouple',
    logTdms('temp_c', sensorRead('thermocouple', 0))),

  // NI: analog_out (ao 소프트웨어 타이밍 전압 출력) — 입력 1개: volts
  def('mod_ni_ao_voltage', 'NI_AO_Voltage',
    aoWrite('AO0', vget('volts')),
    ['volts']),

  // NI: write_dig_lines.py — 디지털 라인 패턴 출력 (DO0=H, DO1=L, DO2=H)
  def('mod_ni_do_lines', 'NI_DO_Lines',
    chain(
      doWrite('DO0', 'HIGH'),
      doWrite('DO1', 'LOW'),
      doWrite('DO2', 'HIGH'),
    )),

  // NI: digital_in (단일 라인 읽기) — DI0이 HIGH면 부저 알람
  def('mod_ni_di_line', 'NI_DI_Line',
    ifChannelThen('DI0', 'HIGH', alarm('buzzer', 'DI0 asserted'))),
];
