/**
 * Generic workspace walker for non-Python targets (Arduino, STM32).
 *
 * Walks a Blockly workspace JSON snapshot and calls the supplied `Emitter`
 * for each block, getting back target-specific source strings. Same JSON
 * shape the simulator interprets (lib/simulator/runner.ts), so we stay in
 * sync with what the user sees executing.
 */

import type { WorkspaceJSON } from './types';
import { getModules, moduleFuncName, moduleIdFromType } from '@/lib/blockly/module-store';

type BlockJSON = {
  type: string;
  fields?: Record<string, any>;
  extraState?: Record<string, any>;
  inputs?: Record<string, { block?: BlockJSON; shadow?: BlockJSON }>;
  next?: { block?: BlockJSON };
};

export interface EmitContext {
  /** Allocate a unique loop name (`loop_0`, `loop_1`, ...) */
  nextLoopName(): string;
  /** Channels actually used by the program — emitters use this for pinMode setup */
  usedChannels: Set<string>;
}

export interface Emitter {
  // ── overall structure ──
  /** File header + #includes + globals */
  preamble(usedChannels: Set<string>, varNames: string[]): string;
  /** Wrap loop callbacks + setup + main loop scheduler */
  assemble(opts: {
    varDecls: string;
    procDefs: string;
    loopCallbacks: Array<{ name: string; intervalMs: number; body: string }>;
    mainStatements: string;
  }): string;

  // ── statement-level ──
  delay(ms: number): string;
  repeat(n: number, body: string): string;
  ifThen(cond: string, then: string, els: string | null): string;
  waitUntil(cond: string): string;

  doWrite(channel: string, level: 'HIGH' | 'LOW'): string;
  aoWrite(channel: string, valueExpr: string): string;

  logTdms(name: string, valueExpr: string): string;
  publishMqtt(topic: string, payloadExpr: string): string;
  alarm(via: string, message: string): string;
  bitResult(verdict: 'PASS' | 'FAIL', valueExpr: string): string;

  varSet(name: string, valueExpr: string): string;
  procCall(name: string): string;

  ifChannelThen(channel: string, level: 'HIGH' | 'LOW', body: string): string;

  // ── expression-level ──
  aiRead(channel: string): string;
  diRead(channel: string): string;
  sensorRead(sensor: string, channel: number): string;

  scaleLinear(x: string, a: number, b: number): string;
  computeRms(sig: string, n: number): string;
  lpf(sig: string, hz: number): string;
  thresholdCheck(v: string, low: number, high: number): string;

  num(n: number): string;
  bool(v: boolean): string;
  text(s: string): string;
  varGet(name: string): string;

  arith(op: string, a: string, b: string): string;
  compare(op: string, a: string, b: string): string;
  logicOp(op: string, a: string, b: string): string;

  /** Function definition for user procedures */
  procDef(name: string, body: string): string;

  /** Indent unit — typically '    ' (4 spaces) or '  ' (2 spaces) */
  indent: string;
}

// ----------------------------------------------------------------
//  walk entry point
// ----------------------------------------------------------------

