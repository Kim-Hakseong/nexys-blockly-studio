/**
 * Nexys Blockly Studio — domain types
 */

export type ModuleMode = 'defense' | 'voltage' | 'vibration' | 'sound' | 'dio';

export type DeviceStatus = 'online' | 'offline' | 'deploying';

export interface ChannelCapacity {
  ai: number;  // Analog Input count
  ao: number;  // Analog Output count
  di: number;  // Digital Input count
  do: number;  // Digital Output count
}

export interface Device {
  id: string;
  name: string;
  mode: ModuleMode;
  status: DeviceStatus;
  lastSeen: string;       // ISO timestamp
  channels: ChannelCapacity;
  modulesInstalled: string[];
  description?: string;   // 시연 설명
  /** Hardware target this unit runs (matches lib/targets ids: rpi/jetson/arduino/stm32). */
  targetId: string;
}

/**
 * Workspace JSON — 디바이스로 전송되는 직렬화 포맷
 */
export interface WorkspacePayload {
  schemaVersion: '1.0';
  workspaceId: string;
  workspaceName: string;
  deviceId: string;
  mode: ModuleMode;
  blocks: BlockNode[];
  generatedPython: string;  // 디버그용, 디바이스는 blocks를 우선 사용
  createdAt: string;
}

export interface BlockNode {
  id: string;
  type: string;
  params: Record<string, string | number | boolean>;
  children?: BlockNode[];
  then?: BlockNode[];
  else?: BlockNode[];
  outputVar?: string;
}

/**
 * 카테고리는 Blockly toolbox 카테고리 색상과 1:1 매핑된다.
 */
export type BlockCategory =
  | 'channels'
  | 'timing'
  | 'signal'
  | 'logic'
  | 'output';

export const CATEGORY_HUE: Record<BlockCategory, number> = {
  channels: 160,  // signal green
  timing:   38,   // amber
  signal:   260,  // purple (muted)
  logic:    220,  // slate
  output:   213,  // info blue
};
