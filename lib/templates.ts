/**
 * Sample workspaces for the Templates dropdown in the top bar.
 * Each one is a complete, runnable Blockly serialization that demonstrates
 * a real measurement use case the user can simulate immediately.
 *
 * The "Pro" templates exercise variables, user-defined functions, nested
 * conditionals, and multi-step sequences — showing what production-grade
 * Nexys workspaces look like.
 */

import { INITIAL_WORKSPACE_STATE } from './blockly/initial-workspace';
import { DEFAULT_LAYOUT, type WiringLayout } from './hardware/wiring-state';
import { moduleBlockType } from './blockly/module-store';

export interface Template {
  id: string;
  name: string;
  description: string;
  tag: string;
  state: unknown;
  /** Optional wiring schematic that auto-applies when the template is picked. */
  wiringLayout?: WiringLayout;
}

// ============================================================
//  Block-JSON helpers — keep the templates readable
// ============================================================

type B = Record<string, any>;
const link = (b: B, next?: B): B => (next ? { ...b, next: { block: next } } : b);
const chain = (...blocks: B[]): B | undefined => {
  if (blocks.length === 0) return undefined;
  if (blocks.length === 1) return blocks[0];
  let acc = blocks[blocks.length - 1];
  for (let i = blocks.length - 2; i >= 0; i--) acc = link(blocks[i], acc);
  return acc;
};

const num = (n: number): B => ({ type: 'math_number', fields: { NUM: n } });
const txt = (s: string): B => ({ type: 'text', fields: { TEXT: s } });
const bool = (v: boolean): B => ({ type: 'logic_boolean', fields: { BOOL: v ? 'TRUE' : 'FALSE' } });

const add = (a: B, b: B): B => ({
  type: 'math_arithmetic', fields: { OP: 'ADD' },
  inputs: { A: { block: a }, B: { block: b } },
});
const sub = (a: B, b: B): B => ({
  type: 'math_arithmetic', fields: { OP: 'MINUS' },
  inputs: { A: { block: a }, B: { block: b } },
});
const mul = (a: B, b: B): B => ({
  type: 'math_arithmetic', fields: { OP: 'MULTIPLY' },
  inputs: { A: { block: a }, B: { block: b } },
});

const gt = (a: B, b: B): B => ({
  type: 'logic_compare', fields: { OP: 'GT' },
  inputs: { A: { block: a }, B: { block: b } },
});
const lt = (a: B, b: B): B => ({
  type: 'logic_compare', fields: { OP: 'LT' },
  inputs: { A: { block: a }, B: { block: b } },
});

const vGet = (id: string): B => ({ type: 'variables_get', fields: { VAR: { id } } });
const vSet = (id: string, value: B): B => ({
  type: 'variables_set',
  fields: { VAR: { id } },
  inputs: { VALUE: { block: value } },
});
const vInc = (id: string, by = 1): B => vSet(id, add(vGet(id), num(by)));

const aiRead = (ch: string): B => ({ type: 'ai_read', fields: { CHANNEL: ch } });
const aoWrite = (ch: string, value: B): B => ({
  type: 'ao_write', fields: { CHANNEL: ch },
  inputs: { VALUE: { block: value } },
});
const doWrite = (ch: string, level: 'HIGH' | 'LOW'): B => ({
  type: 'do_write', fields: { CHANNEL: ch, LEVEL: level },
});
const sensorRead = (sensor: string, ch = 0): B => ({
  type: 'sensor_read', fields: { SENSOR_TYPE: sensor, CHANNEL: ch },
});

const delayMs = (ms: number): B => ({ type: 'delay_ms', fields: { MS: ms } });
const loopEvery = (ms: number, body?: B): B => ({
  type: 'loop_every',
  fields: { INTERVAL_MS: ms },
  inputs: body ? { DO: { block: body } } : {},
});
const repeatN = (n: number, body?: B): B => ({
  type: 'repeat_n_times',
  fields: { N: n },
  inputs: body ? { DO: { block: body } } : {},
});

