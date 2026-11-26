import { useCallback, useEffect, useState } from 'react'
import { loadWorkspace } from '../services/workspace'
import type { Workspace } from '../data/types'
export function useWorkspace() {
  const [state, setState] = useState<{
      data: Workspace | null
      loading: boolean
      error: string | null
    }>({ data: null, loading: true, error: null }),
    [version, setVersion] = useState(0)
  const reload = useCallback((background = false) => {
    if (!background) setState((v) => ({ ...v, loading: true, error: null }))
    setVersion((v) => v + 1)
  }, [])
  useEffect(() => {
    const controller = new AbortController()
    loadWorkspace(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            data: null,
            loading: false,
            error: error instanceof Error ? error.message : '데이터 조회 실패',
          })
      })
    return () => controller.abort()
  }, [version])
  useEffect(() => {
    const timer = setInterval(() => reload(true), 10000)
    return () => clearInterval(timer)
  }, [reload])
  return { ...state, reload }
}