export function walkWorkspace(json: WorkspaceJSON, emit: Emitter): string {
  const blocks = (json?.blocks?.blocks ?? []) as BlockJSON[];
  const variables = (json?.variables ?? []) as Array<{ id: string; name: string }>;
  const varNameById = new Map(variables.map(v => [v.id, v.name]));

  const ctx: EmitContext = {
    _loopN: 0,
    nextLoopName() {
      const n = (this as any)._loopN++;
      return `loop_${n}`;
    },
    usedChannels: new Set<string>(),
  } as EmitContext & { _loopN: number };

  // Separate procedure defs from runnable top-level blocks
  const procDefs = blocks.filter(b =>
    b.type === 'procedures_defnoreturn' || b.type === 'procedures_defreturn'
  );
  const runnable = blocks.filter(b =>
    b.type !== 'procedures_defnoreturn' && b.type !== 'procedures_defreturn'
  );

  // Walk procedure bodies into emitter.procDef
  const proc_src = procDefs.map(p => {
    const name = String(p.fields?.NAME ?? `proc_${Math.random()}`).trim() || 'unnamed_proc';
    const body = walkStatement(input(p, 'STACK'), emit, ctx, varNameById);
    return emit.procDef(safeName(name), body);
  }).join('\n\n');

  // Modules (Sub-VIs) become functions too — one def per module, body walked
  // from the captured serialization. Reuses emit.procDef so each target gets
  // proper void func syntax.
  const module_src = getModules().map(m => {
    const bodyBlock = m.bodyState as BlockJSON | undefined;
    const body = walkStatement(bodyBlock, emit, ctx, varNameById);
    return emit.procDef(moduleFuncName(m.name), body);
  }).join('\n\n');

  // Collect loop_every blocks separately so the emitter can schedule them
  const loopCallbacks: Array<{ name: string; intervalMs: number; body: string }> = [];
  const mainStmtsAcc: string[] = [];

  for (const top of runnable) {
    if (top.type === 'loop_every') {
      const ms = num(top.fields?.INTERVAL_MS, 10);
      const name = ctx.nextLoopName();
      const body = walkStatement(input(top, 'DO'), emit, ctx, varNameById);
      loopCallbacks.push({ name, intervalMs: ms, body });
    } else {
      // top-level non-loop statements run once at startup
      mainStmtsAcc.push(walkStatement(top, emit, ctx, varNameById));
    }
  }

  const varDecls = variables.map(v => emit.varSet(safeName(v.name), emit.num(0))).join('\n');
  const mainStatements = mainStmtsAcc.filter(Boolean).join('\n');

  const allDefs = [proc_src, module_src].filter(s => s.trim()).join('\n\n');

  return emit.preamble(ctx.usedChannels, variables.map(v => safeName(v.name)))
    + '\n\n'
    + emit.assemble({ varDecls, procDefs: allDefs, loopCallbacks, mainStatements });
}

// ----------------------------------------------------------------
//  recursive walkers
// ----------------------------------------------------------------

function walkStatement(
  b: BlockJSON | undefined,
  emit: Emitter,
  ctx: EmitContext,
  varNames: Map<string, string>,
): string {
  const parts: string[] = [];
  let cur = b;
  while (cur) {
    parts.push(stmt(cur, emit, ctx, varNames));
    cur = cur.next?.block;
  }
  return parts.filter(Boolean).join('\n');
}

function stmt(b: BlockJSON, emit: Emitter, ctx: EmitContext, vn: Map<string, string>): string {
  switch (b.type) {
    case 'delay_ms':
      return emit.delay(num(b.fields?.MS, 1));

    case 'repeat_n_times': {
      const n = num(b.fields?.N, 1);
      const body = walkStatement(input(b, 'DO'), emit, ctx, vn);
      return emit.repeat(n, body);
    }

    case 'wait_until': {
      const cond = expr(input(b, 'CONDITION'), emit, ctx, vn);
      return emit.waitUntil(cond);
    }

    case 'do_write': {
      const ch = String(b.fields?.CHANNEL ?? 'DO0');
      const lvl = String(b.fields?.LEVEL ?? 'LOW') as 'HIGH' | 'LOW';
      ctx.usedChannels.add(ch);
      return emit.doWrite(ch, lvl);
    }

    case 'ao_write': {
      const ch = String(b.fields?.CHANNEL ?? 'AO0');
      ctx.usedChannels.add(ch);
      return emit.aoWrite(ch, expr(input(b, 'VALUE'), emit, ctx, vn));
    }

    case 'log_to_tdms':
      return emit.logTdms(String(b.fields?.CHANNEL_NAME ?? 'channel'), expr(input(b, 'VALUE'), emit, ctx, vn));

    case 'publish_mqtt':
      return emit.publishMqtt(String(b.fields?.TOPIC ?? ''), expr(input(b, 'PAYLOAD'), emit, ctx, vn));

    case 'send_alarm':
      return emit.alarm(String(b.fields?.CHANNEL ?? 'email'), String(b.fields?.MESSAGE ?? ''));

    case 'bit_result': {
      const v = String(b.fields?.VERDICT ?? 'PASS') as 'PASS' | 'FAIL';
      return emit.bitResult(v, expr(input(b, 'VALUE'), emit, ctx, vn));
    }

    case 'if_channel_then': {
      const ch = String(b.fields?.CHANNEL ?? 'DI0');
      const lvl = String(b.fields?.LEVEL ?? 'HIGH') as 'HIGH' | 'LOW';
      ctx.usedChannels.add(ch);
      return emit.ifChannelThen(ch, lvl, walkStatement(input(b, 'DO'), emit, ctx, vn));
    }

    case 'controls_if': {
      // walk the first IF/DO pair only — multi-branch elif is rare in our blocks
      const cond = expr(input(b, 'IF0'), emit, ctx, vn);
      const then = walkStatement(input(b, 'DO0'), emit, ctx, vn);
      const els = b.inputs?.ELSE ? walkStatement(input(b, 'ELSE'), emit, ctx, vn) : null;
      return emit.ifThen(cond, then, els);
    }

    case 'variables_set': {
      const id = varRefId(b.fields?.VAR);
      const name = vn.get(id) ?? id;
      return emit.varSet(safeName(name), expr(input(b, 'VALUE'), emit, ctx, vn));
    }

    case 'procedures_callnoreturn': {
      const name = String(b.extraState?.name ?? b.fields?.NAME ?? '').trim() || 'unknown';
      return emit.procCall(safeName(name));
    }

    default: {
      // Module (Sub-VI) call block → call the shared function
      const modId = moduleIdFromType(b.type);
      if (modId) {
        const mod = getModules().find(m => m.id === modId);
        return emit.procCall(moduleFuncName(mod?.name ?? modId));
      }
      // unknown statement — emit as a comment so output stays informative
      return `// ⚠ unsupported block: ${b.type}`;
    }
  }
}