const ifThen = (cond: B, then: B, els?: B): B => ({
  type: 'controls_if',
  extraState: els ? { hasElse: true } : undefined,
  inputs: {
    IF0: { block: cond },
    DO0: { block: then },
    ...(els ? { ELSE: { block: els } } : {}),
  },
});

const logTdms = (name: string, value: B): B => ({
  type: 'log_to_tdms',
  fields: { CHANNEL_NAME: name },
  inputs: { VALUE: { block: value } },
});
const alarm = (channel: 'email' | 'slack' | 'buzzer', msg: string): B => ({
  type: 'send_alarm', fields: { CHANNEL: channel, MESSAGE: msg },
});
const bitResult = (verdict: 'PASS' | 'FAIL', value: B): B => ({
  type: 'bit_result', fields: { VERDICT: verdict },
  inputs: { VALUE: { block: value } },
});
const mqttPub = (topic: string, payload: B): B => ({
  type: 'publish_mqtt', fields: { TOPIC: topic },
  inputs: { PAYLOAD: { block: payload } },
});

const threshold = (value: B, low: number, high: number): B => ({
  type: 'threshold_check', fields: { LOW: low, HIGH: high },
  inputs: { VALUE: { block: value } },
});
const scaleLin = (x: B, a: number, b: number): B => ({
  type: 'scale_linear', fields: { A: a, B: b },
  inputs: { X: { block: x } },
});
const rms = (sig: B, n = 256): B => ({
  type: 'compute_rms', fields: { N: n },
  inputs: { SIGNAL: { block: sig } },
});
const lpf = (sig: B, hz = 50): B => ({
  type: 'low_pass_filter', fields: { CUTOFF_HZ: hz },
  inputs: { SIGNAL: { block: sig } },
});

const procDef = (name: string, body?: B): B => ({
  type: 'procedures_defnoreturn',
  extraState: { params: [] },
  fields: { NAME: name },
  inputs: body ? { STACK: { block: body } } : {},
});
const procCall = (name: string): B => ({
  type: 'procedures_callnoreturn',
  extraState: { name, params: [] },
});

// module (Sub-VI) call block — `id` is the sample-module id (e.g. 'mod_ni_di_line').
// `args` maps param name → value block (becomes the ARG_<name> input).
const mod = (id: string, args?: Record<string, B>): B => ({
  type: moduleBlockType(id),
  ...(args
    ? { inputs: Object.fromEntries(Object.entries(args).map(([k, v]) => [`ARG_${k}`, { block: v }])) }
    : {}),
});

// position helper — drops a block as a workspace top-level at given coords
const top = (x: number, y: number, b: B): B => ({ ...b, x, y });

// ============================================================
//  Templates
// ============================================================

// --- Vibration test (MIL-STD-810) ---
const VIBRATION_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      top(80, 60, loopEvery(20, logTdms('vib_rms', rms(sensorRead('accel', 0), 256)))),
    ],
  },
};

// --- Voltage sweep ---
const VOLTAGE_SWEEP_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      top(80, 60, repeatN(50, chain(
        aoWrite('AO0', num(2.5)),
        delayMs(50),
        logTdms('sweep_ai0', aiRead('AI0')),
      )!)),
    ],
  },
};

// --- Thermocouple monitor ---
const THERMOCOUPLE_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      top(80, 60, loopEvery(500, chain(
        logTdms('temp_c', sensorRead('thermocouple', 0)),
        ifThen(
          gt(sensorRead('thermocouple', 0), num(28)),
          alarm('slack', '온도 임계 초과'),
        ),
      )!)),
    ],
  },
};

