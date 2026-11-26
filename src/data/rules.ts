export const riskLabels = {
  NORMAL: '정상',
  CAUTION: '주의',
  WARNING: '경고',
  DANGER: '위험',
}
export const formatNumber = (value: number | null | undefined, digits = 3) =>
  value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits)
export const formatTime = (value: string | null | undefined, date = false) =>
  value && Number.isFinite(Date.parse(value))
    ? new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        ...(date ? { year: 'numeric', month: '2-digit', day: '2-digit' } : {}),
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(new Date(value))
    : '미기록'
