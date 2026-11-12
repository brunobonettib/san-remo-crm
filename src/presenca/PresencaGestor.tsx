import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { getPresenceQr, listPresences } from './api'
import { presenceLink } from './links'
import { usePresenceResource } from './usePresenceResource'
import { formatDate } from '../leads/types'
import './presenca.css'

function QrPresenca() {
  const { data, error, loading, reload } = usePresenceResource(
    getPresenceQr,
    15_000,
  )
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!data) return
    const remaining = Date.parse(data.valido_ate) - Date.now()
    const timer = window.setTimeout(
      () => void reload(),
      remaining > 0 ? Math.min(remaining + 50, 300_000) : 5000,
    )
    return () => window.clearTimeout(timer)
  }, [data, reload])

  let link: string | null = null
  let configError: string | null = null
  if (data) {
    try {
      link = presenceLink(data.token)
    } catch (error) {
      configError =
        error instanceof Error
          ? error.message
          : 'Confira a URL pública da aplicação.'
    }
  }
  // Estimativa visual somente. Nunca autoriza ou rejeita uma confirmacao.
  const seconds = data
    ? Math.max(
        0,
        Math.min(300, Math.ceil((Date.parse(data.valido_ate) - now) / 1000)),
      )
    : 0
  const countdown = `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="presence-qr-card" aria-busy={loading}>
      <p className="eyebrow">PRESENÇA DA EQUIPE</p>
      <h3>Uma leitura. Tudo pronto.</h3>
      <p>
        Aponte a câmera do celular e confirme a presença na sua conta de
        corretor.
      </p>
      {loading && !data && (
        <p className="presence-state" role="status">
          <span className="spinner" /> Buscando QR vigente…
        </p>
      )}
      {(error || configError) && (
        <p className="error-message" role="alert">
          {error || configError}
        </p>
      )}
      {link && (
        <>
          <div className="presence-qr-image">
            <QRCodeSVG
              value={link}
              size={236}
              marginSize={4}
              level="M"
              title="QR Code para confirmar presença na San Remo"
            />
          </div>
          <div className="presence-countdown">
            <span>
              {seconds ? 'Renovação em' : 'Consultando próxima janela'}
            </span>
            <strong aria-label="Tempo estimado até renovar o QR">
              {countdown}
            </strong>
          </div>
          <p className="presence-fine-print">
            Tempo estimado. A validade é confirmada pelo servidor.
          </p>
        </>
      )}
      <button
        className="secondary-button"
        disabled={loading}
        onClick={() => void reload()}
      >
        {loading && data ? 'Atualizando…' : 'Atualizar QR'}
      </button>
    </div>
  )
}

function FilaPresenca() {
  const { data, error, loading, reload } = usePresenceResource(
    listPresences,
    30_000,
  )
  return (
    <div className="presence-queue" aria-busy={loading}>
      <div className="presence-queue-heading">
        <div>
          <h3>Fila de corretores</h3>
          <p>A ordem é mantida nas renovações válidas.</p>
        </div>
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => void reload()}
        >
          {loading ? 'Atualizando presenças…' : 'Atualizar presenças'}
        </button>
      </div>
      {loading && !data && (
        <p className="presence-state" role="status">
          <span className="spinner" /> Consultando a equipe…
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {data?.length === 0 && (
        <div className="presence-empty">
          <h4>A fila começa com a primeira presença.</h4>
          <p>Os corretores aparecerão aqui depois de confirmar pelo QR Code.</p>
        </div>
      )}
      {!!data?.length && (
        <>
          <p className="table-scroll-hint">Deslize a tabela para ver todos os dados →</p>
          <div
            className="presence-table-scroll"
            role="region"
            aria-label="Fila de presença dos corretores"
            tabIndex={0}
          >
            <table className="presence-table">
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  <th scope="col">Corretor</th>
                  <th scope="col">Presença</th>
                  <th scope="col">Válida até</th>
                </tr>
              </thead>
              <tbody>
                {data.map((entry) => (
                  <tr key={entry.corretor_id}>
                    <td>
                      <span className="presence-position">{entry.posicao}</span>
                    </td>
                    <th scope="row">{entry.nome}</th>
                    <td>
                      <span
                        className={`presence-badge ${entry.elegivel ? 'eligible' : 'expired'}`}
                      >
                        {entry.elegivel ? 'Elegível' : 'Expirado'}
                      </span>
                    </td>
                    <td>
                      <time dateTime={entry.valido_ate}>
                        {formatDate(entry.valido_ate)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="presence-fine-print">
            Situação consultada no servidor em{' '}
            {formatDate(data[0].consultado_em)}. Atualização automática a cada
            30 segundos.
          </p>
        </>
      )}
      <p className="presence-fine-print">
        A presença vale por 5 horas. Após expirar, uma nova confirmação leva o
        corretor ao final da fila. A posição é um número persistente e pode
        conter intervalos.
      </p>
    </div>
  )
}

export function PresencaGestor() {
  return (
    <section className="presence-section" aria-labelledby="presence-title">
      <div className="crm-section-heading">
        <div>
          <h2 id="presence-title">Presença e equipe</h2>
          <p>Uma equipe conectada, pronta para novas oportunidades.</p>
        </div>
      </div>
      <div className="presence-grid">
        <QrPresenca />
        <FilaPresenca />
      </div>
    </section>
  )
}