// =============================================================
//  AVI_BIT_Suite_Pro — Aircraft avionics built-in test
// =============================================================
//  4-channel BIT with PASS/FAIL counters, repeat sweep, MQTT
//  telemetry, escalating alarm if failures exceed threshold.
const AVI_BIT_PRO_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      // ── variable init (top of canvas)
      top(40, 20, chain(
        vSet('pass_cnt', num(0)),
        vSet('fail_cnt', num(0)),
        vSet('sweep_n', num(0)),
      )!),

      // ── helper procedure: log_summary
      top(40, 220, procDef('log_summary', chain(
        mqttPub('avionics/bit/summary', vGet('sweep_n')),
        logTdms('bit_pass', vGet('pass_cnt')),
        logTdms('bit_fail', vGet('fail_cnt')),
      )!)),

      // ── one channel sweep per loop tick
      top(420, 20, loopEvery(750, chain(
        vInc('sweep_n'),

        // AI0
        ifThen(
          threshold(aiRead('AI0'), 1.5, 4.5),
          chain(vInc('pass_cnt'), logTdms('bit_ai0', aiRead('AI0')))!,
          chain(vInc('fail_cnt'), alarm('slack', 'AI0 out of range'))!,
        ),

        // AI1
        ifThen(
          threshold(aiRead('AI1'), 1.5, 4.5),
          chain(vInc('pass_cnt'), logTdms('bit_ai1', aiRead('AI1')))!,
          chain(vInc('fail_cnt'), alarm('slack', 'AI1 out of range'))!,
        ),

        // AI2
        ifThen(
          threshold(aiRead('AI2'), 1.5, 4.5),
          chain(vInc('pass_cnt'), logTdms('bit_ai2', aiRead('AI2')))!,
          chain(vInc('fail_cnt'), alarm('slack', 'AI2 out of range'))!,
        ),

        // AI3
        ifThen(
          threshold(aiRead('AI3'), 1.5, 4.5),
          chain(vInc('pass_cnt'), logTdms('bit_ai3', aiRead('AI3')))!,
          chain(vInc('fail_cnt'), alarm('slack', 'AI3 out of range'))!,
        ),

        // emit summary + escalate if too many failures
        procCall('log_summary'),
        ifThen(
          gt(vGet('fail_cnt'), num(5)),
          chain(
            bitResult('FAIL', vGet('fail_cnt')),
            alarm('email', 'BIT_FAIL: escalate to ops'),
          )!,
          bitResult('PASS', vGet('pass_cnt')),
        ),
      )!)),
    ],
  },
  variables: [
    { name: 'pass_cnt', id: 'pass_cnt' },
    { name: 'fail_cnt', id: 'fail_cnt' },
    { name: 'sweep_n',  id: 'sweep_n' },
  ],
};

// =============================================================
//  HILS_PID_Servo — Closed-loop servo with PI controller
// =============================================================
//  setpoint - measured = error;  output = Kp·error + Ki·∫error
const HILS_PID_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      // ── tuning + state variables
      top(40, 20, chain(
        vSet('setpoint', num(2.5)),
        vSet('kp', num(0.5)),
        vSet('ki', num(0.1)),
        vSet('integral', num(0)),
        vSet('error', num(0)),
        vSet('output', num(0)),
      )!),

      // ── pi_step()
      top(40, 320, procDef('pi_step', chain(
        // integral += error
        vSet('integral', add(vGet('integral'), vGet('error'))),
        // output = kp*error + ki*integral
        vSet('output', add(
          mul(vGet('kp'), vGet('error')),
          mul(vGet('ki'), vGet('integral')),
        )),
      )!)),

      // ── main control loop
      top(440, 20, loopEvery(10, chain(
        // error = setpoint - AI0
        vSet('error', sub(vGet('setpoint'), aiRead('AI0'))),
        procCall('pi_step'),
        // drive AO0
        aoWrite('AO0', vGet('output')),
        // telemetry
        logTdms('pid_setpoint', vGet('setpoint')),
        logTdms('pid_measured', aiRead('AI0')),
        logTdms('pid_error',    vGet('error')),
        logTdms('pid_output',   vGet('output')),
        // safety: large error → alarm
        ifThen(
          gt(vGet('error'), num(1)),
          alarm('buzzer', 'PID error exceeds 1.0V'),
        ),
      )!)),
    ],
  },
  variables: [
    { name: 'setpoint', id: 'setpoint' },
    { name: 'kp',       id: 'kp' },
    { name: 'ki',       id: 'ki' },
    { name: 'integral', id: 'integral' },
    { name: 'error',    id: 'error' },
    { name: 'output',   id: 'output' },
  ],
};

