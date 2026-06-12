/**
 * Compile target catalog — what hardware the workspace ships to.
 */

import { Cpu, Microscope, Cog, Box, Server, CircuitBoard, Boxes } from 'lucide-react';
import type { GenerateContext, TargetSpec } from './types';
import { generatePython } from './python';
import { generateArduino } from './arduino';
import { generateStm32 } from './stm32';

const py = (variant: 'rpi' | 'jetson' | 'ni_pxie' | 'ni_crio' | 'ni_cdaq') =>
  (ctx: GenerateContext) =>
    ctx.workspace && ctx.pythonGenerator
      ? generatePython(variant, ctx.workspace, ctx.pythonGenerator, ctx.moduleDefs)
      : '# (waiting for workspace…)\n';

export const TARGETS: TargetSpec[] = [
  {
    id: 'rpi',
    name: 'Raspberry Pi 4B',
    shortName: 'RPi',
    description: 'Linux SBC, Python 3.11 + nexys-sdk · RPi.GPIO backend',
    language: 'python',
    monacoLang: 'python',
    fileExt: '.py',
    icon: Cpu,
    framework: 'python · nexys-sdk',
    generate: (ctx: GenerateContext) =>
      ctx.workspace && ctx.pythonGenerator
        ? generatePython('rpi', ctx.workspace, ctx.pythonGenerator, ctx.moduleDefs)
        : '# (waiting for workspace…)\n',
  },
  {
    id: 'jetson',
    name: 'NVIDIA Jetson Orin',
    shortName: 'Jetson',
    description: 'ARM SBC + GPU, Python + Jetson.GPIO + optional CUDA',
    language: 'python',
    monacoLang: 'python',
    fileExt: '.py',
    icon: Microscope,
    framework: 'python · jetson.gpio',
    generate: (ctx: GenerateContext) =>
      ctx.workspace && ctx.pythonGenerator
        ? generatePython('jetson', ctx.workspace, ctx.pythonGenerator, ctx.moduleDefs)
        : '# (waiting for workspace…)\n',
  },
  {
    id: 'arduino',
    name: 'Arduino Mega',
    shortName: 'Arduino',
    description: 'AVR MCU, C++ with Arduino core (digitalWrite/analogRead)',
    language: 'cpp',
    monacoLang: 'cpp',
    fileExt: '.ino',
    icon: Cog,
    framework: 'arduino-core',
    generate: (ctx: GenerateContext) => generateArduino(ctx.workspaceJson),
  },
  {
    id: 'stm32',
    name: 'STM32 F4 Nucleo',
    shortName: 'STM32',
    description: 'ARM Cortex-M4 + HAL drivers (HAL_GPIO / HAL_ADC / HAL_DAC)',
    language: 'c',
    monacoLang: 'cpp',
    fileExt: '.c',
    icon: Box,
    framework: 'stm32-hal',
    generate: (ctx: GenerateContext) => generateStm32(ctx.workspaceJson),
  },

  // ── NI (National Instruments) — Python via NI-DAQmx ──
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

export const DEFAULT_TARGET_ID = 'rpi';
