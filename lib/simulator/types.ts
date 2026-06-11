/**
 * Local virtual runtime — simulates Nexys hardware without touching real devices.
 * Used by Run / Debug mode in the Studio.
 */

export type LogLevel = 'info' | 'data' | 'warn' | 'alarm' | 'bit';

export interface LogEntry {
  /** ms since simulation start */
  t: number;
  level: LogLevel;
  source: string; // e.g. 'DO0', 'TDMS:bit_response', 'alarm:slack'
  message: string;
}

export interface ChannelState {
  ai: number[]; // 8
  ao: number[]; // 4
  di: boolean[]; // 8
  do: boolean[]; // 8
  /** rolling sample history for AI sparklines (most recent last) */
  aiHistory: number[][]; // 8 × HISTORY_LEN
  /** rolling sample history for AO sparklines */
  aoHistory: number[][]; // 4 × HISTORY_LEN
}

export const HISTORY_LEN = 60;

export interface SimMetrics {
  iterations: number;
  bitPass: number;
  bitFail: number;
  alarms: number;
  samples: number;
}

export type RunStatus = 'idle' | 'running' | 'stopped' | 'error';

export interface SimSnapshot {
  status: RunStatus;
  startedAt: number | null;
  channels: ChannelState;
  logs: LogEntry[];
  metrics: SimMetrics;
  lastError?: string;
}

export const INITIAL_CHANNEL_STATE: ChannelState = {
  ai: Array(8).fill(0),
  ao: Array(4).fill(0),
  di: Array(8).fill(false),
  do: Array(8).fill(false),
  aiHistory: Array.from({ length: 8 }, () => []),
  aoHistory: Array.from({ length: 4 }, () => []),
};

export const INITIAL_METRICS: SimMetrics = {
  iterations: 0,
  bitPass: 0,
  bitFail: 0,
  alarms: 0,
  samples: 0,
};