function expr(b: BlockJSON | undefined, emit: Emitter, ctx: EmitContext, vn: Map<string, string>): string {
  if (!b) return emit.num(0);
  switch (b.type) {
    case 'ai_read': {
      const ch = String(b.fields?.CHANNEL ?? 'AI0');
      ctx.usedChannels.add(ch);
      return emit.aiRead(ch);
    }
    case 'di_read': {
      const ch = String(b.fields?.CHANNEL ?? 'DI0');
      ctx.usedChannels.add(ch);
      return emit.diRead(ch);
    }
    case 'sensor_read':
      return emit.sensorRead(String(b.fields?.SENSOR_TYPE ?? 'thermo'), num(b.fields?.CHANNEL, 0));
    case 'scale_linear':
      return emit.scaleLinear(expr(input(b, 'X'), emit, ctx, vn), num(b.fields?.A, 1), num(b.fields?.B, 0));
    case 'compute_rms':
      return emit.computeRms(expr(input(b, 'SIGNAL'), emit, ctx, vn), num(b.fields?.N, 100));
    case 'low_pass_filter':
      return emit.lpf(expr(input(b, 'SIGNAL'), emit, ctx, vn), num(b.fields?.CUTOFF_HZ, 50));
    case 'threshold_check':
      return emit.thresholdCheck(expr(input(b, 'VALUE'), emit, ctx, vn), num(b.fields?.LOW, 0), num(b.fields?.HIGH, 5));
    case 'math_number':
      return emit.num(num(b.fields?.NUM, 0));
    case 'logic_boolean':
      return emit.bool(String(b.fields?.BOOL) === 'TRUE');
    case 'text':
      return emit.text(String(b.fields?.TEXT ?? ''));
    case 'math_arithmetic':
      return emit.arith(
        String(b.fields?.OP ?? 'ADD'),
        expr(input(b, 'A'), emit, ctx, vn),
        expr(input(b, 'B'), emit, ctx, vn),
      );
    case 'logic_compare':
      return emit.compare(
        String(b.fields?.OP ?? 'EQ'),
        expr(input(b, 'A'), emit, ctx, vn),
        expr(input(b, 'B'), emit, ctx, vn),
      );
    case 'logic_operation':
      return emit.logicOp(
        String(b.fields?.OP ?? 'AND'),
        expr(input(b, 'A'), emit, ctx, vn),
        expr(input(b, 'B'), emit, ctx, vn),
      );
    case 'variables_get': {
      const id = varRefId(b.fields?.VAR);
      const name = vn.get(id) ?? id;
      return emit.varGet(safeName(name));
    }
    default:
      return emit.num(0);
  }
}

// ----------------------------------------------------------------
//  helpers
// ----------------------------------------------------------------

function input(b: BlockJSON, key: string): BlockJSON | undefined {
  const slot = b.inputs?.[key];
  return slot?.block ?? slot?.shadow;
}
function num(v: unknown, fb: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}
function varRefId(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') return String(field.id ?? field.name ?? '');
  return '';
}
function safeName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'unnamed';
}

/** Indent a multi-line body by N levels of `indent` */
export function indentBody(body: string, indent: string, level = 1): string {
  if (!body.trim()) return `${indent.repeat(level)}// (empty)`;
  return body.split('\n').map(l => l ? indent.repeat(level) + l : l).join('\n');
}
