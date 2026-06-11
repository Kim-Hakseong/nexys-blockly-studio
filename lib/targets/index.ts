/**
 * Compile target catalog — what hardware the workspace ships to.
 */

import { Cpu, Microscope, Cog, Box } from 'lucide-react';
import type { GenerateContext, TargetSpec } from './types';
import { generatePython } from './python';
import { generateArduino } from './arduino';
import { generateStm32 } from './stm32';

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
];

export const TARGET_BY_ID: Record<string, TargetSpec> = TARGETS.reduce(
  (acc, t) => { acc[t.id] = t; return acc; }, {} as Record<string, TargetSpec>,
);

export function findTarget(id: string): TargetSpec | undefined {
  return TARGET_BY_ID[id];
}

export const DEFAULT_TARGET_ID = 'rpi';