// =============================================================
//  EnvChamber_ThermalCycle — Multi-segment thermal profile
// =============================================================
//  4 segments: warm soak → ramp up → hot soak → cool down,
//  each driven by its own setpoint procedure.
const ENV_CHAMBER_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      // ── state vars
      top(40, 20, chain(
        vSet('target', num(25)),
        vSet('segment', num(0)),
        vSet('cycle', num(0)),
      )!),

      // ── segment-1: warm soak
      top(40, 220, procDef('seg_warm_soak', chain(
        vSet('target', num(25)),
        vSet('segment', num(1)),
        mqttPub('chamber/seg', txt('warm_soak')),
        delayMs(2000),
      )!)),

      // ── segment-2: ramp up
      top(40, 400, procDef('seg_ramp_up', chain(
        vSet('target', num(85)),
        vSet('segment', num(2)),
        mqttPub('chamber/seg', txt('ramp_up')),
        delayMs(2000),
      )!)),

      // ── segment-3: hot soak
      top(40, 580, procDef('seg_hot_soak', chain(
        vSet('target', num(85)),
        vSet('segment', num(3)),
        mqttPub('chamber/seg', txt('hot_soak')),
        delayMs(3000),
      )!)),

      // ── segment-4: cool down
      top(40, 760, procDef('seg_cool_down', chain(
        vSet('target', num(-40)),
        vSet('segment', num(4)),
        mqttPub('chamber/seg', txt('cool_down')),
        delayMs(2000),
      )!)),

      // ── sampler loop (continuous)
      top(540, 20, loopEvery(250, chain(
        logTdms('chamber_temp', sensorRead('thermocouple', 0)),
        logTdms('chamber_target', vGet('target')),
        // over-temp alarm
        ifThen(
          gt(sensorRead('thermocouple', 0), num(90)),
          alarm('email', 'CHAMBER OVERTEMP > 90C'),
        ),
        // under-temp alarm
        ifThen(
          lt(sensorRead('thermocouple', 0), num(-45)),
          alarm('email', 'CHAMBER UNDERTEMP < -45C'),
        ),
      )!)),

      // ── cycle controller — runs the profile twice
      top(540, 320, repeatN(2, chain(
        vInc('cycle'),
        procCall('seg_warm_soak'),
        procCall('seg_ramp_up'),
        procCall('seg_hot_soak'),
        procCall('seg_cool_down'),
        bitResult('PASS', vGet('cycle')),
      )!)),
    ],
  },
  variables: [
    { name: 'target',  id: 'target' },
    { name: 'segment', id: 'segment' },
    { name: 'cycle',   id: 'cycle' },
  ],
};

// =============================================================
//  NI_DAQ_Station — NI 모듈(Sub-VI) 조합 데모
// =============================================================
//  Round 9에서 추가한 nidaqmx-python 예제 기반 모듈을 한 워크스페이스에
//  모아 보여주는 시연용 템플릿. 500ms 주기로 7개 NI 모듈을 순차 호출 —
//  전압 샘플/연속 RMS/열전대/AO 출력/DO 라인 패턴/DI 라인 감시.
//  NI PXIe·cRIO·cDAQ 타겟에서 nidaqmx Python으로 그대로 생성된다.
const NI_DEMO_STATE = {
  blocks: {
    languageVersion: 0,
    blocks: [
      top(80, 40, loopEvery(500, chain(
        mod('mod_ni_voltage_sample'),               // AI0 단일 전압 → TDMS
        mod('mod_ni_voltage_rms'),                  // AI0 연속 RMS(200) → TDMS
        mod('mod_ni_thermocouple'),                 // 열전대 °C → TDMS
        mod('mod_ni_ao_voltage', { volts: num(2.5) }), // AO0 = 2.5 V
        mod('mod_ni_do_lines'),                     // DO0=H, DO1=L, DO2=H
        mod('mod_ni_di_line'),                      // DI0 HIGH → 부저
      )!)),
    ],
  },
};

