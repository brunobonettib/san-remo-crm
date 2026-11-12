import { useCallback, useEffect, useRef, useState } from 'react'

export function usePresenceResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  interval: number,
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const request = useRef<AbortController | null>(null)
  const generation = useRef(0)

  const reload = useCallback(async () => {
    if (request.current) return
    const current = ++generation.current
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 15_000)
    setLoading(true)
    setError(null)
    try {
      const result = await load(controller.signal)
      if (current === generation.current) setData(result)
    } catch (error) {
      if (current !== generation.current) return
      setData(null)
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar a presença. Tente novamente.',
      )
    } finally {
      window.clearTimeout(timeout)
      if (current === generation.current) {
        request.current = null
        setLoading(false)
      }
    }
  }, [load])

  useEffect(() => {
    void reload()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reload()
    }, interval)
    function visible() {
      if (document.visibilityState === 'visible') {
        // Nao continuar exibindo um QR que pode ter expirado enquanto a aba dormia.
        setData(null)
        void reload()
      }
    }
    document.addEventListener('visibilitychange', visible)
    return () => {
      ++generation.current
      request.current?.abort()
      request.current = null
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [reload, interval])

  return { data, error, loading, reload }
}
