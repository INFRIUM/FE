import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon, Logo, Notice } from './UI'
import { APIError, loginAccount, registerAccount } from '../API.js'

export default function Auth({
  signup,
  go,
}: {
  signup: boolean
  go: (path: string) => void
  loading?: boolean
  connected?: boolean
  error?: string | null
  retry?: () => void
}) {
  const [show, setShow] = useState(false),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [success, setSuccess] = useState(false)
  const pending = useRef<AbortController | null>(null)
  useEffect(() => () => pending.current?.abort(), [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const form = event.currentTarget
    const fields = new FormData(form)
    if (signup && fields.get('password') !== fields.get('confirm')) {
      setMessage('비밀번호가 일치하지 않습니다.')
      return
    }
    setMessage('')
    setSuccess(false)
    setBusy(true)
    const controller = new AbortController()
    pending.current = controller
    try {
      const email = String(fields.get('email')).trim(),
        password = String(fields.get('password'))
      if (signup) {
        await registerAccount(
          {
            name: String(fields.get('name')).trim(),
            email,
            password,
            password_confirm: String(fields.get('confirm')),
          },
          { signal: controller.signal },
        )
        setSuccess(true)
        setMessage('회원가입이 완료되었습니다. 로그인해 주세요.')
        form.reset()
      } else {
        await loginAccount({ email, password }, { signal: controller.signal })
        form.reset()
        go('/dashboard')
      }
    } catch (error) {
      if (controller.signal.aborted) return
      setMessage(
        error instanceof APIError || error instanceof Error
          ? error.message
          : '인증 요청을 전송하지 못했습니다.',
      )
    } finally {
      pending.current = null
      setBusy(false)
    }
  }
  function switchPage() {
    setMessage('')
    setShow(false)
    setSuccess(false)
    go(signup ? '/login' : '/signup')
  }
  return (
    <div className="auth-page">
      <div className="auth-intro">
        <Logo />
        <span className="eyebrow">INFRASTRUCTURE INTELLIGENCE</span>
        <h1>
          구조의 변화를 읽고,
          <br />
          안전의 내일을 연결합니다.
        </h1>
        <p>
          교량의 센서 데이터와 AI 분석을
          <br />
          하나의 워크스페이스에서 확인하세요.
        </p>
        <div className="auth-bridge">
          <Icon name="bridge" size={190} />
        </div>
        <span className="auth-intro-foot">
          SENSOR DATA → AI INSIGHT → DIGITAL TWIN
        </span>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <span className="eyebrow">WELCOME TO INFREUM</span>
          <h2>{signup ? '회원가입' : '워크스페이스 로그인'}</h2>
          <p>
            {signup
              ? '계정 정보를 입력해 주세요.'
              : '이메일과 비밀번호를 입력해 주세요.'}
          </p>
          <form key={signup ? 'signup' : 'login'} onSubmit={submit}>
            {signup && (
              <label>
                이름
                <input
                  name="name"
                  required
                  autoComplete="name"
                  maxLength={80}
                  placeholder="이름을 입력하세요"
                />
              </label>
            )}
            <label>
              이메일
              <input
                name="email"
                required
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
              />
            </label>
            <label>
              비밀번호
              <div className="password-field">
                <input
                  name="password"
                  required
                  minLength={signup ? 8 : undefined}
                  type={show ? 'text' : 'password'}
                  autoComplete={signup ? 'new-password' : 'current-password'}
                  placeholder={
                    signup ? '8자 이상 입력하세요' : '비밀번호를 입력하세요'
                  }
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? '비밀번호 숨기기' : '비밀번호 표시'}
                >
                  {show ? '숨김' : '표시'}
                </button>
              </div>
            </label>
            {signup && (
              <>
                <label>
                  비밀번호 확인
                  <input
                    name="confirm"
                    required
                    minLength={8}
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                </label>
                <label className="checkbox">
                  <input type="checkbox" required />
                  이용약관 및 개인정보 처리방침 동의 여부를 확인했습니다.
                </label>
              </>
            )}
            {message && (
              <Notice type={success ? 'info' : 'error'}>{message}</Notice>
            )}
            <button
              className="button primary"
              type="submit"
              disabled={busy || success}
            >
              {busy
                ? '서버 요청 중…'
                : success
                  ? '가입 완료'
                  : signup
                    ? '회원가입'
                    : '로그인'}
              <Icon name="arrow" size={16} />
            </button>
          </form>
          <p>
            {signup ? '이미 계정이 있나요?' : '계정이 없나요?'}{' '}
            <button
              className="text-button"
              onClick={switchPage}
              disabled={busy}
            >
              {signup ? '로그인' : '회원가입'}
            </button>
          </p>
          <p className="auth-connection-note">
            입력 정보는 인증 요청 시 백엔드로 전송됩니다. 비밀번호는 브라우저
            저장소에 저장하지 않습니다.
          </p>
          <button
            className="text-button auth-public-link"
            onClick={() => go('/dashboard')}
          >
            공개 DB 조회 화면 열기 →
          </button>
        </div>
      </div>
    </div>
  )
}
