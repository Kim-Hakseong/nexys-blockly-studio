/**
 * Nexys Python static analyzer.
 *
 * Why custom instead of Pyodide (10 MB WASM Python in browser)?
 *   - Lazy-loading a full Python runtime is overkill for ~100 line scripts.
 *   - We need *Nexys-aware* checks (SDK call schema, channel ranges) that a
 *     pure Python parser couldn't do anyway.
 *   - Result delivered in <1 ms vs. multi-second Pyodide cold start.
 *
 * What we check
 *   1. Bracket balance        — parens/brackets/braces match (skipping strings/comments)
 *   2. String quote balance   — every quote opens & closes on the same line
 *   3. Indentation discipline — 4-space units, no tabs, no mixed
 *   4. Block-after-colon       — `def`/`if`/`for`/etc. must be followed by indented body
 *   5. Nexys SDK schema       — every nexys.x.y(args) call validated:
 *                                arg arity, channel range (AI0..AI7 etc.), level enum
 *   6. Undefined SDK paths    — nexys.foo.bar() flagged if not in catalog
 *
 * What we don't check (yet)
 *   - Undefined Python names / scope
 *   - Type compatibility of user expressions
 *   - Real Python grammar edge cases (decorators, walrus, etc.)
 *
 * Sufficient to catch every generator regression we've hit so far.
 */

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
  line: number;          // 1-based
  col?: number;          // 1-based
  severity: Severity;
  code: string;          // stable id, e.g. 'paren-mismatch'
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  errors: number;
  warnings: number;
  issues: Issue[];
  ms: number;
  apiCalls: number;      // how many nexys.* calls were validated
}

// ----------------------------------------------------------------
//  Nexys SDK schema — keep in sync with python-generator.ts
// ----------------------------------------------------------------

type ArgKind =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'any' }
  | { kind: 'callable' }
  | { kind: 'lambda' }
  | { kind: 'channel'; prefix: 'AI' | 'AO' | 'DI' | 'DO'; max: number }
  | { kind: 'enum'; values: string[] }
  | { kind: 'sensor' };

interface ApiSpec {
  args: ArgKind[];
  /** allow trailing kwargs (e.g. `samples=`, `cutoff_hz=`, `value=`) */
  kwargs?: string[];
}

const SDK: Record<string, ApiSpec> = {
  'nexys.channels.ai_read':     { args: [{ kind: 'channel', prefix: 'AI', max: 7 }] },
  'nexys.channels.ao_write':    { args: [{ kind: 'channel', prefix: 'AO', max: 3 }, { kind: 'number' }] },
  'nexys.channels.di_read':     { args: [{ kind: 'channel', prefix: 'DI', max: 7 }] },
  'nexys.channels.do_write':    { args: [{ kind: 'channel', prefix: 'DO', max: 7 }, { kind: 'enum', values: ['HIGH', 'LOW'] }] },
  'nexys.channels.sensor_read': { args: [{ kind: 'sensor' }, { kind: 'number' }] },

  'nexys.timing.loop_every':    { args: [{ kind: 'number' }, { kind: 'callable' }] },
  'nexys.timing.delay_ms':      { args: [{ kind: 'number' }] },
  'nexys.timing.wait_until':    { args: [{ kind: 'lambda' }] },

  'nexys.signal.scale_linear':  { args: [{ kind: 'any' }, { kind: 'number' }, { kind: 'number' }] },
  'nexys.signal.rms':           { args: [{ kind: 'any' }], kwargs: ['samples'] },
  'nexys.signal.lpf':           { args: [{ kind: 'any' }], kwargs: ['cutoff_hz'] },
  'nexys.signal.in_range':      { args: [{ kind: 'number' }, { kind: 'number' }, { kind: 'number' }] },

  'nexys.output.log_tdms':      { args: [{ kind: 'string' }, { kind: 'any' }] },
  'nexys.output.mqtt_publish':  { args: [{ kind: 'string' }, { kind: 'any' }] },
  'nexys.output.alarm':         { args: [{ kind: 'string' }, { kind: 'string' }] },
  'nexys.output.bit_result':    { args: [{ kind: 'string' }], kwargs: ['value'] },
};

const VALID_SENSORS = new Set(['thermocouple', 'pressure', 'strain', 'accel']);

// ----------------------------------------------------------------
//  Top-level entry
// ----------------------------------------------------------------

