'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { validatePython, type ValidationResult } from '@/lib/validator/python-validator';
import {
  CheckCircle2, AlertCircle, AlertTriangle, ChevronUp, ChevronDown,
  Pencil, X, Check, RotateCw, FileWarning,
} from 'lucide-react';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface CodePreviewProps {
  code: string;
  theme?: 'light' | 'dark';
  onValidationChange?: (result: ValidationResult) => void;
  /** Parent-managed override — when set, displayed instead of auto-generated `code`. */
  editedCode: string | null;
  onCommitEdit: (next: string | null) => void;
  /** Active compile target — drives Monaco language + validator routing. */
  language?: 'python' | 'cpp';
  targetName?: string;
}

export function CodePreview({
  code, theme = 'dark', onValidationChange, editedCode, onCommitEdit,
  language = 'python', targetName,
}: CodePreviewProps) {
  const themeName = theme === 'light' ? 'nexys-light' : 'nexys-dark';

  // local edit-mode state (drafting)
  const [editing, setEditing] = useState(false);
  const [draftCode, setDraftCode] = useState('');

  // what's actually shown
  const displayedCode = editing
    ? draftCode
    : (editedCode ?? code);

  const hasOverride = editedCode !== null;
  const isStale = hasOverride && !editing && editedCode !== code;

  // Python full SDK-aware validator. For C/C++ we run a minimal syntactic
  // check (bracket balance + semicolon hints) so the bar always shows status.
  const validation = useMemo(
    () => language === 'python'
      ? validatePython(displayedCode)
      : validateCStyle(displayedCode),
    [displayedCode, language]
  );
  const [issuesOpen, setIssuesOpen] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    onValidationChange?.(validation);
  }, [validation, onValidationChange]);

  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      applyMarkers(editorRef.current, monacoRef.current, validation);
    }
  }, [validation]);

  // ── edit mode handlers ──
  const handleEdit = () => {
    setDraftCode(displayedCode);
    setEditing(true);
  };
  const handleApply = () => {
    onCommitEdit(draftCode);
    setEditing(false);
  };
  const handleCancel = () => {
    setDraftCode('');
    setEditing(false);
  };
  const handleResetToAuto = () => {
    onCommitEdit(null);
  };

  return (
    <div className="h-full w-full bg-bg flex flex-col">
      {/* Validation bar */}
      <ValidationBar
        validation={validation}
        open={issuesOpen}
        onToggle={() => setIssuesOpen(o => !o)}
      />

      {/* Issues drawer */}
      {issuesOpen && validation.issues.length > 0 && (
        <IssuesList issues={validation.issues} />
      )}

      {/* Edit toolbar */}
      <EditToolbar
        editing={editing}
        hasOverride={hasOverride}
        isStale={isStale}
        onEdit={handleEdit}
        onApply={handleApply}
        onCancel={handleCancel}
        onResetToAuto={handleResetToAuto}
      />

      {/* Monaco */}
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={language}
          value={displayedCode}
          theme={themeName}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('nexys-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '6c7280', fontStyle: 'italic' },
                { token: 'keyword', foreground: '34d399' },
                { token: 'string', foreground: 'f59e0b' },
                { token: 'number', foreground: '60a5fa' },
                { token: 'identifier', foreground: 'e2e8f0' },
              ],
              colors: {
                'editor.background': '#0e1116',
                'editor.foreground': '#e2e8f0',
                'editor.lineHighlightBackground': '#161a22',
                'editorLineNumber.foreground': '#3a4252',
                'editorLineNumber.activeForeground': '#94a3b8',
                'editorIndentGuide.background1': '#1c2230',
                'editor.selectionBackground': '#10b98144',
                'editorGutter.background': '#0e1116',
              },
            });
            monaco.editor.defineTheme('nexys-light', {
              base: 'vs',
              inherit: true,
              rules: [
                { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
                { token: 'keyword', foreground: '0f766e' },
                { token: 'string', foreground: 'b45309' },
                { token: 'number', foreground: '1d4ed8' },
                { token: 'identifier', foreground: '0f172a' },
              ],
              colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#0f172a',
                'editor.lineHighlightBackground': '#f1f5f9',
                'editorLineNumber.foreground': '#cbd5e1',
                'editorLineNumber.activeForeground': '#475569',
                'editorIndentGuide.background1': '#e2e8f0',
                'editor.selectionBackground': '#10b98133',
                'editorGutter.background': '#ffffff',
              },
            });
          }}
          onMount={(editor, monaco) => {
            editorRef.current = editor;
            monacoRef.current = monaco;
            applyMarkers(editor, monaco, validation);
          }}
          onChange={(v) => { if (editing) setDraftCode(v ?? ''); }}
          options={{
            readOnly: !editing,
            fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
            fontSize: 12.5,
            lineHeight: 20,
            fontLigatures: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: editing ? 'line' : 'none',
            padding: { top: 12, bottom: 12 },
            wordWrap: 'on',
            smoothScrolling: true,
            scrollbar: {
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
              useShadows: false,
            },
            renderWhitespace: 'none',
            guides: { indentation: true, highlightActiveIndentation: editing },
          }}
        />
      </div>
    </div>
  );
}

