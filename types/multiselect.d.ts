// The MIT App Inventor workspace-multiselect plugin ships no type declarations.
declare module '@mit-app-inventor/blockly-plugin-workspace-multiselect' {
  // Minimal surface we use: a Multiselect class with init()/dispose().
  export class Multiselect {
    constructor(workspace: unknown);
    init(options?: unknown): void;
    dispose?(): void;
  }
  export const dragSelectionWeakMap: unknown;
  export const inMultipleSelectionModeWeakMap: unknown;
}
