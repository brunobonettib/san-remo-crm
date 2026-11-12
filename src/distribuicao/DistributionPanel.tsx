import { useCallback, useEffect, useRef, useState } from 'react'
import { formatDate } from '../leads/types'
import { distributeNextLead, listDistributionHistory } from './api'
import type { DistributionHistory, DistributionResult } from './api'
import './distribuicao.css'

type Outcome = { result: DistributionResult; entry: DistributionHistory | null }

export function DistributionPanel({
  onDistributed,
}: {
  onDistributed: () => void
}) {
  const [history, setHistory] = useState<DistributionHistory[]>([])
  const [historyStatus, setHistoryStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading')
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyLock = useRef(false)
  const mounted = useRef(false)
  const historyRequest = useRef(0)
  const historyController = useRef<AbortController | null>(null)

  const reloadHistory = useCallback(async (): Promise<
    DistributionHistory[] | null
  > => {
    const current = ++historyRequest.current
    historyController.current?.abort()
    const controller = new AbortController()
    historyController.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 30_000)
    setHistoryStatus('loading')
    setHistoryError(null)
    try {
      const rows = await listDistributionHistory(controller.signal)
      if (current !== historyRequest.current) return null
      setHistory(rows)
      setHistoryStatus('ready')
      return rows
    } catch (error) {
      if (current !== historyRequest.current) return null
      setHistoryError(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o histórico.',
      )
      setHistoryStatus('error')
      return null
    } finally {
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void reloadHistory()
    return () => {
      mounted.current = false
      ++historyRequest.current
      historyController.current?.abort()
    }
  }, [reloadHistory])

  async function distribute() {
    if (busyLock.current) return
    busyLock.current = true
    setBusy(true)
    setOutcome(null)
    setOperationError(null)
    try {
      const result = await distributeNextLead()
      if (!mounted.current) return
      setOutcome({ result, entry: null })
      if (result.status === 'distribuido') {
        onDistributed()
        const rows = await reloadHistory()
        if (mounted.current)
          setOutcome({
            result,
            entry: rows?.find((row) => row.lead_id === result.lead_id) ?? null,
          })
      }
    } catch (error) {
      if (!mounted.current) return
      setOperationError(
        error instanceof Error
          ? error.message
          : 'Não foi possível confirmar a distribuição. Confira o histórico antes de tentar novamente.',
      )
      // Falha de rede pode acontecer depois do commit. Reconsultar antes de outra ação.
      onDistributed()
      await reloadHistory()
    } finally {
      busyLock.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const confirmedEntry =
    outcome?.result.status === 'distribuido'
      ? outcome.entry ??
        (historyStatus === 'ready'
          ? history.find((row) => row.lead_id === outcome.result.lead_id) ?? null
          : null)
      : null

  return (
    <section
      className="distribution-section"
      aria-labelledby="distribution-title"
    >
      <div className="distribution-header">
        <div>
          <p className="eyebrow">DISTRIBUIÇÃO</p>
          <h2 id="distribution-title">Próxima oportunidade</h2>
          <p>
            Um lead do reservatório por vez, para o próximo corretor disponível.
          </p>
        </div>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => void distribute()}
        >
          {busy ? (
            <>
              <span className="spinner" /> Distribuindo…
            </>
          ) : (
            'Distribuir próximo lead'
          )}
        </button>
      </div>

      {operationError && (
        <p className="error-message distribution-feedback" role="alert">
          {operationError}
        </p>
      )}
      {outcome?.result.status === 'sem_lead' && (
        <p className="distribution-feedback distribution-info" role="status">
          Não há leads no reservatório para distribuir.
        </p>
      )}
      {outcome?.result.status === 'sem_corretor_elegivel' && (
        <p className="distribution-feedback distribution-info" role="status">
          Nenhum corretor está com presença válida. O lead permanece no
          reservatório.
        </p>
      )}
      {outcome?.result.status === 'distribuido' && (
        <div
          className="distribution-feedback distribution-success"
          role="status"
        >
          <strong>Lead distribuído com sucesso</strong>
          {confirmedEntry ? (
            <p>
              <b>{confirmedEntry.lead?.nome ?? confirmedEntry.lead_id}</b> para{' '}
              <b>{confirmedEntry.corretor?.nome ?? confirmedEntry.corretor_id}</b>{' '}
              em{' '}
              <time dateTime={outcome.result.distribuido_em!}>
                {formatDate(outcome.result.distribuido_em!)}
              </time>
              .
            </p>
          ) : (
            <p>
              Distribuição confirmada em{' '}
              <time dateTime={outcome.result.distribuido_em!}>
                {formatDate(outcome.result.distribuido_em!)}
              </time>
              .{' '}
              {historyStatus === 'loading'
                ? 'Buscando os nomes no histórico…'
                : 'Os nomes não estão disponíveis. Atualize o histórico antes de outra distribuição.'}
            </p>
          )}
        </div>
      )}

      <div className="distribution-history-heading">
        <div>
          <h3>Histórico de distribuição</h3>
          <p>Registros permanentes das oportunidades encaminhadas.</p>
        </div>
        <button
          className="secondary-button"
          disabled={historyStatus === 'loading' || busy}
          onClick={() => void reloadHistory()}
        >
          Atualizar histórico
        </button>
      </div>
      {historyStatus === 'loading' && (
        <p className="distribution-history-state" role="status">
          <span className="spinner" /> Carregando histórico…
        </p>
      )}
      {historyStatus === 'error' && (
        <div className="distribution-history-state">
          <p className="error-message" role="alert">
            {historyError}
          </p>
          <button
            className="secondary-button"
            onClick={() => void reloadHistory()}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {historyStatus === 'ready' && history.length === 0 && (
        <p className="distribution-history-state distribution-empty">
          Nenhuma distribuição registrada ainda.
        </p>
      )}
      {historyStatus === 'ready' && history.length > 0 && (
        <div
          className="distribution-table-scroll"
          role="region"
          aria-label="Histórico de distribuição"
          tabIndex={0}
        >
          <table className="distribution-table">
            <thead>
              <tr>
                <th scope="col">Lead</th>
                <th scope="col">Corretor</th>
                <th scope="col">Distribuído em</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.lead_id}>
                  <th scope="row">{row.lead?.nome ?? row.lead_id}</th>
                  <td>{row.corretor?.nome ?? row.corretor_id}</td>
                  <td>
                    <time dateTime={row.distribuido_em}>
                      {formatDate(row.distribuido_em)}
                    </time>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
