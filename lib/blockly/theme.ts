/**
 * Nexys 테마 — Blockly 11.x Theme API.
 *
 * 두 가지 모드(다크/라이트)를 제공한다. 워크스페이스 패널은 사용자가 테마를
 * 토글할 때 `workspace.setTheme(theme)`을 호출해 실시간으로 교체한다.
 *
 * NOTE: Blockly 11의 `parseBlockColour`는 hex 문자열만 받아들이고
 * `hsl(...)` CSS 함수는 거부한다. insertion marker / cursor 색은 반드시
 * hex로 전달해야 한다. 그 외 componentStyles(workspace/toolbox/flyout/
 * scrollbar bg+fg)는 SVG fill로 쓰여 CSS hsl()을 받지만, 일관성을 위해
 * 전부 hex로 정규화한다.
 */

type AnyBlockly = any;
export type ThemeMode = 'light' | 'dark';

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else              { r = c; b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const TOKENS = {
  dark: {
    workspaceBg: 'transparent',
    toolboxBg:   hslToHex(220, 13, 9),
    toolboxFg:   hslToHex(220, 9, 60),
    flyoutBg:    hslToHex(220, 13, 9),
    flyoutFg:    hslToHex(220, 9, 60),
    scrollbar:   hslToHex(220, 10, 18),
    insertion:   hslToHex(160, 64, 45),
    cursor:      hslToHex(160, 64, 45),
  },
  light: {
    workspaceBg: 'transparent',
    toolboxBg:   hslToHex(0, 0, 100),
    toolboxFg:   hslToHex(220, 12, 42),
    flyoutBg:    hslToHex(0, 0, 100),
    flyoutFg:    hslToHex(220, 12, 42),
    scrollbar:   hslToHex(220, 14, 86),
    insertion:   hslToHex(160, 70, 32),
    cursor:      hslToHex(160, 70, 32),
  },
} as const;

export function createNexysTheme(Blockly: AnyBlockly, mode: ThemeMode = 'dark') {
  const t = TOKENS[mode];
  return Blockly.Theme.defineTheme(`nexys-${mode}-${Date.now()}`, {
    base: Blockly.Themes.Zelos,
    componentStyles: {
      workspaceBackgroundColour: t.workspaceBg,
      toolboxBackgroundColour: t.toolboxBg,
      toolboxForegroundColour: t.toolboxFg,
      flyoutBackgroundColour: t.flyoutBg,
      flyoutForegroundColour: t.flyoutFg,
      flyoutOpacity: 1,
      scrollbarColour: t.scrollbar,
      scrollbarOpacity: 0.6,
      insertionMarkerColour: t.insertion,
      insertionMarkerOpacity: 0.4,
      cursorColour: t.cursor,
    },
    fontStyle: {
      family: '"IBM Plex Sans", system-ui, sans-serif',
      weight: '400',
      size: 13,
    },
    startHats: false,
  });
}
