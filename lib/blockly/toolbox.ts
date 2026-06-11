/**
 * Blockly Toolbox 정의 — 좌측 사이드바에서 사용자가 끌어쓸 블록 카탈로그.
 * Blockly의 JSON toolbox 포맷을 사용.
 *
 * **shadow blocks**: value input 슬롯에 미리 박혀 있는 기본 블록.
 * 사용자가 슬롯의 숫자/텍스트 필드를 그대로 클릭해서 값을 입력할 수도 있고,
 * 그 위에 실제 블록(예: ai_read)을 끌어다 놓으면 shadow가 자동으로 교체됨.
 * Blockly가 모양은 그대로 보여주되 generator/simulator는 shadow → 실연결 순서로 우선 적용.
 */

import { CATEGORY_HUE } from '@/lib/types';

// 기본 number shadow — value input에 미리 박힐 「숫자 입력 가능」 셀
const numberShadow = (defaultNum = 0) => ({
  shadow: { type: 'math_number', fields: { NUM: defaultNum } },
});
// 기본 text shadow — 텍스트 페이로드용
const textShadow = (defaultText = '') => ({
  shadow: { type: 'text', fields: { TEXT: defaultText } },
});
// 기본 boolean shadow — 조건 슬롯용
const booleanShadow = (defaultVal = false) => ({
  shadow: { type: 'logic_boolean', fields: { BOOL: defaultVal ? 'TRUE' : 'FALSE' } },
});

export const nexysToolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Channels',
      colour: String(CATEGORY_HUE.channels),
      contents: [
        { kind: 'block', type: 'ai_read' },
        {
          kind: 'block', type: 'ao_write',
          inputs: { VALUE: numberShadow(0) },
        },
        { kind: 'block', type: 'di_read' },
        { kind: 'block', type: 'do_write' },
        { kind: 'block', type: 'sensor_read' },
      ],
    },
    {
      kind: 'category',
      name: 'Timing',
      colour: String(CATEGORY_HUE.timing),
      contents: [
        { kind: 'block', type: 'loop_every' },
        { kind: 'block', type: 'delay_ms' },
        {
          kind: 'block', type: 'wait_until',
          inputs: { CONDITION: booleanShadow(false) },
        },
        { kind: 'block', type: 'repeat_n_times' },
      ],
    },
    {
      kind: 'category',
      name: 'Signal',
      colour: String(CATEGORY_HUE.signal),
      contents: [
        {
          kind: 'block', type: 'scale_linear',
          inputs: { X: numberShadow(0) },
        },
        {
          kind: 'block', type: 'compute_rms',
          inputs: { SIGNAL: numberShadow(0) },
        },
        {
          kind: 'block', type: 'low_pass_filter',
          inputs: { SIGNAL: numberShadow(0) },
        },
        {
          kind: 'block', type: 'threshold_check',
          inputs: { VALUE: numberShadow(0) },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Logic',
      colour: String(CATEGORY_HUE.logic),
      contents: [
        { kind: 'block', type: 'if_channel_then' },
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    {
      kind: 'category',
      name: 'Output',
      colour: String(CATEGORY_HUE.output),
      contents: [
        {
          kind: 'block', type: 'log_to_tdms',
          inputs: { VALUE: numberShadow(0) },
        },
        {
          kind: 'block', type: 'publish_mqtt',
          inputs: { PAYLOAD: textShadow('') },
        },
        { kind: 'block', type: 'send_alarm' },
        {
          kind: 'block', type: 'bit_result',
          inputs: { VALUE: numberShadow(0) },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      colour: '330',
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: 'Functions',
      colour: '290',
      custom: 'PROCEDURE',
    },
    {
      kind: 'category',
      name: 'Modules',
      colour: '285',
      custom: 'MODULES',
    },
    {
      kind: 'category',
      name: 'Math',
      colour: '230',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_single' },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      colour: '160',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
      ],
    },
  ],
};