export function validatePython(source: string): ValidationResult {
  const t0 = performance.now();
  const issues: Issue[] = [];
  let apiCalls = 0;

  const lines = source.split('\n');
  const stripped = stripStringsAndComments(source);

  checkBrackets(stripped, issues);
  checkQuoteBalance(lines, issues);
  checkIndentation(lines, issues);
  checkBlockBodies(lines, issues);
  apiCalls = checkSdkCalls(lines, issues);

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  return {
    ok: errors === 0,
    errors,
    warnings,
    issues: issues.sort((a, b) => a.line - b.line || (a.col ?? 0) - (b.col ?? 0)),
    ms: performance.now() - t0,
    apiCalls,
  };
}

// ----------------------------------------------------------------
//  1. Bracket balance — skip strings/comments so paren in '...' doesn't count
// ----------------------------------------------------------------

function checkBrackets(stripped: string, issues: Issue[]): void {
  const stack: Array<{ ch: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  let line = 1, col = 1;
  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (c === '\n') { line++; col = 1; continue; }
    if ('([{'.includes(c)) {
      stack.push({ ch: c, line, col });
    } else if (')]}'.includes(c)) {
      const last = stack.pop();
      if (!last || last.ch !== pairs[c]) {
        issues.push({
          line, col, severity: 'error',
          code: 'bracket-mismatch',
          message: `Unmatched '${c}'${last ? ` — expected matching '${last.ch}' from line ${last.line}` : ''}.`,
        });
      }
    }
    col++;
  }
  for (const open of stack) {
    issues.push({
      line: open.line, col: open.col, severity: 'error',
      code: 'bracket-mismatch',
      message: `Unclosed '${open.ch}'.`,
    });
  }
}

// ----------------------------------------------------------------
//  2. Per-line quote balance — Blockly never emits multi-line strings
//     so an odd quote count on a single line is a real error.
// ----------------------------------------------------------------

function checkQuoteBalance(lines: string[], issues: Issue[]): void {
  for (let i = 0; i < lines.length; i++) {
    const raw = stripLineComment(lines[i]);
    const sQuotes = countUnescaped(raw, "'");
    const dQuotes = countUnescaped(raw, '"');
    if (sQuotes % 2 !== 0) {
      issues.push({
        line: i + 1, severity: 'error',
        code: 'quote-mismatch',
        message: `Unbalanced single quote on this line.`,
      });
    }
    if (dQuotes % 2 !== 0) {
      // triple-quotes are OK here (docstring) — skip if line contains """
      if (!raw.includes('"""')) {
        issues.push({
          line: i + 1, severity: 'error',
          code: 'quote-mismatch',
          message: `Unbalanced double quote on this line.`,
        });
      }
    }
  }
}

// ----------------------------------------------------------------
//  3. Indentation — must be multiples of 4 spaces, no tabs
// ----------------------------------------------------------------

function checkIndentation(lines: string[], issues: Issue[]): void {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (line.startsWith('\t')) {
      issues.push({
        line: i + 1, col: 1, severity: 'warning',
        code: 'tab-indent', message: 'Tab indentation detected; expected 4-space indentation.',
      });
      continue;
    }
    const lead = line.length - line.trimStart().length;
    if (lead % 4 !== 0) {
      issues.push({
        line: i + 1, col: 1, severity: 'warning',
        code: 'odd-indent',
        message: `Indentation is ${lead} space(s); expected a multiple of 4.`,
      });
    }
  }
}

// ----------------------------------------------------------------
//  4. After `def`/`if`/`for`/`while`/`elif`/`else`/`try` colon, body must be present
// ----------------------------------------------------------------

const BLOCK_OPENERS = /^\s*(def|if|elif|else|for|while|try|except|finally|with|class)\b[^:]*:\s*(#.*)?$/;

function checkBlockBodies(lines: string[], issues: Issue[]): void {
  for (let i = 0; i < lines.length; i++) {
    if (!BLOCK_OPENERS.test(lines[i])) continue;
    const headIndent = lines[i].length - lines[i].trimStart().length;
    // find next non-empty non-comment line
    let j = i + 1;
    while (j < lines.length && (lines[j].trim() === '' || lines[j].trimStart().startsWith('#'))) j++;
    if (j >= lines.length) {
      issues.push({
        line: i + 1, severity: 'error',
        code: 'empty-body', message: 'Block opens but has no body.',
      });
      continue;
    }
    const nextIndent = lines[j].length - lines[j].trimStart().length;
    if (nextIndent <= headIndent) {
      issues.push({
        line: i + 1, severity: 'error',
        code: 'empty-body',
        message: 'Block body must be indented at least one level deeper than the header.',
      });
    }
  }
}

// ----------------------------------------------------------------
//  5. Nexys SDK call validation
// ----------------------------------------------------------------

function checkSdkCalls(lines: string[], issues: Issue[]): number {
  let callCount = 0;
  // Match nexys.a.b(args) — args may contain nested parens. We do a
  // simple matcher: find `nexys.X.Y(` then read until matching close paren.
  const callStart = /\bnexys\.([a-zA-Z_]\w*)\.([a-zA-Z_]\w*)\s*\(/g;

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    callStart.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = callStart.exec(line)) !== null) {
      const fqn = `nexys.${m[1]}.${m[2]}`;
      const openCol = m.index + m[0].length; // position after '('
      // find matching close paren on the same line
      const close = matchClose(line, openCol);
      if (close === -1) {
        // unbalanced (likely a multi-line call) — skip; bracket check will flag it
        continue;
      }
      const argText = line.slice(openCol, close).trim();
      const args = splitTopLevelArgs(argText);
      callCount += 1;

      const spec = SDK[fqn];
      if (!spec) {
        issues.push({
          line: li + 1, col: m.index + 1, severity: 'warning',
          code: 'unknown-sdk',
          message: `'${fqn}' is not in the Nexys SDK catalog.`,
        });
        continue;
      }
      validateCall(fqn, spec, args, li + 1, m.index + 1, issues);
    }
  }
  return callCount;
}