const NI_DEMO_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-ni-tc',    type: 'thermo',  x: 40,  y: 40 },
    { id: 'd-ni-pot',   type: 'pot',     x: 40,  y: 150 },
    { id: 'd-ni-motor', type: 'motor',   x: 40,  y: 260 },
    { id: 'd-ni-sw',    type: 'switch',  x: 200, y: 40 },
    { id: 'd-ni-led0',  type: 'led',     x: 200, y: 150 },
    { id: 'd-ni-led1',  type: 'led',     x: 200, y: 220 },
    { id: 'd-ni-buz',   type: 'buzzer',  x: 200, y: 290 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-ni-tc',    channel: 'AI0' }, // 열전대/전압 측정
    { id: 'w2', deviceId: 'd-ni-pot',   channel: 'AI1' },
    { id: 'w3', deviceId: 'd-ni-motor', channel: 'AO0' }, // NI_AO_Voltage 구동
    { id: 'w4', deviceId: 'd-ni-sw',    channel: 'DI0' }, // NI_DI_Line 입력
    { id: 'w5', deviceId: 'd-ni-led0',  channel: 'DO0' }, // NI_DO_Lines
    { id: 'w6', deviceId: 'd-ni-led1',  channel: 'DO1' },
    { id: 'w7', deviceId: 'd-ni-buz',   channel: 'DO2' },
  ],
};

// ============================================================
//  Template registry
// ============================================================

// ============================================================
//  Per-template wiring layouts — auto-applied when template picked
// ============================================================

const VIBRATION_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-acc-1',   type: 'accel', x: 60, y: 80 },
    { id: 'd-led-vib', type: 'led',   x: 60, y: 200 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-acc-1',   channel: 'AI0' },
    { id: 'w2', deviceId: 'd-led-vib', channel: 'DO0' },
  ],
};

const VOLTAGE_SWEEP_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-sweep-aosrc', type: 'aoSource', x: 60, y: 80 },
    { id: 'd-sweep-pot',   type: 'pot',      x: 60, y: 200 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-sweep-aosrc', channel: 'AO0' },
    { id: 'w2', deviceId: 'd-sweep-pot',   channel: 'AI0' },
  ],
};

const THERMO_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-tc-1',    type: 'thermo', x: 60, y: 80 },
    { id: 'd-alarm-led', type: 'led',  x: 60, y: 200 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-tc-1',      channel: 'AI0' },
    { id: 'w2', deviceId: 'd-alarm-led', channel: 'DO0' },
  ],
};

const AVI_BIT_PRO_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-tc-0',    type: 'thermo',   x: 30, y: 30 },
    { id: 'd-p-1',     type: 'pressure', x: 30, y: 110 },
    { id: 'd-st-2',    type: 'strain',   x: 30, y: 200 },
    { id: 'd-acc-3',   type: 'accel',    x: 30, y: 290 },
    { id: 'd-led-pass', type: 'led',     x: 170, y: 30 },
    { id: 'd-buz-fail', type: 'buzzer',  x: 170, y: 110 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-tc-0',     channel: 'AI0' },
    { id: 'w2', deviceId: 'd-p-1',      channel: 'AI1' },
    { id: 'w3', deviceId: 'd-st-2',     channel: 'AI2' },
    { id: 'w4', deviceId: 'd-acc-3',    channel: 'AI3' },
    { id: 'w5', deviceId: 'd-led-pass', channel: 'DO0' },
    { id: 'w6', deviceId: 'd-buz-fail', channel: 'DO1' },
  ],
};

const HILS_PID_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-pot-fb',    type: 'pot',    x: 60, y: 60 },
    { id: 'd-motor-out', type: 'motor',  x: 60, y: 170 },
    { id: 'd-buz-err',   type: 'buzzer', x: 60, y: 290 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-pot-fb',    channel: 'AI0' },
    { id: 'w2', deviceId: 'd-motor-out', channel: 'AO0' },
    { id: 'w3', deviceId: 'd-buz-err',   channel: 'DO0' },
  ],
};

