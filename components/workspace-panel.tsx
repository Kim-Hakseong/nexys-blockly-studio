'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { ZoomIn, ZoomOut, Maximize2, Combine, Ungroup } from 'lucide-react';
import { createNexysTheme } from '@/lib/blockly/theme';
import type { TargetSpec } from '@/lib/targets/types';
import {
  addModule, getModules, removeModule, nextModuleId, countBlocks,
  moduleBlockType, moduleIdFromType, subscribe as subscribeModules,
  detectFreeVars,
  type ModuleDef,
} from '@/lib/blockly/module-store';
import {
  registerAllModules, registerModuleBlock, buildModuleFlyout, generateModuleDefs,
} from '@/lib/blockly/module-blockly';

export interface WorkspaceHandle {
  loadTemplate: (state: unknown) => void;
  clear: () => void;
  getWorkspaceJson: () => unknown;
  /** Create a module from the currently-selected block (+ its chain). Returns the new def or null. */
  makeModuleFromSelection: (name: string) => ModuleDef | null;
  /** True if a statement block is currently selected (for enabling the button). */
  hasSelection: () => boolean;
  /** Expand the selected module block back into its constituent blocks. */
  ungroupSelectedModule: () => boolean;
}

interface WorkspacePanelProps {
  onCodeChange: (code: string) => void;
  onWorkspaceChange?: (json: unknown) => void;
  /** Fires once after Blockly has injected and the initial demo has loaded. */
  onReady?: () => void;
  /** Light/dark theme for Blockly — switches without reloading workspace. */
  theme?: 'light' | 'dark';
  /** Active compile target. The emit() pipeline calls target.generate(ctx). */
  target: TargetSpec;
  /** User clicked "Make Module" — page opens the naming dialog. */
  onRequestMakeModule?: () => void;
  /** User clicked "Ungroup module". */
  onRequestUngroup?: () => void;
}

