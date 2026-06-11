/**
 * Virtual Nexys runtime — interprets a Blockly workspace JSON in-browser,
 * producing logs and channel state without any hardware.
 *
 * Design notes:
 *   - Walks the JSON tree rather than parsing generated Python; safer & no eval.
 *   - Each "thread" (top-level loop_every) runs as an async loop that yields to the
 *     event loop between iterations, so the UI stays responsive.
 *   - AI readings are simulated as channel-specific sine waves + noise so the
 *     time-series feels realistic to a measurement engineer.
 *   - Hard upper bound on log retention (5000 entries) to keep memory bounded.
 *   - Supports Blockly built-in variables_get/set and procedures_def/call so
 *     user-defined functions actually execute.
 */

import {
  INITIAL_CHANNEL_STATE,
  INITIAL_METRICS,
  HISTORY_LEN,
  type LogEntry,
  type LogLevel,
  type SimSnapshot,
  type ChannelState,
} from './types';
import type { Bindings, Inputs } from '@/lib/hardware/devices';
import { getModules, moduleIdFromType } from '@/lib/blockly/module-store';

const MAX_LOGS = 5000;
const MAX_ITERATIONS = 100_000; // hard guard against runaway scripts

type BlockJSON = {
  type: string;
  fields?: Record<string, any>;
  extraState?: Record<string, any>;
  inputs?: Record<string, { block?: BlockJSON; shadow?: BlockJSON }>;
  next?: { block?: BlockJSON };
};

/** Reads an input slot's effective block — real connection takes priority,
 *  otherwise the shadow default that the toolbox seeded. */
function input(b: BlockJSON | undefined, key: string): BlockJSON | undefined {
  const slot = b?.inputs?.[key];
  return slot?.block ?? slot?.shadow;
}

type WorkspaceJSON = {
  blocks?: { blocks?: BlockJSON[] };
  variables?: Array<{ id: string; name: string }>;
};

interface ProcedureDef {
  type: 'noreturn' | 'return';
  body: BlockJSON | undefined;
  returnExpr: BlockJSON | undefined;
}

export type Listener = (snapshot: SimSnapshot) => void;

export class SimRunner {
  private snapshot: SimSnapshot;
  private listeners = new Set<Listener>();
  private aborted = false;
  private threads: Promise<void>[] = [];
  private notifyScheduled = false;

  // execution scope
  private vars: Map<string, any> = new Map();
  private varNames: Map<string, string> = new Map(); // id -> name (for logging)
  private procs: Map<string, ProcedureDef> = new Map();

  // hardware bindings (mutable while running — user can twiddle pot, push button)
  private bindings: Bindings = {};
  private inputs: Inputs = {};

  constructor() {
    this.snapshot = this.freshSnapshot();
  }

  private freshSnapshot(): SimSnapshot {
    return {
      status: 'idle',
      startedAt: null,
      channels: cloneChannels(INITIAL_CHANNEL_STATE),
      logs: [],
      metrics: { ...INITIAL_METRICS },
    };
  }

