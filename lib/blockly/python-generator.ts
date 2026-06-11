/**
 * Nexys Blockly Studio — Python code generator
 *
 * 생성되는 Python 코드는 가상의 `nexys` SDK를 호출하는 형태:
 *
 *   import nexys
 *
 *   def loop_0():
 *       nexys.channels.do_write('DO0', 'HIGH')
 *       ...
 *
 *   def main():
 *       nexys.timing.loop_every(50, loop_0)
 *
 *   if __name__ == '__main__':
 *       main()
 *
 * 각 loop_every / repeat 블록은 별도 콜백 함수로 분리되어 가독성을 높인다.
 * 사용자가 직접 procedure 블록으로 함수를 정의할 수도 있다 (toolbox Functions).
 */

type AnyGenerator = any;

const TICK_COUNTER = Symbol.for('nexys.tickCounter');

function nextTickName(g: AnyGenerator): string {
  const n: number = (g[TICK_COUNTER] ?? 0) + 1;
  g[TICK_COUNTER] = n;
  return `loop_${n - 1}`;
}

function resetTickCounter(g: AnyGenerator): void {
  g[TICK_COUNTER] = 0;
}

/**
 * In Blockly 11 the Python generator's precedence enum was moved out of
 * `pythonGenerator.ORDER` and now lives as a top-level `Order` export from
 * `blockly/python`. We accept it as an arg so the caller can pass it in;
 * fallbacks cover legacy versions.
 */