export const WorkspacePanel = forwardRef<WorkspaceHandle, WorkspacePanelProps>(
  function WorkspacePanel({ onCodeChange, onWorkspaceChange, onReady, theme = 'dark', target, onRequestMakeModule, onRequestUngroup }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<any>(null);
    const blocklyRef = useRef<any>(null);
    const generatorRef = useRef<any>(null);
    const emitRef = useRef<() => void>(() => {});
    const moRef = useRef<MutationObserver | null>(null);
    const moduleUnsubRef = useRef<(() => void) | null>(null);
    const onCodeChangeRef = useRef(onCodeChange);
    const onWorkspaceChangeRef = useRef(onWorkspaceChange);
    const onReadyRef = useRef(onReady);
    const themeRef = useRef<'light' | 'dark'>(theme);
    const targetRef = useRef(target);

    // keep latest callbacks without re-running the heavy useEffect
    useEffect(() => {
      onCodeChangeRef.current = onCodeChange;
      onWorkspaceChangeRef.current = onWorkspaceChange;
      onReadyRef.current = onReady;
      targetRef.current = target;
    }, [onCodeChange, onWorkspaceChange, onReady, target]);

    // re-emit code when target changes
    useEffect(() => {
      emitRef.current?.();
    }, [target]);

    // swap Blockly theme at runtime when the prop changes
    useEffect(() => {
      themeRef.current = theme;
      const ws = workspaceRef.current;
      const Blockly = blocklyRef.current;
      if (!ws || !Blockly) return;
      try {
        const nextTheme = createNexysTheme(Blockly, theme);
        ws.setTheme(nextTheme);
      } catch (err) {
        console.warn('Theme swap failed', err);
      }
    }, [theme]);

    useEffect(() => {
      let disposed = false;
      let workspace: any;

      // Synchronously claim this container so a concurrent effect run
      // (HMR, StrictMode, or a parent remount race) can't start a parallel
      // inject. The previous async-only guard could still race because the
      // check happens AFTER the dynamic-imports await.
      const containerEl = containerRef.current;
      if (!containerEl) return;
      if ((containerEl as any).__nexysClaimed) return;
      (containerEl as any).__nexysClaimed = true;

      (async () => {
        const [
          BlocklyMod,
          pythonModule,
          blocksModule,
          toolboxModule,
          generatorModule,
          themeModule,
          initialWsModule,
        ] = await Promise.all([
          import('blockly'),
          import('blockly/python'),
          import('@/lib/blockly/blocks'),
          import('@/lib/blockly/toolbox'),
          import('@/lib/blockly/python-generator'),
          import('@/lib/blockly/theme'),
          import('@/lib/blockly/initial-workspace'),
        ]);

        if (disposed || !containerRef.current) return;

        // StrictMode safety: React 18 in dev double-invokes effects. If a
        // previous mount already injected Blockly into this container, bail
        // out — otherwise we end up with two workspaces stacked on top of
        // each other, both responding to flyout clicks and creating duplicate
        // blocks at the same coordinate.
        if (containerRef.current.querySelector('.injectionDiv, .blocklySvg')) {
          return;
        }

        const Blockly: any = BlocklyMod;
        const { pythonGenerator } = pythonModule;
        // Blockly 11 exports `Order` separately from pythonGenerator.ORDER.
        const Order =
          (pythonModule as any).Order ??
          (pythonGenerator as any).ORDER ??
          (pythonGenerator as any).Order;
        const { defineNexysBlocks } = blocksModule;
        const { nexysToolbox } = toolboxModule;
        const { registerPythonGenerators } = generatorModule;
        const { createNexysTheme } = themeModule;
        const { INITIAL_WORKSPACE_STATE } = initialWsModule;

        defineNexysBlocks(Blockly);
        registerPythonGenerators(pythonGenerator, Order);
        // Re-register any modules that survived from a previous session/load.
        registerAllModules(Blockly, pythonGenerator);

        const blocklyTheme = createNexysTheme(Blockly, themeRef.current);

        workspace = Blockly.inject(containerRef.current, {
          toolbox: nexysToolbox as any,
          theme: blocklyTheme,
          renderer: 'zelos',
          grid: {
            spacing: 24,
            length: 1,
            colour: '#1f2229', // hsl(220 14% 14%) — Blockly 11 may reject hsl()
            snap: true,
          },
          zoom: {
            controls: false,
            wheel: true,
            startScale: 0.95,
            maxScale: 1.5,
            minScale: 0.5,
            scaleSpeed: 1.1,
          },
          trashcan: false,
          sounds: false,
          move: {
            scrollbars: { horizontal: true, vertical: true },
            drag: true,
            wheel: false,
          },
        });

        workspaceRef.current = workspace;
        blocklyRef.current = Blockly;
        generatorRef.current = pythonGenerator;

        // Dynamic Modules toolbox category — lists every defined module as a
        // draggable block. Re-evaluated each time the category opens.
        workspace.registerToolboxCategoryCallback('MODULES', () => buildModuleFlyout());

        // Load BIT demo sequence so first impression is strong
        try {
          Blockly.serialization.workspaces.load(INITIAL_WORKSPACE_STATE, workspace);
        } catch (err) {
          console.warn('Initial workspace load failed', err);
        }

        const emit = () => {
          // capture workspace JSON once — both code-gen and parent state need it
          let json: any = {};
          try {
            json = Blockly.serialization.workspaces.save(workspace);
          } catch (err) {
            console.error('[nexys] workspaces.save failed', err);
          }
          if (onWorkspaceChangeRef.current) onWorkspaceChangeRef.current(json);

          let code = '';
          try {
            const t = targetRef.current;
            // Pre-generate Python module (Sub-VI) defs — only Python targets use them.
            const moduleDefs = t.language === 'python'
              ? generateModuleDefs(Blockly, pythonGenerator)
              : '';
            code = t.generate({
              workspaceJson: json,
              workspace,
              pythonGenerator,
              Order,
              moduleDefs,
            });
          } catch (err) {
            console.error('[nexys] target.generate failed', err);
            return;
          }
          onCodeChangeRef.current?.(code);
        };
        emitRef.current = emit;

        emit();

        // Listen to workspace events and regenerate Python, but skip events
        // fired during an active drag — saving the workspace mid-drag has
        // been observed to cause Blockly to fire follow-up events recursively,
        // creating duplicate blocks at the insertion point. We flush once
        // after the drag completes.
        let pendingPostDrag = false;
        workspace.addChangeListener((ev: any) => {
          const dragging = typeof workspace.isDragging === 'function'
            ? workspace.isDragging()
            : false;
          if (dragging) {
            pendingPostDrag = true;
            return;
          }
          if (pendingPostDrag) {
            pendingPostDrag = false;
            // queue a microtask so all drag-end events settle first
            queueMicrotask(emit);
            return;
          }
          emit();
        });

        // ── Flyout scrollbar residue fix ──
        // Blockly's flyout vertical scrollbar is rendered as a SEPARATE SVG
        // element next to the flyout, and Blockly does NOT hide it when the
        // flyout closes — leaving a ghost gray bar in the workspace.
        // CSS sibling selectors alone don't catch every browser quirk, so we
        // run a MutationObserver: whenever a flyout's visibility flips,
        // mirror that state to every scrollbar sibling in the same parent.
        const syncFlyoutScrollbars = () => {
          if (!containerEl) return;
          const flyouts = containerEl.querySelectorAll<HTMLElement | SVGElement>('.blocklyFlyout');
          flyouts.forEach(fly => {
            const style = (fly as HTMLElement).style;
            const hidden =
              style.visibility === 'hidden' ||
              style.display === 'none' ||
              fly.classList.contains('blocklyHidden');
            const parent = fly.parentNode as Element | null;
            if (!parent) return;
            // hide every sibling scrollbar group that belongs to this flyout
            parent.querySelectorAll<HTMLElement | SVGElement>(
              '.blocklyFlyoutScrollbar, .blocklyScrollbarVertical, .blocklyScrollbarHorizontal'
            ).forEach(sb => {
              // only sibling scrollbars, not those nested inside the main workspace
              if (sb.closest('.blocklyMainBackground')) return;
              (sb as HTMLElement).style.display = hidden ? 'none' : '';
            });
          });
        };

        const mo = new MutationObserver(() => syncFlyoutScrollbars());
        mo.observe(containerEl, {
          attributes: true,
          subtree: true,
          attributeFilter: ['style', 'class', 'visibility', 'display'],
        });
        // run once at start in case flyout starts closed
        syncFlyoutScrollbars();
        moRef.current = mo;

        // When the module set changes (create / remove / restore), re-register
        // blocks+generators, refresh the toolbox so the Modules category and
        // any in-canvas module blocks render, and regenerate code.
        const unsubModules = subscribeModules(() => {
          try {
            registerAllModules(Blockly, pythonGenerator);
            workspace.refreshToolboxSelection?.();
            emit();
          } catch (err) {
            console.warn('[nexys] module refresh failed', err);
          }
        });
        moduleUnsubRef.current = unsubModules;

        onReadyRef.current?.();
      })();

      return () => {
        disposed = true;
        try { moduleUnsubRef.current?.(); moduleUnsubRef.current = null; } catch { /* ignore */ }
        try {
          moRef.current?.disconnect();
          moRef.current = null;
        } catch { /* ignore */ }
        try {
          workspace?.dispose();
        } catch {
          /* ignore */
        }
        // Force-clear any stray Blockly DOM that survived dispose().
        if (containerEl) {
          containerEl.innerHTML = '';
          delete (containerEl as any).__nexysClaimed;
        }
        // also clear refs so theme effect / loadTemplate don't operate on a
        // disposed workspace until the next mount finishes.
        workspaceRef.current = null;
        blocklyRef.current = null;
      };
    }, []);

    useImperativeHandle(
      ref,
      (): WorkspaceHandle => ({
        loadTemplate: (state: unknown) => {
          const ws = workspaceRef.current;
          const Blockly = blocklyRef.current;
          if (!ws || !Blockly) return;
          try {
            ws.clear();
            Blockly.serialization.workspaces.load(state, ws);
            emitRef.current?.();
          } catch (err) {
            console.warn('Template load failed', err);
          }
        },
        clear: () => {
          workspaceRef.current?.clear();
          emitRef.current?.();
        },
        getWorkspaceJson: () => {
          const ws = workspaceRef.current;
          const Blockly = blocklyRef.current;
          if (!ws || !Blockly) return {};
          try {
            return Blockly.serialization.workspaces.save(ws);
          } catch {
            return {};
          }
        },

        hasSelection: () => {
          const sel = workspaceRef.current?.getSelected?.();
          if (!sel) return false;
          // a module instance can't itself be re-modularized
          return !moduleIdFromType(sel.type);
        },

        makeModuleFromSelection: (name: string): ModuleDef | null => {
          const ws = workspaceRef.current;
          const Blockly = blocklyRef.current;
          const pyGen = generatorRef.current;
          if (!ws || !Blockly || !pyGen) return null;
          const sel = ws.getSelected?.();
          if (!sel || moduleIdFromType(sel.type)) return null;

          // Capture the selected block + its inputs + next-chain.
          let bodyState: any;
          try {
            bodyState = Blockly.serialization.blocks.save(sel);
          } catch (err) {
            console.warn('[nexys] capture failed', err);
            return null;
          }
          if (!bodyState) return null;

          // Free variables (read but not written in the body) become inputs.
          const freeNames = detectFreeVars(bodyState, (vid) => {
            try { return ws.getVariableById?.(vid)?.name; } catch { return undefined; }
          });

          const id = nextModuleId();
          const def: ModuleDef = {
            id, name: name.trim() || id,
            bodyState,
            createdAt: new Date().toISOString(),
            blockCount: countBlocks(bodyState),
            params: freeNames.map(n => ({ name: n })),
          };

          // Register the new block type + generator BEFORE we drop an instance.
          registerModuleBlock(Blockly, pyGen, def);

          // Remember where the original sat + what it was connected to.
          const xy = sel.getRelativeToSurfaceXY?.() ?? { x: 40, y: 40 };
          const prevConn = sel.previousConnection?.targetConnection ?? null;

          // Delete the original block subtree, then create the module instance.
          try {
            sel.dispose(true); // heal connections of the chain above
          } catch { /* ignore */ }

          let moduleBlock: any;
          try {
            moduleBlock = ws.newBlock(moduleBlockType(id));
            moduleBlock.initSvg?.();
            moduleBlock.render?.();
            moduleBlock.moveBy?.(xy.x, xy.y);
            // reconnect to whatever the original was attached below
            if (prevConn && moduleBlock.previousConnection) {
              prevConn.connect(moduleBlock.previousConnection);
            }
          } catch (err) {
            console.warn('[nexys] module instance placement failed', err);
          }

          // Publish to the store (this triggers toolbox + codegen refresh).
          addModule(def);
          emitRef.current?.();
          return def;
        },

        ungroupSelectedModule: (): boolean => {
          const ws = workspaceRef.current;
          const Blockly = blocklyRef.current;
          if (!ws || !Blockly) return false;
          const sel = ws.getSelected?.();
          if (!sel) return false;
          const modId = moduleIdFromType(sel.type);
          if (!modId) return false;
          const def = getModules().find(m => m.id === modId);
          if (!def?.bodyState) return false;

          const xy = sel.getRelativeToSurfaceXY?.() ?? { x: 40, y: 40 };
          const prevConn = sel.previousConnection?.targetConnection ?? null;
          try { sel.dispose(true); } catch { /* ignore */ }

          try {
            const restored = Blockly.serialization.blocks.append(def.bodyState, ws);
            restored.moveBy?.(xy.x, xy.y);
            if (prevConn && restored.previousConnection) {
              prevConn.connect(restored.previousConnection);
            }
          } catch (err) {
            console.warn('[nexys] ungroup failed', err);
            return false;
          }
          emitRef.current?.();
          return true;
        },
      }),
      []
    );

    const zoomBy = (delta: number) => {
      const ws = workspaceRef.current;
      if (!ws) return;
      ws.zoomCenter(delta);
    };

    const resetView = () => {
      const ws = workspaceRef.current;
      if (!ws) return;
      ws.scrollCenter();
      ws.setScale(0.95);
    };

    return (
      <section className="flex-1 relative bg-workspace overflow-hidden">
        <div ref={containerRef} className="absolute inset-0" />

        {/* Floating module toolbar (top-left) */}
        <div className="absolute top-3 left-3 z-10 flex items-stretch bg-surface/90 backdrop-blur-[2px] border border-border">
          <button
            onClick={() => onRequestMakeModule?.()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-text-muted hover:text-signal hover:bg-surface-2 transition-colors"
            title="선택한 블록(과 그 아래 체인)을 재사용 가능한 모듈로 묶기"
          >
            <Combine size={13} strokeWidth={1.75} />
            Make Module
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => onRequestUngroup?.()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title="선택한 모듈 블록을 내부 블록들로 다시 펼치기"
          >
            <Ungroup size={13} strokeWidth={1.75} />
            Ungroup
          </button>
        </div>

        {/* Floating zoom controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col bg-surface/90 backdrop-blur-[2px] border border-border">
          <button
            onClick={() => zoomBy(1)}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={14} strokeWidth={1.75} />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={() => zoomBy(-1)}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={14} strokeWidth={1.75} />
          </button>
          <div className="h-px bg-border" />
          <button
            onClick={resetView}
            className="p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            title="Reset view"
          >
            <Maximize2 size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* Coordinate badge — instrument-style watermark */}
        <div className="absolute bottom-2 left-2 z-10 overline text-[10px] text-text-muted/50 mono pointer-events-none">
          nexys.workspace · zelos
        </div>
      </section>
    );
  }
);
