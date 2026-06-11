/**
 * Nexys Blockly Studio — 방산 MVP 커스텀 블록 정의
 *
 * Claude Code 빌드 지침:
 *   - 아래 스켈레톤을 모두 완성하라.
 *   - 각 블록은 'init' 함수에서 입력/출력/색상/툴팁을 정의한다.
 *   - 색상은 lib/types.ts의 CATEGORY_HUE 참조.
 *   - 채널 번호는 드롭다운 필드, 임계값은 number 필드 또는 value input.
 *
 * 블록 정의는 Blockly가 client에서 dynamic import 된 후 호출되어야 한다.
 * 따라서 이 모듈은 BlocklyType을 인자로 받는 함수 형태로 export.
 */

import { CATEGORY_HUE, type BlockCategory } from '@/lib/types';

type AnyBlockly = any;

export function defineNexysBlocks(Blockly: AnyBlockly): void {
  // ==================================================
  //  CHANNELS
  // ==================================================
  defineBlock(Blockly, 'channels', 'ai_read', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('아날로그 입력 읽기')
        .appendField(new Blockly.FieldDropdown(channelOptions('AI', 8)), 'CHANNEL');
      b.setOutput(true, 'Number');
      b.setTooltip('지정된 AI 채널의 전압값(V)을 읽습니다');
    },
  });

  defineBlock(Blockly, 'channels', 'ao_write', {
    init(b: any) {
      b.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('아날로그 출력')
        .appendField(new Blockly.FieldDropdown(channelOptions('AO', 4)), 'CHANNEL')
        .appendField('값');
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('지정된 AO 채널에 전압값(V)을 출력합니다');
    },
  });

  defineBlock(Blockly, 'channels', 'di_read', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('디지털 입력 읽기')
        .appendField(new Blockly.FieldDropdown(channelOptions('DI', 8)), 'CHANNEL');
      b.setOutput(true, 'Boolean');
      b.setTooltip('지정된 DI 채널의 HIGH/LOW 상태를 읽습니다');
    },
  });

  defineBlock(Blockly, 'channels', 'do_write', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('디지털 출력')
        .appendField(new Blockly.FieldDropdown(channelOptions('DO', 8)), 'CHANNEL')
        .appendField('=')
        .appendField(new Blockly.FieldDropdown([['HIGH', 'HIGH'], ['LOW', 'LOW']]), 'LEVEL');
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('지정된 DO 채널에 HIGH 또는 LOW를 출력합니다');
    },
  });

  defineBlock(Blockly, 'channels', 'sensor_read', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('센서 읽기')
        .appendField(new Blockly.FieldDropdown([
          ['열전대 (Thermocouple)', 'thermocouple'],
          ['압력 (Pressure)', 'pressure'],
          ['스트레인 게이지', 'strain'],
          ['3축 가속도', 'accel'],
        ]), 'SENSOR_TYPE')
        .appendField('채널')
        .appendField(new Blockly.FieldNumber(0, 0, 7, 1), 'CHANNEL');
      b.setOutput(true, 'Number');
      b.setTooltip('통합 센서 인터페이스를 통해 값을 읽습니다');
    },
  });

  // ==================================================
  //  TIMING
  // ==================================================
  defineBlock(Blockly, 'timing', 'loop_every', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('매')
        .appendField(new Blockly.FieldNumber(10, 1, 60_000, 1), 'INTERVAL_MS')
        .appendField('ms 마다');
      b.appendStatementInput('DO')
        .setCheck(null);
      b.setTooltip('지정한 주기마다 안쪽 블록을 반복 실행합니다');
    },
  });

  defineBlock(Blockly, 'timing', 'delay_ms', {
    init(b: any) {
      b.appendDummyInput()
        .appendField(new Blockly.FieldNumber(100, 1, 60_000, 1), 'MS')
        .appendField('ms 대기');
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('지정한 시간(ms) 동안 대기합니다');
    },
  });

  defineBlock(Blockly, 'timing', 'wait_until', {
    init(b: any) {
      b.appendValueInput('CONDITION')
        .setCheck('Boolean')
        .appendField('조건이 참이 될 때까지 대기');
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('조건이 true가 될 때까지 폴링합니다');
    },
  });

  defineBlock(Blockly, 'timing', 'repeat_n_times', {
    init(b: any) {
      b.appendDummyInput()
        .appendField(new Blockly.FieldNumber(10, 1, 100_000, 1), 'N')
        .appendField('회 반복');
      b.appendStatementInput('DO').setCheck(null);
      b.setTooltip('지정 횟수만큼 안쪽 블록을 반복합니다');
    },
  });

  // ==================================================
  //  SIGNAL PROCESSING
  // ==================================================
  defineBlock(Blockly, 'signal', 'scale_linear', {
    init(b: any) {
      b.appendValueInput('X')
        .setCheck('Number')
        .appendField('선형 스케일');
      b.appendDummyInput()
        .appendField('a =')
        .appendField(new Blockly.FieldNumber(1), 'A')
        .appendField('b =')
        .appendField(new Blockly.FieldNumber(0), 'B');
      b.setInputsInline(true);
      b.setOutput(true, 'Number');
      b.setTooltip('y = a*x + b');
    },
  });

  defineBlock(Blockly, 'signal', 'compute_rms', {
    init(b: any) {
      b.appendValueInput('SIGNAL')
        .setCheck('Number')
        .appendField('RMS 계산');
      b.appendDummyInput()
        .appendField('샘플 수')
        .appendField(new Blockly.FieldNumber(100, 2, 10_000, 1), 'N');
      b.setInputsInline(true);
      b.setOutput(true, 'Number');
      b.setTooltip('최근 N개 샘플의 RMS 계산');
    },
  });

  defineBlock(Blockly, 'signal', 'low_pass_filter', {
    init(b: any) {
      b.appendValueInput('SIGNAL').setCheck('Number').appendField('저역통과 필터');
      b.appendDummyInput()
        .appendField('차단 주파수')
        .appendField(new Blockly.FieldNumber(50, 0.1, 5000, 0.1), 'CUTOFF_HZ')
        .appendField('Hz');
      b.setInputsInline(true);
      b.setOutput(true, 'Number');
      b.setTooltip('1차 LPF');
    },
  });

  defineBlock(Blockly, 'signal', 'threshold_check', {
    init(b: any) {
      b.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('값');
      b.appendDummyInput()
        .appendField('이 범위 내인가? [')
        .appendField(new Blockly.FieldNumber(0), 'LOW')
        .appendField(',')
        .appendField(new Blockly.FieldNumber(5), 'HIGH')
        .appendField(']');
      b.setInputsInline(true);
      b.setOutput(true, 'Boolean');
      b.setTooltip('값이 [LOW, HIGH] 사이에 있으면 true');
    },
  });

  // ==================================================
  //  LOGIC (Blockly 기본 logic_if/logic_compare 외 도메인 특화)
  // ==================================================
  defineBlock(Blockly, 'logic', 'if_channel_then', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('만약')
        .appendField(new Blockly.FieldDropdown(channelOptions('DI', 8)), 'CHANNEL')
        .appendField('=')
        .appendField(new Blockly.FieldDropdown([['HIGH', 'HIGH'], ['LOW', 'LOW']]), 'LEVEL')
        .appendField('이면');
      b.appendStatementInput('DO').setCheck(null);
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('지정된 DI 채널 상태가 일치하면 안쪽 블록 실행');
    },
  });

  // ==================================================
  //  OUTPUT
  // ==================================================
  defineBlock(Blockly, 'output', 'log_to_tdms', {
    init(b: any) {
      b.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('TDMS 로그');
      b.appendDummyInput()
        .appendField('채널명')
        .appendField(new Blockly.FieldTextInput('channel_1'), 'CHANNEL_NAME');
      b.setInputsInline(true);
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip(
        'TDMS = Technical Data Management Streaming. NI(National Instruments)의 산업용 측정 데이터 표준 바이너리 포맷으로, ' +
        '시간 인덱스 + 값을 효율적으로 스트리밍 저장. LabVIEW/DIAdem 호환. 본 데모에선 콘솔에 TDMS:채널명 형식으로 표시.'
      );
    },
  });

  defineBlock(Blockly, 'output', 'publish_mqtt', {
    init(b: any) {
      b.appendValueInput('PAYLOAD')
        .setCheck(null)
        .appendField('MQTT 발행');
      b.appendDummyInput()
        .appendField('토픽')
        .appendField(new Blockly.FieldTextInput('factory/line/sensor'), 'TOPIC');
      b.setInputsInline(true);
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('지정된 토픽으로 페이로드를 MQTT 발행');
    },
  });

  defineBlock(Blockly, 'output', 'send_alarm', {
    init(b: any) {
      b.appendDummyInput()
        .appendField('알람 전송')
        .appendField(new Blockly.FieldDropdown([
          ['이메일', 'email'],
          ['Slack', 'slack'],
          ['부저', 'buzzer'],
        ]), 'CHANNEL')
        .appendField(new Blockly.FieldTextInput('임계 초과'), 'MESSAGE');
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('지정된 채널로 알람 전송');
    },
  });

  defineBlock(Blockly, 'output', 'bit_result', {
    init(b: any) {
      b.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('BIT 결과')
        .appendField(new Blockly.FieldDropdown([['PASS', 'PASS'], ['FAIL', 'FAIL']]), 'VERDICT');
      b.setPreviousStatement(true, null);
      b.setNextStatement(true, null);
      b.setTooltip('내장시험(BIT) 합/불 판정 결과 기록');
    },
  });
}

// ----------------------------------------------------------------
// helpers
// ----------------------------------------------------------------
function defineBlock(
  Blockly: AnyBlockly,
  category: BlockCategory,
  type: string,
  spec: { init: (b: any) => void }
) {
  const hue = CATEGORY_HUE[category];
  Blockly.Blocks[type] = {
    init: function () {
      spec.init(this);
      this.setColour(hue);
    },
  };
}

function channelOptions(prefix: 'AI' | 'AO' | 'DI' | 'DO', count: number): [string, string][] {
  return Array.from({ length: count }, (_, i) => [`${prefix}${i}`, `${prefix}${i}`]);
}