function validateCall(
  fqn: string, spec: ApiSpec, args: string[], line: number, col: number, issues: Issue[],
): void {
  // separate positional args from kwargs
  const positional: string[] = [];
  const kwargs: Array<{ key: string; value: string }> = [];
  for (const a of args) {
    const kwMatch = /^([a-zA-Z_]\w*)\s*=\s*(.+)$/s.exec(a);
    if (kwMatch && !a.startsWith("'") && !a.startsWith('"')) {
      kwargs.push({ key: kwMatch[1], value: kwMatch[2].trim() });
    } else {
      positional.push(a);
    }
  }

  if (positional.length !== spec.args.length) {
    issues.push({
      line, col, severity: 'error',
      code: 'arg-count',
      message: `'${fqn}' expects ${spec.args.length} positional arg(s); got ${positional.length}.`,
    });
    return;
  }

  for (let i = 0; i < positional.length; i++) {
    const argExpr = positional[i];
    const want = spec.args[i];
    const issue = validateArg(want, argExpr, fqn, i + 1, line, col);
    if (issue) issues.push(issue);
  }

  for (const kw of kwargs) {
    if (!spec.kwargs?.includes(kw.key)) {
      issues.push({
        line, col, severity: 'warning',
        code: 'unknown-kwarg',
        message: `'${fqn}' does not accept keyword argument '${kw.key}'.`,
      });
    }
  }
}

function validateArg(want: ArgKind, expr: string, fqn: string, idx: number, line: number, col: number): Issue | null {
  const trimmed = expr.trim();
  if (trimmed === '') {
    return { line, col, severity: 'error', code: 'arg-empty', message: `${fqn} arg ${idx} is empty.` };
  }
  switch (want.kind) {
    case 'channel': {
      const lit = stringLiteral(trimmed);
      if (lit === null) {
        return { line, col, severity: 'warning', code: 'channel-not-literal', message: `${fqn} arg ${idx} should be a literal channel string like '${want.prefix}0'.` };
      }
      const re = new RegExp(`^${want.prefix}(\\d+)$`);
      const m = re.exec(lit);
      if (!m) {
        return { line, col, severity: 'error', code: 'channel-format', message: `${fqn} arg ${idx} '${lit}' is not a ${want.prefix} channel.` };
      }
      const n = Number(m[1]);
      if (n < 0 || n > want.max) {
        return { line, col, severity: 'error', code: 'channel-range', message: `${fqn} arg ${idx} '${lit}' is out of range (0..${want.max}).` };
      }
      return null;
    }
    case 'enum': {
      const lit = stringLiteral(trimmed);
      if (lit === null) {
        return { line, col, severity: 'warning', code: 'enum-not-literal', message: `${fqn} arg ${idx} should be one of [${want.values.join(', ')}].` };
      }
      if (!want.values.includes(lit)) {
        return { line, col, severity: 'error', code: 'enum-invalid', message: `${fqn} arg ${idx} '${lit}' is not one of [${want.values.join(', ')}].` };
      }
      return null;
    }
    case 'sensor': {
      const lit = stringLiteral(trimmed);
      if (lit === null) return null;
      if (!VALID_SENSORS.has(lit)) {
        return { line, col, severity: 'warning', code: 'sensor-unknown', message: `Unknown sensor type '${lit}'. Expected one of [${[...VALID_SENSORS].join(', ')}].` };
      }
      return null;
    }
    case 'string':
      if (stringLiteral(trimmed) === null && !/^[A-Za-z_]\w*$/.test(trimmed)) {
        return { line, col, severity: 'info', code: 'string-expected', message: `${fqn} arg ${idx} likely expects a string.` };
      }
      return null;
    case 'number':
      // accept numeric literals, identifiers, arithmetic, function calls
      return null;
    case 'callable':
      // expect a bare identifier (function reference)
      if (!/^[A-Za-z_]\w*$/.test(trimmed)) {
        return { line, col, severity: 'warning', code: 'callable-expected', message: `${fqn} arg ${idx} should be a callable (function name).` };
      }
      return null;
    case 'lambda':
      if (!/^lambda\b/.test(trimmed)) {
        return { line, col, severity: 'warning', code: 'lambda-expected', message: `${fqn} arg ${idx} should be a lambda.` };
      }
      return null;
    case 'any':
    default:
      return null;
  }
}

