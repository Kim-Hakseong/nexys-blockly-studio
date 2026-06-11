/**
 * Module (Sub-VI) registry — the "여러 블록이 합쳐진" reusable units.
 *
 * A Module is a named, reusable group of blocks. Once created, it appears as a
 * SINGLE statement block in the Modules toolbox category and can be dropped
 * multiple times. Every reuse generates a call to one shared function
 * definition (LabVIEW SubVI semantics).
 *
 * This is a tiny framework-agnostic store: workspace-panel registers/uses the
 * Blockly side, the simulator reads bodies to execute, and page.tsx subscribes
 * to drive UI + persistence.
 */

export interface ModuleDef {
  id: string;          // 'mod_1'  → block type 'nexys_module_mod_1'
  name: string;        // user label e.g. 'BIT_Pulse'
  /** Blockly serialization of the captured top block (+ its next-chain / inputs). */
  bodyState: any;
  createdAt: string;
  /** how many blocks the body contains (for display) */
  blockCount: number;
}

export const MODULE_BLOCK_PREFIX = 'nexys_module_';
export const MODULE_COLOUR = 285; // calm purple, distinct from signal-processing

let modules: ModuleDef[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function getModules(): ModuleDef[] {
  return modules;
}

export function setModules(next: ModuleDef[]): void {
  modules = next;
  emit();
}

export function addModule(def: ModuleDef): void {
  modules = [...modules.filter(m => m.id !== def.id), def];
  emit();
}

export function removeModule(id: string): void {
  modules = modules.filter(m => m.id !== id);
  emit();
}

export function getModule(id: string): ModuleDef | undefined {
  return modules.find(m => m.id === id);
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function nextModuleId(): string {
  let n = 1;
  while (modules.some(m => m.id === `mod_${n}`)) n++;
  return `mod_${n}`;
}

/** Sanitize a module name into a valid function identifier. */
export function moduleFuncName(name: string): string {
  return 'module_' + (name.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, '_$1') || 'unnamed');
}

/** Block type for a module id. */
export function moduleBlockType(id: string): string {
  return MODULE_BLOCK_PREFIX + id;
}

/** Extract module id from a block type, or null. */
export function moduleIdFromType(blockType: string): string | null {
  return blockType.startsWith(MODULE_BLOCK_PREFIX)
    ? blockType.slice(MODULE_BLOCK_PREFIX.length)
    : null;
}

/** Count blocks in a serialized body (top block + next chain + nested). */
export function countBlocks(state: any): number {
  let n = 0;
  const walk = (b: any) => {
    if (!b) return;
    n++;
    if (b.inputs) {
      for (const k of Object.keys(b.inputs)) {
        const slot = b.inputs[k];
        if (slot?.block) walk(slot.block);
      }
    }
    if (b.next?.block) walk(b.next.block);
  };
  walk(state);
  return n;
}
