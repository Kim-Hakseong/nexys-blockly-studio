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

  const params = def.params ?? [];

  Blockly.Blocks[type] = {
    init: function () {
      this.appendDummyInput()
        .appendField('▦')
        .appendField(def.name, 'MOD_LABEL');
      // one value input per parameter (LabVIEW connector pane)
      for (const p of params) {
        this.appendValueInput(`ARG_${p.name}`)
          .setCheck(null)
          .setAlign(Blockly.ALIGN_RIGHT)
          .appendField(p.name);
      }
      this.setInputsInline(false);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(MODULE_COLOUR);
      this.setTooltip(
        `Module "${def.name}" — ${def.blockCount} block(s) combined` +
        (params.length ? `, ${params.length} input(s): ${params.map(p => p.name).join(', ')}` : '') +
        `.\nUngroup to expand its internal blocks for editing.`
      );
      this.setHelpUrl('');
    },
  };

  // Python: each reuse calls the shared function with its argument expressions
  pythonGenerator.forBlock[type] = (b: any) => {
    const ORDER = pythonGenerator.ORDER;
    const args = params.map(p =>
      pythonGenerator.valueToCode(b, `ARG_${p.name}`, ORDER.NONE) || '0'
    );
    return `${moduleFuncName(def.name)}(${args.join(', ')})\n`;
  };
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
    const sig = (m.params ?? []).map(p => p.name).join(', ');
    defs.push(`def ${moduleFuncName(m.name)}(${sig}) -> None:\n    """Module: ${m.name}"""\n${indented}`);
  }
  return defs.join('\n\n') + '\n\n';
}

export { moduleIdFromType };
