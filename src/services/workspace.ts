import API, { API_BASE_URL, ENDPOINTS } from '../API.js'
import {
  listResponse,
  normalizeBridge,
  normalizeExperiments,
  sortedMeasurements,
  toISO,
} from './normalize'
import type {
  BridgeDTO,
  ComponentDTO,
  SensorDTO,
  Measurement,
  ExperimentDTO,
  MeasurementQuery,
  Workspace,
  AIResult,
  BackendRecord,
  AnalysisRecords,
} from '../data/types'
const pendingAI = (): AIResult => ({
  state: 'PENDING',
  anomaly_score: null,
  is_anomaly: null,
  risk_score: null,
  risk_level: null,
  timestamp: null,
  history: [],
})
export async function queryMeasurements(
  query: MeasurementQuery,
  signal?: AbortSignal,
): Promise<Measurement[]> {
  const params = {
    ...query,
    from: query.from ? toISO(query.from) : undefined,
    to: query.to ? toISO(query.to) : undefined,
  }
  if (
    params.from &&
    params.to &&
    Date.parse(params.from) > Date.parse(params.to)
  )
    throw new Error('시작 시각이 종료 시각보다 늦을 수 없습니다.')
  return sortedMeasurements(
    listResponse<Measurement>(
      await API.get(ENDPOINTS.measurements, { params, signal }),
      '측정값',
    ),
  )
}
export async function loadWorkspace(signal: AbortSignal): Promise<Workspace> {
  if (!API_BASE_URL)
    throw new Error(
      '.env.local에 최신 ngrok origin을 VITE_API_BASE_URL로 설정하고 개발 서버를 재시작해 주세요.',
    )
  try {
    const origin = new URL(API_BASE_URL)
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    )
      throw new Error()
  } catch {
    throw new Error(
      'VITE_API_BASE_URL에는 최신 ngrok origin만 입력해 주세요. /api 또는 /api/v1 경로는 제외합니다.',
    )
  }
  const [bridgesRaw, componentsRaw, sensorsRaw] = await Promise.all([
    API.get(ENDPOINTS.bridges, { signal }),
    API.get(ENDPOINTS.components, { signal }),
    API.get(ENDPOINTS.sensors, { signal }),
  ])
  const bridges = listResponse<BridgeDTO>(bridgesRaw, '교량'),
    components = listResponse<ComponentDTO>(componentsRaw, '구성요소'),
    sensors = listResponse<SensorDTO>(sensorsRaw, '센서')
  if (
    !bridges.every(
      (b) => b && typeof b.id === 'number' && typeof b.bridge_id === 'string',
    ) ||
    !sensors.every(
      (s) =>
        s &&
        typeof s.id === 'number' &&
        typeof s.sensor_id === 'string' &&
        typeof s.sensor_type === 'string' &&
        typeof s.default_unit === 'string',
    )
  )
    throw new Error('교량 또는 센서 응답 형식을 확인해 주세요.')
  const mapped = await Promise.all(
    bridges.map(async (bridge) => {
      try {
        return normalizeBridge(
          bridge,
          components,
          sensors,
          await queryMeasurements({ bridge_id: bridge.bridge_id }, signal),
          pendingAI(),
        )
      } catch (error) {
        signal.throwIfAborted()
        return {
          ...normalizeBridge(bridge, components, sensors, [], pendingAI()),
          measurement_error:
            error instanceof Error ? error.message : '측정값 조회 실패',
        }
      }
    }),
  )
  let experiments: Workspace['experiments'] = [],
    experiments_error: string | null = null
  try {
    experiments = normalizeExperiments(
      listResponse<ExperimentDTO>(
        await API.get(ENDPOINTS.experiments, { signal }),
        '실험',
      ),
      bridges,
    )
  } catch (error) {
    signal.throwIfAborted()
    experiments_error =
      error instanceof Error ? error.message : '실험 조회 실패'
  }
  const analysis: AnalysisRecords = {
    windows: [],
    anomalies: [],
    risks: [],
    alerts: [],
    errors: [],
    failed: [],
  }
  await Promise.all(
    (
      [
        ['windows', ENDPOINTS.analysisWindows, '분석 구간'],
        ['anomalies', ENDPOINTS.anomalyResults, '이상 탐지 결과'],
        ['risks', ENDPOINTS.riskResults, '위험도 결과'],
        ['alerts', ENDPOINTS.alerts, '알림'],
      ] as const
    ).map(async ([key, url, label]) => {
      try {
        analysis[key] = listResponse<BackendRecord>(
          await API.get(url, { signal }),
          label,
        )
      } catch (error) {
        signal.throwIfAborted()
        analysis.failed!.push(key)
        analysis.errors.push(
          `${label}: ${error instanceof Error ? error.message : '조회 실패'}`,
        )
      }
    }),
  )
  return {
    bridges: mapped,
    experiments,
    experiments_error,
    system: { status: 'UNKNOWN' },
    analysis,
  }
}