// ================================================================
//  Validation bar (existing)
// ================================================================

function ValidationBar({
  validation, open, onToggle,
}: { validation: ValidationResult; open: boolean; onToggle: () => void }) {
  const { ok, errors, warnings, issues, apiCalls, ms } = validation;
  const Icon = errors > 0 ? AlertCircle : warnings > 0 ? AlertTriangle : CheckCircle2;
  const tone = errors > 0
    ? 'text-alarm border-alarm/40 bg-alarm/10'
    : warnings > 0
      ? 'text-warn border-warn/40 bg-warn/10'
      : 'text-signal border-signal/40 bg-signal/10';
  const label = errors > 0
    ? `${errors} error${errors !== 1 ? 's' : ''}${warnings > 0 ? ` · ${warnings} warning${warnings !== 1 ? 's' : ''}` : ''}`
    : warnings > 0
      ? `${warnings} warning${warnings !== 1 ? 's' : ''}`
      : 'valid';
  return (
    <button
      onClick={onToggle}
      disabled={issues.length === 0}
      className={cn(
        'shrink-0 border-b flex items-center gap-2 px-3 py-1.5 transition-colors text-left',
        tone,
        issues.length === 0 ? 'cursor-default' : 'hover:brightness-110'
      )}
    >
      <Icon size={12} strokeWidth={2} />
      <span className="overline text-[10px] normal-case tracking-normal">
        {ok ? 'Static check passed' : 'Static check'}
      </span>
      <span className="mono text-[10px]">{label}</span>
      <div className="flex-1" />
      <span className="mono text-[9px] text-text-muted">
        {apiCalls} SDK calls ·{' '}
        <span suppressHydrationWarning>{ms.toFixed(1)}ms</span>
      </span>
      {issues.length > 0 && (
        open ? <ChevronUp size={11} /> : <ChevronDown size={11} />
      )}
    </button>
  );
}

function IssuesList({ issues }: { issues: ValidationResult['issues'] }) {
  return (
    <div className="shrink-0 border-b border-border bg-surface max-h-40 overflow-y-auto">
      {issues.slice(0, 50).map((iss, i) => {
        const tone = iss.severity === 'error'
          ? 'text-alarm' : iss.severity === 'warning' ? 'text-warn' : 'text-info';
        return (
          <div key={i} className="flex gap-2 px-3 py-1 hover:bg-surface-2 mono text-[10px]">
            <span className={cn('shrink-0 w-12', tone)}>
              L{iss.line}{iss.col ? `:${iss.col}` : ''}
            </span>
            <span className={cn('shrink-0 w-14 uppercase tracking-overline text-[9px]', tone)}>
              {iss.severity}
            </span>
            <span className="shrink-0 w-28 text-text-muted truncate">{iss.code}</span>
            <span className="flex-1 text-text leading-relaxed">{iss.message}</span>
          </div>
        );
      })}
      {issues.length > 50 && (
        <div className="px-3 py-1 text-[10px] text-text-muted text-center">
          … and {issues.length - 50} more
        </div>
      )}
    </div>
  );
}

// ================================================================
//  Edit toolbar — Edit / Cancel · Apply / Reset to auto
// ================================================================