export function registerPythonGenerators(pythonGenerator: AnyGenerator, OrderArg?: any): void {
  const ORDER =
    OrderArg ??
    pythonGenerator.ORDER ??
    pythonGenerator.Order ??
    // last-resort fallback: numeric values matching Blockly's enum
    { NONE: 99, ATOMIC: 0, FUNCTION_CALL: 2 };

  // ---------- Channels ----------
  pythonGenerator.forBlock['ai_read'] = (b: any) => {
    const ch = b.getFieldValue('CHANNEL');
    return [`nexys.channels.ai_read('${ch}')`, ORDER.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['ao_write'] = (b: any) => {
    const ch = b.getFieldValue('CHANNEL');
    const val = pythonGenerator.valueToCode(b, 'VALUE', ORDER.NONE) || '0';
    return `nexys.channels.ao_write('${ch}', ${val})\n`;
  };

  pythonGenerator.forBlock['di_read'] = (b: any) => {
    const ch = b.getFieldValue('CHANNEL');
    return [`nexys.channels.di_read('${ch}')`, ORDER.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['do_write'] = (b: any) => {
    const ch = b.getFieldValue('CHANNEL');
    const level = b.getFieldValue('LEVEL');
    return `nexys.channels.do_write('${ch}', '${level}')\n`;
  };

  pythonGenerator.forBlock['sensor_read'] = (b: any) => {
    const type = b.getFieldValue('SENSOR_TYPE');
    const ch = b.getFieldValue('CHANNEL');
    return [`nexys.channels.sensor_read('${type}', ${ch})`, ORDER.FUNCTION_CALL];
  };

  // ---------- Timing ----------
  // loop_every is a top-level block. Emit it as a named function + a registration line.
  // To keep the workspace-to-code output sane, we collect the registration via a stashed list
  // and emit the function inline (Blockly will dedent statements at workspaceToCode time).
  pythonGenerator.forBlock['loop_every'] = (b: any) => {
    const ms = b.getFieldValue('INTERVAL_MS');
    const name = nextTickName(pythonGenerator);
    const body = pythonGenerator.statementToCode(b, 'DO') || `${pythonGenerator.INDENT}pass\n`;
    // Provide both a clearly-named function and its scheduler call.
    return (
      `def ${name}():\n${body}` +
      `nexys.timing.loop_every(${ms}, ${name})\n`
    );
  };

  pythonGenerator.forBlock['delay_ms'] = (b: any) => {
    const ms = b.getFieldValue('MS');
    return `nexys.timing.delay_ms(${ms})\n`;
  };

  pythonGenerator.forBlock['wait_until'] = (b: any) => {
    const cond = pythonGenerator.valueToCode(b, 'CONDITION', ORDER.NONE) || 'False';
    return `nexys.timing.wait_until(lambda: ${cond})\n`;
  };

  pythonGenerator.forBlock['repeat_n_times'] = (b: any) => {
    const n = b.getFieldValue('N');
    const body = pythonGenerator.statementToCode(b, 'DO') || `${pythonGenerator.INDENT}pass\n`;
    return `for _ in range(${n}):\n${body}`;
  };

  // ---------- Signal Processing ----------
  pythonGenerator.forBlock['scale_linear'] = (b: any) => {
    const x = pythonGenerator.valueToCode(b, 'X', ORDER.NONE) || '0';
    const a = b.getFieldValue('A');
    const b0 = b.getFieldValue('B');
    return [`nexys.signal.scale_linear(${x}, ${a}, ${b0})`, ORDER.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['compute_rms'] = (b: any) => {
    const sig = pythonGenerator.valueToCode(b, 'SIGNAL', ORDER.NONE) || '0';
    const n = b.getFieldValue('N');
    return [`nexys.signal.rms(${sig}, samples=${n})`, ORDER.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['low_pass_filter'] = (b: any) => {
    const sig = pythonGenerator.valueToCode(b, 'SIGNAL', ORDER.NONE) || '0';
    const cutoff = b.getFieldValue('CUTOFF_HZ');
    return [`nexys.signal.lpf(${sig}, cutoff_hz=${cutoff})`, ORDER.FUNCTION_CALL];
  };

  pythonGenerator.forBlock['threshold_check'] = (b: any) => {
    const val = pythonGenerator.valueToCode(b, 'VALUE', ORDER.NONE) || '0';
    const low = b.getFieldValue('LOW');
    const high = b.getFieldValue('HIGH');
    return [`nexys.signal.in_range(${val}, ${low}, ${high})`, ORDER.FUNCTION_CALL];
  };

  // ---------- Logic ----------
  pythonGenerator.forBlock['if_channel_then'] = (b: any) => {
    const ch = b.getFieldValue('CHANNEL');
    const level = b.getFieldValue('LEVEL');
    const body = pythonGenerator.statementToCode(b, 'DO') || `${pythonGenerator.INDENT}pass\n`;
    const cond = level === 'HIGH'
      ? `nexys.channels.di_read('${ch}')`
      : `not nexys.channels.di_read('${ch}')`;
    return `if ${cond}:\n${body}`;
  };

  // ---------- Output ----------
  pythonGenerator.forBlock['log_to_tdms'] = (b: any) => {
    const val = pythonGenerator.valueToCode(b, 'VALUE', ORDER.NONE) || '0';
    const name = b.getFieldValue('CHANNEL_NAME');
    return `nexys.output.log_tdms('${name}', ${val})\n`;
  };

  pythonGenerator.forBlock['publish_mqtt'] = (b: any) => {
    const payload = pythonGenerator.valueToCode(b, 'PAYLOAD', ORDER.NONE) || 'None';
    const topic = b.getFieldValue('TOPIC');
    return `nexys.output.mqtt_publish('${topic}', ${payload})\n`;
  };

  pythonGenerator.forBlock['send_alarm'] = (b: any) => {
    const ch = b.getFieldValue('CHANNEL');
    const msg = b.getFieldValue('MESSAGE');
    return `nexys.output.alarm('${ch}', '${msg}')\n`;
  };

  pythonGenerator.forBlock['bit_result'] = (b: any) => {
    const verdict = b.getFieldValue('VERDICT');
    const val = pythonGenerator.valueToCode(b, 'VALUE', ORDER.NONE) || '0';
    return `nexys.output.bit_result('${verdict}', value=${val})\n`;
  };
}

/**
 * Workspace 전체 코드를 정리된 형태로 묶는다.
 *   - 헤더 (import)
 *   - 각 top-level 블록의 생성 결과 (loop 콜백 정의 + 등록)
 *   - main() 래퍼와 entry guard
 *
 * 사용자가 추가한 사용자 정의 함수(procedures_*)는 이미 Blockly가 자체 `def`로
 * 토출하므로, 그대로 main() 위쪽에 모인다.
 */
export function buildFullPython(pythonGenerator: AnyGenerator, workspace: unknown): string {
  resetTickCounter(pythonGenerator);
  let body = '';
  try {
    body = pythonGenerator.workspaceToCode(workspace as any) || '';
  } catch (err) {
    // Surface generator errors so they're not silently swallowed — the
    // Python preview stays blank otherwise and is impossible to diagnose.
    console.error('[nexys] pythonGenerator.workspaceToCode threw', err);
    return (
      PYTHON_HEADER +
      `\n# ⚠ Code generator error: ${String((err as any)?.message ?? err)}\n` +
      '# Check the browser console for stack trace.\n'
    );
  }

  const trimmed = body.trim();
  if (!trimmed) {
    return PYTHON_HEADER + '\ndef main() -> None:\n    """Empty workspace — drag blocks to start."""\n    pass\n\n\nif __name__ == "__main__":\n    main()\n';
  }

  // Separate function definitions (def ...) from top-level expressions.
  const lines = body.split('\n');
  const defs: string[] = [];
  const top: string[] = [];
  let inDef = false;
  let buf: string[] = [];

  const flush = () => {
    if (buf.length === 0) return;
    if (inDef) defs.push(buf.join('\n'));
    else top.push(buf.join('\n'));
    buf = [];
  };

  for (const line of lines) {
    if (line.startsWith('def ')) {
      flush();
      inDef = true;
      buf.push(line);
    } else if (inDef && (line.startsWith(' ') || line.startsWith('\t') || line.trim() === '')) {
      buf.push(line);
    } else {
      if (inDef) { flush(); inDef = false; }
      buf.push(line);
    }
  }
  flush();

  const defSection = defs.length ? defs.join('\n\n') + '\n\n' : '';
  const mainBody = top
    .filter(s => s.trim().length > 0)
    .map(s => s.split('\n').map(l => l.length ? '    ' + l : l).join('\n'))
    .join('\n');

  const mainBlock = mainBody
    ? `def main() -> None:\n${mainBody}\n`
    : `def main() -> None:\n    pass\n`;

  return (
    PYTHON_HEADER +
    '\n' +
    defSection +
    mainBlock +
    '\n\nif __name__ == "__main__":\n    main()\n'
  );
}

/**
 * 워크스페이스 최상위에 한 번만 추가될 헤더.
 */
export const PYTHON_HEADER = `# Generated by Nexys Blockly Studio
# Do not edit — modify blocks in the visual editor instead.
import nexys
`;
