/**
 * Compile targets — what firmware language the workspace generates for.
 *
 * Each target ships:
 *   - language (so Monaco can syntax-highlight)
 *   - emitter (turns workspace JSON into source code)
 *   - icon + accent (for the selector UI)
 */

import type { LucideIcon } from 'lucide-react';

export type TargetLanguage = 'python' | 'cpp' | 'c';

export type WorkspaceJSON = any;

export interface GenerateContext {
  /** Always present — Blockly workspace JSON snapshot. */
  workspaceJson: WorkspaceJSON;
  /** Only set for Python targets — live Blockly workspace + generator handles. */
  workspace?: any;
  pythonGenerator?: any;
  Order?: any;
  /** Pre-generated Python module (Sub-VI) function definitions, if any. */
  moduleDefs?: string;
}

export interface TargetSpec {
  id: string;
  name: string;             // user-visible: "Raspberry Pi 4B"
  shortName: string;        // compact: "RPi"
  description: string;
  language: TargetLanguage;
  monacoLang: 'python' | 'cpp';
  fileExt: string;          // '.py', '.ino', '.c'
  icon: LucideIcon;
  /** SDK / framework label shown in code preview footer */
  framework: string;
  /** Generate full source code. */
  generate: (ctx: GenerateContext) => string;
}