// ----------------------------------------------------------------
//  Helpers
// ----------------------------------------------------------------

function stripStringsAndComments(src: string): string {
  // Replace string contents with spaces of equal length; same for line comments.
  // Preserves line/column positions for the bracket scan.
  const out: string[] = [];
  let i = 0;
  let inS = false;        // single quote
  let inD = false;        // double quote
  let inTripS = false, inTripD = false;
  while (i < src.length) {
    const c = src[i];
    const c2 = src.slice(i, i + 3);
    if (!inS && !inD && !inTripS && !inTripD) {
      if (c === '#') {
        while (i < src.length && src[i] !== '\n') { out.push(' '); i++; }
        continue;
      }
      if (c2 === "'''") { inTripS = true; out.push("'", "'", "'"); i += 3; continue; }
      if (c2 === '"""') { inTripD = true; out.push('"', '"', '"'); i += 3; continue; }
      if (c === "'") { inS = true; out.push("'"); i++; continue; }
      if (c === '"') { inD = true; out.push('"'); i++; continue; }
      out.push(c);
      i++;
      continue;
    }
    // inside a string literal — replace with space (preserve newlines)
    if (inTripS && c2 === "'''") { inTripS = false; out.push("'", "'", "'"); i += 3; continue; }
    if (inTripD && c2 === '"""') { inTripD = false; out.push('"', '"', '"'); i += 3; continue; }
    if (inS && c === '\\' && i + 1 < src.length) { out.push(' ', ' '); i += 2; continue; }
    if (inD && c === '\\' && i + 1 < src.length) { out.push(' ', ' '); i += 2; continue; }
    if (inS && c === "'") { inS = false; out.push("'"); i++; continue; }
    if (inD && c === '"') { inD = false; out.push('"'); i++; continue; }
    out.push(c === '\n' ? '\n' : ' ');
    i++;
  }
  return out.join('');
}

function stripLineComment(line: string): string {
  // crude: cut at first '#' not inside a string
  let inS = false, inD = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inD) inS = !inS;
    else if (c === '"' && !inS) inD = !inD;
    else if (c === '#' && !inS && !inD) return line.slice(0, i);
  }
  return line;
}

function countUnescaped(line: string, ch: string): number {
  let n = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ch && (i === 0 || line[i - 1] !== '\\')) n++;
  }
  return n;
}

function matchClose(line: string, from: number): number {
  let depth = 1;
  let inS = false, inD = false;
  for (let i = from; i < line.length; i++) {
    const c = line[i];
    if (inS) {
      if (c === '\\') { i++; continue; }
      if (c === "'") inS = false;
      continue;
    }
    if (inD) {
      if (c === '\\') { i++; continue; }
      if (c === '"') inD = false;
      continue;
    }
    if (c === "'") { inS = true; continue; }
    if (c === '"') { inD = true; continue; }
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function splitTopLevelArgs(s: string): string[] {
  // split on commas at depth 0, ignoring commas inside parens / brackets / strings
  const out: string[] = [];
  let depth = 0, inS = false, inD = false, start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inS) { if (c === '\\') { i++; continue; } if (c === "'") inS = false; continue; }
    if (inD) { if (c === '\\') { i++; continue; } if (c === '"') inD = false; continue; }
    if (c === "'") { inS = true; continue; }
    if (c === '"') { inD = true; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      out.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail.length > 0 || out.length > 0) out.push(tail);
  return out;
}

function stringLiteral(s: string): string | null {
  if ((s.startsWith("'") && s.endsWith("'") && s.length >= 2) ||
      (s.startsWith('"') && s.endsWith('"') && s.length >= 2)) {
    return s.slice(1, -1);
  }
  return null;
}
