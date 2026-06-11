/**
 * Blockly-side wiring for Modules (Sub-VIs).
 *
 * - registerModuleBlock: define the custom statement block + Python generator
 * - buildModuleToolbox: dynamic category content listing all modules
 * - generateModuleDefs: emit `def module_X(): ...` for every module (Python)
 */

import {
  getModules, moduleBlockType, moduleFuncName, moduleIdFromType,
  MODULE_COLOUR, type ModuleDef,
} from './module-store';

type AnyBlockly = any;
type AnyGen = any;

/** Define (or redefine) the Blockly block + Python generator for one module. */
export function registerModuleBlock(
  Blockly: AnyBlockly,
  pythonGenerator: AnyGen,
  def: ModuleDef,
): void {
  const type = moduleBlockType(def.id);

  Blockly.Blocks[type] = {
    init: function () {
      this.appendDummyInput()
        .appendField('▦')
        .appendField(def.name, 'MOD_LABEL');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MODULE_COLOUR);
      this.setTooltip(
        `Module "${def.name}" — ${def.blockCount} block(s) combined.\n` +
        `Double-click (or use Ungroup) to expand its internal blocks for editing.`
      );
      this.setHelpUrl('');
    },
  };

  // Python: each reuse calls the shared function
  pythonGenerator.forBlock[type] = () => `${moduleFuncName(def.name)}()\n`;
}

/** Register every known module's block + generator. Call after a module set change. */
export function registerAllModules(Blockly: AnyBlockly, pythonGenerator: AnyGen): void {
  for (const def of getModules()) {
    registerModuleBlock(Blockly, pythonGenerator, def);
  }
}

/** Toolbox category content (JSON) listing all modules as draggable blocks. */
export function buildModuleFlyout(): any[] {
  const mods = getModules();
  if (mods.length === 0) {
    return [{
      kind: 'label',
      text: '아직 모듈이 없습니다 — 블록 선택 후 "Make Module"',
    }];
  }
  return mods.map(m => ({ kind: 'block', type: moduleBlockType(m.id) }));
}

/**
 * Generate Python `def module_X(): <body>` for every module.
 * Each body is produced by loading its serialized state into a temporary
 * headless workspace and running the standard generator.
 */
export function generateModuleDefs(Blockly: AnyBlockly, pythonGenerator: AnyGen): string {
  const mods = getModules();
  if (mods.length === 0) return '';

  const defs: string[] = [];
  for (const m of mods) {
    let body = '';
    let temp: any;
    try {
      temp = new Blockly.Workspace();
      Blockly.serialization.workspaces.load(
        { blocks: { languageVersion: 0, blocks: m.bodyState ? [m.bodyState] : [] } },
        temp,
      );
      body = pythonGenerator.workspaceToCode(temp) || '';
    } catch (err) {
      console.warn('[nexys] module def generation failed', m.name, err);
      body = '';
    } finally {
      try { temp?.dispose(); } catch { /* ignore */ }
    }

    const indented = body.trim()
      ? body.split('\n').map(l => (l ? '    ' + l : l)).join('\n')
      : '    pass';
    defs.push(`def ${moduleFuncName(m.name)}() -> None:\n    """Module: ${m.name}"""\n${indented}`);
  }
  return defs.join('\n\n') + '\n\n';
}

export { moduleIdFromType };
