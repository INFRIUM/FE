// 서버 주소는 여기에서 관리합니다. .env.local의 VITE_API_BASE_URL로 변경할 수 있습니다.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(
  /\/$/,
  '',
)

/** 서버가 오류를 반환하면 status와 data를 함께 확인할 수 있습니다. */
export class APIError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'APIError'
    this.status = status
    this.data = data
  }
}

let accessToken = null
let tokenScheme = 'Bearer'

// Base URL은 ngrok의 origin만 입력합니다. v0.1 조회 경로의 마지막 /를 유지합니다.
export const ENDPOINTS = {
  root: '/api/v1/',
  register: '/api/v1/auth/register/',
  login: '/api/v1/auth/login/',
  bridges: '/api/v1/bridges/',
  components: '/api/v1/components/',
  sensors: '/api/v1/sensors/',
  measurements: '/api/v1/measurements/',
  experiments: '/api/v1/experiments/',
  analysisWindows: '/api/v1/analysis-windows/',
  anomalyResults: '/api/v1/anomaly-results/',
  riskResults: '/api/v1/risk-results/',
  alerts: '/api/v1/alerts/',
  alertHistories: '/api/v1/alert-histories/',
}

/** 로그인 후 토큰을 설정합니다. 로그아웃할 때는 null을 전달하세요. */
export function setAccessToken(token, scheme = 'Bearer') {
  accessToken = token
  tokenScheme = scheme
}

/**
 * 모든 API 호출의 공통 처리: 주소, 쿼리, 인증 헤더, 응답 및 오류.
 * @param {string} path 서버 주소를 제외한 경로 (예: '/bridges')
 * @param {Omit<RequestInit, 'body'> & {
 *   body?: unknown,
 *   params?: Record<string, string | number | boolean | null | undefined>
 * }} [options]
 * @returns {Promise<any>}
 */
async function request(path, { params, body, headers, ...options } = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null) query.set(key, String(value))
  }

  let url = `${API_BASE_URL}/${path.replace(/^\//, '')}`
  const queryString = query.toString()
  if (queryString) url += `${url.includes('?') ? '&' : '?'}${queryString}`

  const requestHeaders = new Headers(headers)
  if (API_BASE_URL.includes('.ngrok-') || API_BASE_URL.includes('.ngrok.')) {
    requestHeaders.set('ngrok-skip-browser-warning', 'true')
  }
  if (!requestHeaders.has('Accept'))
    requestHeaders.set('Accept', 'application/json')
  if (accessToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `${tokenScheme} ${accessToken}`)
  }

  const isForm = body instanceof FormData
  if (body !== undefined && !isForm && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(url, {
    ...options,
    headers: requestHeaders,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
      : AbortSignal.timeout(15000),
  })

  const text = await response.text()
  if (
    response.ok &&
    response.headers.get('content-type')?.includes('text/html')
  ) {
    throw new APIError(
      'JSON 대신 HTML을 받았습니다. 최신 ngrok 주소와 Django 실행 상태를 확인해 주세요.',
      response.status,
      null,
    )
  }
  let data = text || null
  if (text && response.headers.get('content-type')?.includes('json')) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new APIError(
        '서버의 JSON 응답을 읽을 수 없습니다.',
        response.status,
        text,
      )
    }
  }
  if (!response.ok) {
    throw new APIError(
      data?.message ||
        data?.detail ||
        `API 요청에 실패했습니다. (${response.status})`,
      response.status,
      data,
    )
  }
  return data
}

// 화면에서는 fetch 대신 API.get(), API.post() 등을 사용하세요.
const API = {
  request,
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) =>
    request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) =>
    request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options = {}) =>
    request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options = {}) =>
    request(path, { ...options, method: 'DELETE' }),
}

export default API

const authFieldLabels = {
  name: '이름',
  email: '이메일',
  password: '비밀번호',
  password_confirm: '비밀번호 확인',
  non_field_errors: '인증',
  detail: '인증',
  error: '인증',
  errors: '인증',
}
function authResponseError(data, fields) {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return '서버 인증 응답 형식을 확인해 주세요.'
  const messages = []
  for (const field of [...fields, 'non_field_errors', 'error', 'errors']) {
    const value = data[field]
    if (Array.isArray(value))
      messages.push(
        `${authFieldLabels[field] || field}: ${value.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ')}`,
      )
    else if (value && typeof value === 'object')
      messages.push(
        `${authFieldLabels[field] || field}: ${JSON.stringify(value)}`,
      )
    else if (
      ['error', 'errors', 'non_field_errors'].includes(field) &&
      typeof value === 'string' &&
      value
    )
      messages.push(value)
  }
  if (messages.length) return messages.join('\n')
  if (data.success === false || data.status === 'error')
    return data.message || data.detail || '인증 요청에 실패했습니다.'
  return null
}

export async function registerAccount(
  { name, email, password, password_confirm },
  options = {},
) {
  const result = await API.post(
    ENDPOINTS.register,
    { name, email, password, password_confirm },
    options,
  )
  const error = authResponseError(result, [
    'name',
    'email',
    'password',
    'password_confirm',
  ])
  if (error) throw new APIError(error, 200, result)
  if (!(
    result.id ||
    result.user ||
    result.success === true ||
    result.message ||
    result.detail
  ))
    throw new APIError(
      '회원가입 요청은 전송됐지만 성공 응답 형식을 확인해야 합니다.',
      200,
      result,
    )
  return result
}

export async function loginAccount({ email, password }, options = {}) {
  const result = await API.post(ENDPOINTS.login, { email, password }, options)
  const error = authResponseError(result, ['email', 'password'])
  if (error) throw new APIError(error, 200, result)
  const access = result.access || result.access_token || result.tokens?.access
  const token = access || result.token || result.key
  if (typeof token !== 'string' || !token)
    throw new APIError(
      result.detail ||
        result.message ||
        '로그인 요청은 전송됐지만 인증 토큰 응답 형식을 확인해야 합니다.',
      200,
      result,
    )
  setAccessToken(token, result.token_type || (access ? 'Bearer' : 'Token'))
  return result
}
