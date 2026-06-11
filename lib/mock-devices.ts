import type { Device } from './types';

/**
 * 시연용 mock 디바이스. 각 디바이스는 특정 하드웨어 타겟(targetId)을 실행한다 —
 * Deploy 시 활성 컴파일 타겟과 디바이스 타겟이 다르면 호환성 경고가 뜬다.
 */
export const MOCK_DEVICES: Device[] = [
  {
    id: 'rpi-defense-bit-01',
    name: 'BIT Test Station A',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 12_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['BIT Sequence Runner', 'TDMS Logger', 'Threshold Validator'],
    description: '내장시험(BIT) 자동 시퀀스 검증 스테이션. DO→AI 응답 루프.',
    targetId: 'rpi',
  },
  {
    id: 'rpi-vibration-mil810',
    name: 'MIL-STD-810 Vibration Rig',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 3_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['3-Axis Accel Driver', 'RMS Compute', 'Trigger Safety Stop'],
    description: 'MIL-STD-810 환경시험 — 3축 가속도 RMS 모니터링 및 자동 안전 정지.',
    targetId: 'rpi',
  },
  {
    id: 'jetson-edge-ai-01',
    name: 'Jetson Edge-AI Node',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 6_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['CUDA Signal Pipeline', 'TensorRT Classifier', 'MQTT Telemetry'],
    description: 'Jetson Orin 엣지 추론 노드 — GPU 가속 신호처리 + 실시간 분류.',
    targetId: 'jetson',
  },
  {
    id: 'arduino-field-logger-01',
    name: 'Arduino Field Logger',
    mode: 'defense',
    status: 'online',
    lastSeen: new Date(Date.now() - 40_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['Serial TDMS Bridge', 'PWM Driver'],
    description: '저전력 현장 로거 — Arduino Mega 기반 간이 계측/구동.',
    targetId: 'arduino',
  },
  {
    id: 'stm32-hils-loopback',
    name: 'STM32 HILS Loopback',
    mode: 'defense',
    status: 'offline',
    lastSeen: new Date(Date.now() - 4 * 3_600_000).toISOString(),
    channels: { ai: 8, ao: 4, di: 8, do: 8 },
    modulesInstalled: ['1ms Sync Engine', 'HAL Model Runner', 'DAC Feedback'],
    description: 'Hardware-in-the-Loop 미니 루프 — STM32 F4, 1ms 동기 AI→모델→AO 피드백.',
    targetId: 'stm32',
  },
];

export function findDeviceById(id: string): Device | undefined {
  return MOCK_DEVICES.find(d => d.id === id);
}
