/**
 * Compile target catalog — what hardware the workspace ships to.
 */

import { Server, CircuitBoard, Boxes } from 'lucide-react';
import type { GenerateContext, TargetSpec } from './types';
import { generatePython } from './python';

const py = (variant: 'ni_pxie' | 'ni_crio' | 'ni_cdaq') =>
  (ctx: GenerateContext) =>
    ctx.workspace && ctx.pythonGenerator
      ? generatePython(variant, ctx.workspace, ctx.pythonGenerator, ctx.moduleDefs)
      : '# (waiting for workspace…)\n';

// National Instruments instruments only — all generate Python via NI-DAQmx.
export const TARGETS: TargetSpec[] = [
  {
    id: 'ni_pxie',
    name: 'NI PXIe',
    shortName: 'PXIe',
    description: 'PXIe-1092 chassis + PXIe-6363 DAQ · Python (nidaqmx)',
    language: 'python',
    monacoLang: 'python',
    fileExt: '.py',
    icon: Server,
    framework: 'python · nidaqmx',
    generate: py('ni_pxie'),
  },
  {
    id: 'ni_crio',
    name: 'NI CompactRIO',
    shortName: 'cRIO',
    description: 'cRIO-9045 + C-Series modules · Python on NI Linux RT',
    language: 'python',
    monacoLang: 'python',
    fileExt: '.py',
    icon: CircuitBoard,
    framework: 'python · ni-linux-rt',
    generate: py('ni_crio'),
  },
  {
    id: 'ni_cdaq',
    name: 'NI CompactDAQ',
    shortName: 'cDAQ',
    description: 'cDAQ-9178 + C-Series modules · Python (nidaqmx)',
    language: 'python',
    monacoLang: 'python',
    fileExt: '.py',
    icon: Boxes,
    framework: 'python · nidaqmx',
    generate: py('ni_cdaq'),
  },
];

export const TARGET_BY_ID: Record<string, TargetSpec> = TARGETS.reduce(
  (acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, TargetSpec>,
);

export function findTarget(id: string): TargetSpec | undefined {
  return TARGET_BY_ID[id];
}

export const DEFAULT_TARGET_ID = 'ni_pxie';
