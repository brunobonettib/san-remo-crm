import { useCallback, useEffect, useRef, useState } from 'react'
import { listLeads } from './api'
import { compareLeads } from './types'
import type { Lead } from './types'

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const request = useRef(0)
  const controller = useRef<AbortController | null>(null)

  const reload = useCallback(async () => {
    const current = ++request.current
    controller.current?.abort()
    const abort = new AbortController()
    controller.current = abort
    const timeout = window.setTimeout(() => abort.abort(), 30_000)
    setStatus('loading')
    setError(null)
    try {
      const result = await listLeads(abort.signal)
      if (current !== request.current) return
      setLeads(result)
      setStatus('ready')
    } catch (error) {
      if (current !== request.current) return
      setError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os leads. Tente novamente.',
      )
      setStatus('error')
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    void reload()
    return () => {
      ++request.current
      controller.current?.abort()
    }
  }, [reload])

  function acceptSaved(lead: Lead) {
    // Uma leitura iniciada antes da escrita nao pode sobrescrever seu resultado.
    ++request.current
    controller.current?.abort()
    setLeads((current) =>
      [...current.filter((item) => item.id !== lead.id), lead].sort(
        compareLeads,
      ),
    )
    setStatus('ready')
    setError(null)
  }

  return { leads, status, error, reload, acceptSaved }
}
