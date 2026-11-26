import type {
  AIResult,
  BridgeDTO,
  ComponentDTO,
  SensorDTO,
  Measurement,
  ExperimentDTO,
  Workspace,
} from '../../src/data/types'
import { normalizeBridge } from '../../src/services/normalize'
export const DEMO_TIME = '2026-10-15T03:00:00.000Z'
export const mockBridges: BridgeDTO[] = [
  {
    id: 1,
    bridge_id: 'BOX_01',
    bridge_type: 'STEEL_BOX',
    name: 'Steel Box Girder Prototype',
    description: 'v0.1 연동 확인용 축소모형',
  },
]
export const mockComponents: ComponentDTO[] = [
  {
    id: 1,
    component_id: 'BOX_L4',
    name: 'Box Girder L/4',
    description: '경간 L/4 지점',
    bridge: 1,
  },
  {
    id: 2,
    component_id: 'BOX_CENTER',
    name: 'Box Girder Center',
    description: '경간 중앙 L/2',
    bridge: 1,
  },
]
export const mockSensors: SensorDTO[] = [
  'ACC_BOX_01',
  'ACC_BOX_02',
  'STRAIN_BOX_01',
  'STRAIN_BOX_02',
  'DISP_BOX_01',
].map((id, i) => ({
  id: i + 1,
  sensor_id: id,
  sensor_type: i < 2 ? 'ACC' : i < 4 ? 'STRAIN' : 'DISP',
  location: i === 0 || i === 2 ? 'L/4 (300 mm)' : 'L/2 (600 mm)',
  zone_id: i === 0 || i === 2 ? 'BOX_L4' : 'BOX_CENTER',
  model_x: null,
  model_y: null,
  model_z: null,
  default_unit: i < 2 ? 'g' : i < 4 ? 'με' : 'mm',
  is_active: true,
  bridge: 1,
  component: i === 0 || i === 2 ? 1 : 2,
}))
// 단일 테스트 값입니다. 가속도 축이나 실제 장치 온라인 상태를 의미하지 않습니다.
export const mockMeasurements: Measurement[] = mockSensors
  .flatMap((s, j) =>
    Array.from({ length: 60 }, (_, i) => ({
      id: j * 100 + i + 1,
      event_id: `TEST_${s.sensor_id}_${i + 1}`,
      measured_at: new Date(
        Date.parse(DEMO_TIME) - (59 - i) * 10000,
      ).toISOString(),
      sequence: i + 1,
      value: Number(
        (
          (j < 2 ? 0.025 : j < 4 ? 42 : 0.18) +
          Math.sin(i * 0.4 + j) * (j < 2 ? 0.004 : j < 4 ? 3 : 0.02)
        ).toFixed(5),
      ),
      unit: s.default_unit,
      quality_status: i === 58 ? 'DELAYED' : 'VALID',
      received_at: new Date(
        Date.parse(DEMO_TIME) - (59 - i) * 10000 + 500,
      ).toISOString(),
      bridge: 1,
      sensor: s.id,
      experiment: null,
    })),
  )
  .sort(
    (a, b) =>
      Date.parse(b.measured_at) - Date.parse(a.measured_at) ||
      b.sequence! - a.sequence!,
  )
export const mockExperiments: ExperimentDTO[] = []
export function demoAI(kind = 'STEEL_BOX'): AIResult {
  return {
    state: 'READY',
    anomaly_score: 0.128,
    is_anomaly: false,
    risk_score: kind === 'STEEL_TRUSS' ? 0.548 : 0.164,
    risk_level: kind === 'STEEL_TRUSS' ? 'CAUTION' : 'NORMAL',
    timestamp: DEMO_TIME,
    history: Array.from({ length: 12 }, (_, i) => ({
      timestamp: new Date(
        Date.parse(DEMO_TIME) - (11 - i) * 60000,
      ).toISOString(),
      anomaly_score: 0.128 + Math.sin(i * 0.4) * 0.015,
      risk_score: 0.164 + Math.cos(i * 0.3) * 0.01,
      risk_level: 'NORMAL',
    })),
  }
}
export function createMockWorkspace(): Workspace {
  return {
    bridges: mockBridges.map((b) =>
      normalizeBridge(
        b,
        mockComponents,
        mockSensors,
        mockMeasurements,
        demoAI(b.bridge_type),
      ),
    ),
    experiments: [],
    experiments_error: null,
    system: { status: 'UNKNOWN' },
    analysis: { windows: [], anomalies: [], risks: [], alerts: [], errors: [] },
  }
}