  getSnapshot(): SimSnapshot {
    return this.snapshot;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.snapshot);
    return () => this.listeners.delete(fn);
  }

  private scheduleNotify(): void {
    if (this.notifyScheduled) return;
    this.notifyScheduled = true;
    // batch notifications at most ~60Hz
    setTimeout(() => {
      this.notifyScheduled = false;
      // create new outer + channels refs so React sees identity change
      this.snapshot = {
        ...this.snapshot,
        channels: {
          ai: [...this.snapshot.channels.ai],
          ao: [...this.snapshot.channels.ao],
          di: [...this.snapshot.channels.di],
          do: [...this.snapshot.channels.do],
          aiHistory: this.snapshot.channels.aiHistory.map(h => [...h]),
          aoHistory: this.snapshot.channels.aoHistory.map(h => [...h]),
        },
        metrics: { ...this.snapshot.metrics },
      };
      for (const l of this.listeners) l(this.snapshot);
    }, 16);
  }

  private now(): number {
    return this.snapshot.startedAt ? Date.now() - this.snapshot.startedAt : 0;
  }

  private log(level: LogLevel, source: string, message: string): void {
    const entry: LogEntry = { t: this.now(), level, source, message };
    const logs = this.snapshot.logs;
    logs.push(entry);
    if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
    this.scheduleNotify();
  }

  start(workspaceJson: unknown): void {
    if (this.snapshot.status === 'running') return;
    this.aborted = false;
    this.vars = new Map();
    this.varNames = new Map();
    this.procs = new Map();

    this.snapshot = {
      status: 'running',
      startedAt: Date.now(),
      channels: cloneChannels(INITIAL_CHANNEL_STATE),
      logs: [],
      metrics: { ...INITIAL_METRICS },
    };
    this.scheduleNotify();

    const ws = workspaceJson as WorkspaceJSON;
    const blocks = ws?.blocks?.blocks ?? [];

    // index variables for label lookup
    for (const v of ws?.variables ?? []) {
      this.varNames.set(v.id, v.name);
    }

    // pre-pass: register user-defined procedures so call sites resolve
    for (const b of blocks) {
      if (b.type === 'procedures_defnoreturn' || b.type === 'procedures_defreturn') {
        const name = String(b.fields?.NAME ?? '').trim() || `proc_${this.procs.size}`;
        this.procs.set(name, {
          type: b.type === 'procedures_defreturn' ? 'return' : 'noreturn',
          body: input(b, "STACK"),
          returnExpr: input(b, "RETURN"),
        });
        this.log('info', `def:${name}`, `procedure registered`);
      }
    }

    const runnable = blocks.filter(
      b => b.type !== 'procedures_defnoreturn' && b.type !== 'procedures_defreturn'
    );

    if (runnable.length === 0 && this.procs.size === 0) {
      this.log('warn', 'runtime', 'Empty workspace — nothing to execute.');
      this.snapshot = { ...this.snapshot, status: 'stopped' };
      this.scheduleNotify();
      return;
    }

    this.log(
      'info', 'runtime',
      `nexys-agent (virtual) started — ${runnable.length} thread(s), ${this.procs.size} function(s).`
    );

    this.threads = runnable.map((b) => this.runTopBlock(b));
    Promise.allSettled(this.threads).then(() => {
      if (this.snapshot.status === 'running') {
        this.snapshot = { ...this.snapshot, status: 'stopped' };
        this.log('info', 'runtime', 'All threads exited.');
        this.scheduleNotify();
      }
    });
  }

  stop(): void {
    if (this.snapshot.status !== 'running') return;
    this.aborted = true;
    this.snapshot = { ...this.snapshot, status: 'stopped' };
    this.log('info', 'runtime', 'Stopped by user.');
    this.scheduleNotify();
  }

  reset(): void {
    this.aborted = true;
    this.snapshot = this.freshSnapshot();
    this.scheduleNotify();
  }

  /** Replace the active bindings map. Cheap — runner uses it on next read. */
  setBindings(b: Bindings): void {
    this.bindings = b;
  }

  /** Update a single user-controlled input.
   *  - AI channels: stored; readAI consumes it on next sample
   *  - DI channels: stored; readDI consumes it on next sample
   *  - AO channels: ALSO pushed directly to live state so a Manual AO Source
   *    slider drives the channel value visibly even without any block running
   */
  setInput(channel: string, value: number | boolean): void {
    this.inputs = { ...this.inputs, [channel]: value };
    if (channel.startsWith('AO') && typeof value === 'number') {
      const idx = parseInt(channel.slice(2), 10);
      if (idx >= 0 && idx < this.snapshot.channels.ao.length) {
        this.snapshot.channels.ao[idx] = value;
        this.pushAoHistory(idx, value);
        this.scheduleNotify();
      }
    }
  }

  getInputs(): Inputs {
    return this.inputs;
  }

  // ----------------------------------------------------------------
  //  Execution
  // ----------------------------------------------------------------

  private async runTopBlock(block: BlockJSON): Promise<void> {
    try {
      await this.executeBlock(block);
    } catch (err: any) {
      if (!this.aborted) {
        this.log('warn', 'runtime', `Thread error: ${String(err?.message ?? err)}`);
        this.snapshot = { ...this.snapshot, status: 'error', lastError: String(err) };
        this.scheduleNotify();
      }
    }
  }

  /** Execute a block AND its `next` chain in sequence. */
  private async executeBlock(block: BlockJSON | undefined): Promise<void> {
    let cur = block;
    while (cur && !this.aborted) {
      await this.executeOne(cur);
      cur = cur.next?.block;
    }
  }

  private async executeOne(block: BlockJSON): Promise<void> {
    switch (block.type) {
      case 'loop_every': {
        const ms = num(block.fields?.INTERVAL_MS, 10);
        const body = input(block, "DO");
        this.log('info', 'loop', `loop_every(${ms}ms) registered.`);
        while (!this.aborted && this.snapshot.metrics.iterations < MAX_ITERATIONS) {
          await this.executeBlock(body);
          this.snapshot.metrics.iterations += 1;
          await sleep(ms);
        }
        return;
      }

      case 'repeat_n_times': {
        const n = Math.min(num(block.fields?.N, 1), MAX_ITERATIONS);
        const body = input(block, "DO");
        for (let i = 0; i < n && !this.aborted; i++) {
          await this.executeBlock(body);
        }
        return;
      }

      case 'delay_ms': {
        const ms = num(block.fields?.MS, 1);
        await sleep(ms);
        return;
      }

      case 'wait_until': {
        const cond = input(block, "CONDITION");
        const deadline = Date.now() + 5000; // safety cap 5s
        while (!this.aborted) {
          const v = await this.evalExpression(cond);
          if (v) return;
          if (Date.now() > deadline) {
            this.log('warn', 'wait_until', 'Timeout (>5s) — continuing anyway.');
            return;
          }
          await sleep(20);
        }
        return;
      }

      case 'do_write': {
        const ch = String(block.fields?.CHANNEL ?? 'DO0');
        const level = String(block.fields?.LEVEL ?? 'LOW');
        const idx = chIndex(ch);
        if (idx >= 0 && idx < this.snapshot.channels.do.length) {
          this.snapshot.channels.do[idx] = level === 'HIGH';
        }
        this.log('data', ch, `← ${level}`);
        return;
      }

      case 'ao_write': {
        const ch = String(block.fields?.CHANNEL ?? 'AO0');
        const v = await this.evalExpression(input(block, "VALUE"));
        const idx = chIndex(ch);
        const num0 = Number(v) || 0;
        if (idx >= 0 && idx < this.snapshot.channels.ao.length) {
          this.snapshot.channels.ao[idx] = num0;
          this.pushAoHistory(idx, num0);
        }
        this.log('data', ch, `← ${num0.toFixed(3)} V`);
        return;
      }

      case 'log_to_tdms': {
        const name = String(block.fields?.CHANNEL_NAME ?? 'channel');
        const v = await this.evalExpression(input(block, "VALUE"));
        const num0 = Number(v) || 0;
        this.snapshot.metrics.samples += 1;
        this.log('data', `TDMS:${name}`, `${num0.toFixed(4)}`);
        return;
      }

      case 'publish_mqtt': {
        const topic = String(block.fields?.TOPIC ?? '');
        const payload = await this.evalExpression(input(block, "PAYLOAD"));
        this.log('info', `MQTT:${topic}`, String(payload));
        return;
      }

      case 'send_alarm': {
        const ch = String(block.fields?.CHANNEL ?? 'email');
        const msg = String(block.fields?.MESSAGE ?? 'alarm');
        this.snapshot.metrics.alarms += 1;
        this.log('alarm', `alarm:${ch}`, msg);
        return;
      }

      case 'bit_result': {
        const verdict = String(block.fields?.VERDICT ?? 'PASS');
        const v = await this.evalExpression(input(block, "VALUE"));
        const num0 = Number(v) || 0;
        if (verdict === 'PASS') this.snapshot.metrics.bitPass += 1;
        else this.snapshot.metrics.bitFail += 1;
        this.log('bit', 'BIT', `${verdict} · ${num0.toFixed(3)}`);
        return;
      }

      case 'if_channel_then': {
        const ch = String(block.fields?.CHANNEL ?? 'DI0');
        const level = String(block.fields?.LEVEL ?? 'HIGH');
        const idx = chIndex(ch);
        const di = idx >= 0 ? this.simulateDI(idx) : false;
        const match = (level === 'HIGH') === di;
        if (match) {
          await this.executeBlock(input(block, "DO"));
        }
        return;
      }

      case 'controls_if': {
        // Blockly basic if/elseif/else block
        for (let i = 0; i < 10; i++) {
          const condKey = i === 0 ? 'IF0' : `IF${i}`;
          const doKey = i === 0 ? 'DO0' : `DO${i}`;
          if (!block.inputs?.[condKey]) {
            if (block.inputs?.ELSE) await this.executeBlock(input(block, "ELSE"));
            return;
          }
          const cond = await this.evalExpression(input(block, condKey));
          if (cond) {
            await this.executeBlock(input(block, doKey));
            return;
          }
        }
        return;
      }

      // ---- Variables ----
      case 'variables_set': {
        const ref = varRef(block.fields?.VAR);
        const name = this.varNames.get(ref) ?? ref;
        const v = await this.evalExpression(input(block, "VALUE"));
        this.vars.set(ref, v);
        this.log('data', `var:${name}`, `← ${formatValue(v)}`);
        return;
      }

      // ---- Procedure calls (statement) ----
      case 'procedures_callnoreturn': {
        await this.callProc(block);
        return;
      }

      default: {
        // ---- Module (Sub-VI) call block ----
        const modId = moduleIdFromType(block.type);
        if (modId) {
          const mod = getModules().find(m => m.id === modId);
          if (mod?.bodyState) {
            this.log('info', `module:${mod.name}`, 'enter');
            await this.executeBlock(mod.bodyState as BlockJSON);
          } else {
            this.log('warn', `module:${modId}`, 'undefined module');
          }
          return;
        }
        // expression-only block accidentally placed as statement — eval & toss
        await this.evalExpression(block);
      }
    }
  }

  private async callProc(block: BlockJSON): Promise<any> {
    const name = String(
      block.extraState?.name ?? block.fields?.NAME ?? ''
    ).trim();
    const def = this.procs.get(name);
    if (!def) {
      this.log('warn', `call:${name}`, 'undefined procedure');
      return 0;
    }
    await this.executeBlock(def.body);
    if (def.type === 'return') {
      return await this.evalExpression(def.returnExpr);
    }
    return undefined;
  }

  // ----------------------------------------------------------------
  //  Expression evaluation
  // ----------------------------------------------------------------
  private async evalExpression(block: BlockJSON | undefined): Promise<any> {
    if (!block) return 0;
    switch (block.type) {
      case 'ai_read': {
        const ch = String(block.fields?.CHANNEL ?? 'AI0');
        const idx = chIndex(ch);
        const safeIdx = idx >= 0 ? idx : 0;
        const v = this.readAI(ch, safeIdx);
        this.snapshot.channels.ai[safeIdx] = v;
        this.pushAiHistory(safeIdx, v);
        return v;
      }
      case 'di_read': {
        const ch = String(block.fields?.CHANNEL ?? 'DI0');
        const idx = chIndex(ch);
        const safeIdx = idx >= 0 ? idx : 0;
        const v = this.readDI(ch, safeIdx);
        this.snapshot.channels.di[safeIdx] = v;
        return v;
      }
      case 'sensor_read': {
        const type = String(block.fields?.SENSOR_TYPE ?? 'thermocouple');
        return this.simulateSensor(type);
      }
      case 'scale_linear': {
        const x = Number(await this.evalExpression(input(block, "X"))) || 0;
        const a = num(block.fields?.A, 1);
        const b = num(block.fields?.B, 0);
        return a * x + b;
      }
      case 'compute_rms': {
        // simplified: take instantaneous |x| (avoids a circular buffer in MVP)
        const x = Number(await this.evalExpression(input(block, "SIGNAL"))) || 0;
        return Math.abs(x) * 0.707;
      }
      case 'low_pass_filter': {
        // pass-through with mild attenuation, plenty for visual demo
        const x = Number(await this.evalExpression(input(block, "SIGNAL"))) || 0;
        return x * 0.95;
      }
      case 'threshold_check': {
        const v = Number(await this.evalExpression(input(block, "VALUE"))) || 0;
        const low = num(block.fields?.LOW, 0);
        const high = num(block.fields?.HIGH, 0);
        return v >= low && v <= high;
      }
      case 'math_number':
        return num(block.fields?.NUM, 0);
      case 'logic_boolean':
        return String(block.fields?.BOOL) === 'TRUE';
      case 'math_arithmetic': {
        const a = Number(await this.evalExpression(input(block, "A"))) || 0;
        const b = Number(await this.evalExpression(input(block, "B"))) || 0;
        const op = String(block.fields?.OP ?? 'ADD');
        switch (op) {
          case 'MINUS': return a - b;
          case 'MULTIPLY': return a * b;
          case 'DIVIDE': return b === 0 ? 0 : a / b;
          case 'POWER': return Math.pow(a, b);
          default: return a + b;
        }
      }
      case 'logic_compare': {
        const a = await this.evalExpression(input(block, "A"));
        const b = await this.evalExpression(input(block, "B"));
        const op = String(block.fields?.OP ?? 'EQ');
        switch (op) {
          case 'NEQ': return a !== b;
          case 'LT': return a < b;
          case 'LTE': return a <= b;
          case 'GT': return a > b;
          case 'GTE': return a >= b;
          default: return a === b;
        }
      }
      case 'logic_operation': {
        const a = !!(await this.evalExpression(input(block, "A")));
        const b = !!(await this.evalExpression(input(block, "B")));
        return String(block.fields?.OP) === 'OR' ? a || b : a && b;
      }
      case 'text':
        return String(block.fields?.TEXT ?? '');

      // ---- Variables ----
      case 'variables_get': {
        const ref = varRef(block.fields?.VAR);
        return this.vars.has(ref) ? this.vars.get(ref) : 0;
      }

      // ---- Procedure call returning a value ----
      case 'procedures_callreturn': {
        return await this.callProc(block);
      }

      default:
        return 0;
    }
  }

  // ----------------------------------------------------------------
  //  Channel history (for sparklines)
  // ----------------------------------------------------------------
  private pushAiHistory(idx: number, v: number): void {
    const buf = this.snapshot.channels.aiHistory[idx];
    if (!buf) return;
    buf.push(v);
    if (buf.length > HISTORY_LEN) buf.splice(0, buf.length - HISTORY_LEN);
  }

  private pushAoHistory(idx: number, v: number): void {
    const buf = this.snapshot.channels.aoHistory[idx];
    if (!buf) return;
    buf.push(v);
    if (buf.length > HISTORY_LEN) buf.splice(0, buf.length - HISTORY_LEN);
  }

  // ----------------------------------------------------------------
  //  Channel read — respects active hardware bindings
  // ----------------------------------------------------------------
  private readAI(channel: string, idx: number): number {
    const deviceId = this.bindings[channel];
    switch (deviceId) {
      case 'thermo':   return this.simulateSensor('thermocouple');
      case 'pressure': return this.simulateSensor('pressure');
      case 'strain':   return this.simulateSensor('strain');
      case 'accel':    return this.simulateSensor('accel');
      case 'pot': {
        const v = this.inputs[channel];
        return typeof v === 'number' ? v : 0;
      }
      default:
        return this.simulateAI(idx);
    }
  }

  private readDI(channel: string, idx: number): boolean {
    const deviceId = this.bindings[channel];
    switch (deviceId) {
      case 'button':
      case 'switch': {
        const v = this.inputs[channel];
        return v === true;
      }
      default:
        return this.simulateDI(idx);
    }
  }

  // ----------------------------------------------------------------
  //  Synthetic signals (deterministic per channel — used when no
  //  hardware binding overrides the channel)
  // ----------------------------------------------------------------
  private simulateAI(idx: number): number {
    const t = this.now() / 1000;
    // distinct frequency per channel + small noise → realistic-looking trace
    const freq = 0.5 + idx * 0.25;
    const amp = 1.2 + (idx % 3) * 0.4;
    const base = 2.5;
    const noise = (Math.random() - 0.5) * 0.05;
    return base + amp * Math.sin(2 * Math.PI * freq * t) + noise;
  }

  private simulateDI(idx: number): boolean {
    const t = this.now() / 1000;
    // alternate HIGH/LOW with channel-specific period
    const period = 0.8 + idx * 0.2;
    return Math.floor(t / period) % 2 === 0;
  }

  private simulateSensor(type: string): number {
    const t = this.now() / 1000;
    switch (type) {
      case 'thermocouple':
        return 25 + 5 * Math.sin(t * 0.4) + (Math.random() - 0.5) * 0.3;
      case 'pressure':
        return 1.0 + 0.05 * Math.sin(t * 1.2) + (Math.random() - 0.5) * 0.01;
      case 'strain':
        return 120 + 8 * Math.sin(t * 0.8) + (Math.random() - 0.5) * 1;
      case 'accel':
        return Math.sin(t * 50) * 9.8 + (Math.random() - 0.5) * 0.5;
      default:
        return 0;
    }
  }
}

// ----------------------------------------------------------------
//  helpers
// ----------------------------------------------------------------

function num(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function chIndex(ch: string): number {
  const m = /^[A-Z]+(\d+)$/.exec(ch);
  return m ? Number(m[1]) : -1;
}

/** Blockly serializes `VAR` field as either a string id or an object {id, name}. */
function varRef(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') return String(field.id ?? field.name ?? '');
  return '';
}

function formatValue(v: any): string {
  if (typeof v === 'number') return v.toFixed(3);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function cloneChannels(c: ChannelState): ChannelState {
  return {
    ai: [...c.ai],
    ao: [...c.ao],
    di: [...c.di],
    do: [...c.do],
    aiHistory: c.aiHistory.map(h => [...h]),
    aoHistory: c.aoHistory.map(h => [...h]),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, Math.max(0, ms)));
}