const ENV_CHAMBER_LAYOUT: WiringLayout = {
  devices: [
    { id: 'd-tc-cham',   type: 'thermo', x: 60, y: 60 },
    { id: 'd-heater-1',  type: 'heater', x: 60, y: 180 },
    { id: 'd-led-cycle', type: 'led',    x: 200, y: 60 },
  ],
  wires: [
    { id: 'w1', deviceId: 'd-tc-cham',   channel: 'AI0' },
    { id: 'w2', deviceId: 'd-heater-1',  channel: 'AO0' },
    { id: 'w3', deviceId: 'd-led-cycle', channel: 'DO0' },
  ],
};

export const TEMPLATES: Template[] = [
  {
    id: 'bit_sequence',
    name: 'BIT_Sequence_v3',
    description:
      '자극 신호(DO0) 펄스 → AI0 응답 측정 → TDMS 로깅. 방산 내장시험 기본 데모.',
    tag: 'defense · BIT · basic',
    state: INITIAL_WORKSPACE_STATE,
    wiringLayout: DEFAULT_LAYOUT,
  },
  {
    id: 'vibration_mil810',
    name: 'Vibration_MIL810',
    description:
      '가속도 센서 20ms 주기 → 256샘플 RMS → TDMS 로깅. MIL-STD-810 진동시험.',
    tag: 'defense · vibration',
    state: VIBRATION_STATE,
    wiringLayout: VIBRATION_LAYOUT,
  },
  {
    id: 'voltage_sweep',
    name: 'Voltage_Sweep',
    description:
      'AO0 출력 → 50ms 후 AI0 측정을 50회 반복. 채널 캘리브레이션용.',
    tag: 'lab · calibration',
    state: VOLTAGE_SWEEP_STATE,
    wiringLayout: VOLTAGE_SWEEP_LAYOUT,
  },
  {
    id: 'thermocouple_monitor',
    name: 'Thermocouple_Monitor',
    description:
      '열전대 500ms 폴링 + 28°C 초과 시 Slack 알람. 공장 라인 모니터링.',
    tag: 'industrial · monitor',
    state: THERMOCOUPLE_STATE,
    wiringLayout: THERMO_LAYOUT,
  },
  // ── Pro templates ──────────────────────────────────────────
  {
    id: 'avi_bit_pro',
    name: 'AVI_BIT_Suite_Pro',
    description:
      '항공전자(AVI) 4채널 BIT 풀 시퀀스 — 변수·함수·조건문, PASS/FAIL 카운터, MQTT 텔레메트리, 실패 임계 초과 시 이메일 에스컬레이션.',
    tag: 'defense · BIT · production',
    state: AVI_BIT_PRO_STATE,
    wiringLayout: AVI_BIT_PRO_LAYOUT,
  },
  {
    id: 'hils_pid_servo',
    name: 'HILS_PID_Servo',
    description:
      '하드웨어-인-루프 폐쇄 제어 — PI 제어기(Kp·Ki) + 적분항, AI0 피드백 → AO0 구동, 오차 1.0V 초과 시 버저 알람.',
    tag: 'defense · HILS · control',
    state: HILS_PID_STATE,
    wiringLayout: HILS_PID_LAYOUT,
  },
  {
    id: 'env_chamber_thermal',
    name: 'EnvChamber_ThermalCycle',
    description:
      '환경챔버 다단 열사이클 — 4단계(웜소크→램프업→핫소크→쿨다운) 프로파일 함수화, 2회 반복, 과열·과냉 알람, 250ms 텔레메트리.',
    tag: 'industrial · profile · pro',
    state: ENV_CHAMBER_STATE,
    wiringLayout: ENV_CHAMBER_LAYOUT,
  },
  // ── NI module demo ─────────────────────────────────────────
  {
    id: 'ni_daq_station',
    name: 'NI_DAQ_Station',
    description:
      'NI 모듈(Sub-VI) 7종 조합 데모 — 전압 샘플·연속 RMS·열전대·AO 출력·DO 라인·DI 감시를 500ms 주기로 호출. NI PXIe/cRIO/cDAQ 타겟에서 nidaqmx Python 생성.',
    tag: 'NI · nidaqmx · modules',
    state: NI_DEMO_STATE,
    wiringLayout: NI_DEMO_LAYOUT,
  },
];

export function findTemplate(id: string): Template | undefined {
  return TEMPLATES.find(t => t.id === id);
}