function EditToolbar({
  editing, hasOverride, isStale,
  onEdit, onApply, onCancel, onResetToAuto,
}: {
  editing: boolean;
  hasOverride: boolean;
  isStale: boolean;
  onEdit: () => void;
  onApply: () => void;
  onCancel: () => void;
  onResetToAuto: () => void;
}) {
  return (
    <div className="shrink-0 border-b border-border bg-surface/60 px-3 py-1.5 flex items-center gap-1.5">
      {!editing && !hasOverride && (
        <>
          <span className="overline text-[10px]">Read-only · auto-generated</span>
          <div className="flex-1" />
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title="Switch to edit mode"
          >
            <Pencil size={10} strokeWidth={1.75} />
            Edit
          </button>
        </>
      )}

      {!editing && hasOverride && (
        <>
          <span className={cn(
            'flex items-center gap-1 text-[11px]',
            isStale ? 'text-warn' : 'text-info'
          )}>
            {isStale ? <FileWarning size={11} /> : <Pencil size={11} />}
            <span className="overline text-[10px] normal-case tracking-normal">
              {isStale ? 'Manually edited · blocks changed since' : 'Manually edited'}
            </span>
          </span>
          <div className="flex-1" />
          <button
            onClick={onResetToAuto}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title="Discard edits, regenerate from blocks"
          >
            <RotateCw size={10} strokeWidth={1.75} />
            Reset to auto
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <Pencil size={10} strokeWidth={1.75} />
            Edit
          </button>
        </>
      )}

      {editing && (
        <>
          <span className="flex items-center gap-1 text-warn text-[11px]">
            <Pencil size={11} />
            <span className="overline text-[10px] normal-case tracking-normal">Editing draft</span>
          </span>
          <div className="flex-1" />
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] border border-border text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
          >
            <X size={11} strokeWidth={1.75} />
            Cancel
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1 px-2.5 py-0.5 text-[11px] bg-signal text-bg font-medium hover:opacity-90 transition-opacity"
          >
            <Check size={11} strokeWidth={2} />
            Apply
          </button>
        </>
      )}
    </div>
  );
}

// ================================================================
//  Monaco marker push
// ================================================================

// ----------------------------------------------------------------
//  Minimal C/C++ syntax check — bracket balance + obvious issues
// ----------------------------------------------------------------

function validateCStyle(source: string): ValidationResult {
  const t0 = performance.now();
  const issues: ValidationResult['issues'] = [];
  const stack: Array<{ ch: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  let line = 1, col = 1;
  let inSingle = false, inDouble = false, inLineComment = false, inBlockComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    const c2 = source.slice(i, i + 2);
    if (c === '\n') { line++; col = 1; inLineComment = false; continue; }
    if (inLineComment) { col++; continue; }
    if (inBlockComment) { if (c2 === '*/') { inBlockComment = false; i++; col += 2; continue; } col++; continue; }
    if (inSingle) { if (c === '\\') { i++; col += 2; continue; } if (c === "'") inSingle = false; col++; continue; }
    if (inDouble) { if (c === '\\') { i++; col += 2; continue; } if (c === '"') inDouble = false; col++; continue; }
    if (c2 === '//') { inLineComment = true; i++; col += 2; continue; }
    if (c2 === '/*') { inBlockComment = true; i++; col += 2; continue; }
    if (c === "'") { inSingle = true; col++; continue; }
    if (c === '"') { inDouble = true; col++; continue; }
    if ('([{'.includes(c)) stack.push({ ch: c, line, col });
    else if (')]}'.includes(c)) {
      const last = stack.pop();
      if (!last || last.ch !== pairs[c]) {
        issues.push({
          line, col, severity: 'error', code: 'bracket-mismatch',
          message: `Unmatched '${c}'${last ? ` — expected '${last.ch}' from line ${last.line}` : ''}.`,
        });
      }
    }
    col++;
  }
  for (const open of stack) {
    issues.push({
      line: open.line, col: open.col, severity: 'error',
      code: 'bracket-mismatch', message: `Unclosed '${open.ch}'.`,
    });
  }

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warning').length;
  return {
    ok: errors === 0, errors, warnings, issues,
    ms: performance.now() - t0,
    apiCalls: 0,
  };
}

function applyMarkers(editor: any, monaco: any, validation: ValidationResult) {
  const model = editor.getModel();
  if (!model) return;
  const markers = validation.issues.map(iss => ({
    severity:
      iss.severity === 'error' ? monaco.MarkerSeverity.Error
      : iss.severity === 'warning' ? monaco.MarkerSeverity.Warning
      : monaco.MarkerSeverity.Info,
    startLineNumber: iss.line,
    endLineNumber: iss.line,
    startColumn: iss.col ?? 1,
    endColumn: (iss.col ?? 1) + 1,
    message: `[${iss.code}] ${iss.message}`,
    source: 'nexys-lint',
  }));
  monaco.editor.setModelMarkers(model, 'nexys-lint', markers);
}
