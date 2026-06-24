import type { Device } from './types';

/**
 * 시연용 mock 디바이스. 각 디바이스는 특정 하드웨어 타겟(targetId)을 실행한다 —
 * Deploy 시 활성 컴파일 타겟과 디바이스 타겟이 다르면 호환성 경고가 뜬다.
 */
export const MOCK_DEVICES: Device[] = [
  // ── NI instruments ──
  {
    id: 'ni-pxie-rack-01',
    name: 'NI PXIe Rack #1',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 4_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['PXIe-6363 DAQ', 'NI-DAQmx 24.0', 'TDMS Streaming'],
    description: 'PXIe-1092 섀시 + PXIe-6363 멀티펑션 DAQ. 고속 동기 계측 랙.',
    targetId: 'ni_pxie',
  },
  {
    id: 'ni-crio-field-01',
    name: 'NI cRIO Field Unit',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 9_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['cRIO-9045', 'NI-9205 AI', 'NI-9264 AO', 'FPGA Bitfile'],
    description: 'CompactRIO 야전 제어기 — NI Linux RT + FPGA, C-Series 모듈.',
    targetId: 'ni_crio',
  },
  {
    id: 'ni-cdaq-bench-01',
    name: 'NI cDAQ Bench',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 20_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['cDAQ-9178', 'NI-9213 TC', 'NI-9476 DO'],
    description: 'CompactDAQ 벤치탑 — USB 섀시 + C-Series, 시험실 계측용.',
    targetId: 'ni_cdaq',
  },
];

export function findDeviceById(id: string): Device | undefined {
  return MOCK_DEVICES.find(d => d.id === id);
}
