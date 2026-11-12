import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand } from '../components/Brand'
import { useAuth } from '../auth/AuthProvider'
import { confirmPresence } from '../presenca/api'
import type { Presence } from '../presenca/api'
import { readPresenceToken } from '../presenca/links'
import { formatDate } from '../leads/types'
import '../presenca/presenca.css'

function Confirmation({ token }: { token: string | null }) {
  const { profile, signOut, isSigningOut, logoutError } = useAuth()
  const [result, setResult] = useState<Presence | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const active = useRef(false)
  const request = useRef<AbortController | null>(null)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      request.current?.abort()
    }
  }, [])

  async function confirm() {
    if (!token || request.current || result) return
    const controller = new AbortController()
    request.current = controller
    const timeout = window.setTimeout(() => controller.abort(), 20_000)
    setSaving(true)
    setError(null)
    try {
      const presence = await confirmPresence(token, controller.signal)
      if (active.current) setResult(presence)
    } catch (error) {
      if (active.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível confirmar sua presença. Tente novamente.',
        )
    } finally {
      window.clearTimeout(timeout)
      if (active.current) {
        request.current = null
        setSaving(false)
      }
    }
  }

  return (
    <main className="presence-page">
      <header className="presence-page-header">
        <Brand />
        <button
          className="secondary-button"
          disabled={isSigningOut || saving}
          onClick={() => void signOut()}
        >
          Sair
        </button>
      </header>
      <section className="presence-confirm-card" aria-busy={saving}>
        <span className="presence-confirm-icon" aria-hidden="true">
          {result ? '✓' : '◇'}
        </span>
        <p className="eyebrow">PRESENÇA SAN REMO</p>
        <h1>{result ? 'Você está na fila.' : 'Vamos começar?'}</h1>
        <p>
          Olá, {profile?.nome}.{' '}
          {result
            ? 'Sua presença foi confirmada pelo servidor.'
            : 'Confirme sua presença para ficar disponível por 5 horas.'}
        </p>
        {logoutError && (
          <p className="error-message" role="alert">
            {logoutError}
          </p>
        )}
        {!token && (
          <p className="error-message" role="alert">
            Link de presença inválido ou sem token. Leia o QR Code vigente
            disponibilizado pelo gestor.
          </p>
        )}
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {result ? (
          <div className="presence-confirm-result" role="status">
            <h2>Presença confirmada com sucesso</h2>
            <dl>
              <div>
                <dt>Posição na fila</dt>
                <dd>{result.posicao}</dd>
              </div>
              <div>
                <dt>Presença válida até</dt>
                <dd>
                  <time dateTime={result.valido_ate}>
                    {formatDate(result.valido_ate)}
                  </time>
                </dd>
              </div>
            </dl>
            <p>
              Para renovar, leia o QR vigente novamente. Durante a validade, sua
              posição é preservada; após expirar, você retorna ao final.
            </p>
          </div>
        ) : (
          token && (
            <button
              className="primary-button presence-confirm-button"
              disabled={saving}
              onClick={() => void confirm()}
            >
              {saving ? (
                <>
                  <span className="spinner" /> Confirmando presença…
                </>
              ) : (
                'Confirmar minha presença'
              )}
            </button>
          )
        )}
        <Link className="presence-back-link" to="/corretor">
          Ir para meus leads <span aria-hidden="true">↗</span>
        </Link>
        <p className="presence-fine-print">
          A validade do QR e a ordem da fila são verificadas no servidor ao
          confirmar.
        </p>
      </section>
      <footer className="workspace-footer">
        San Remo · Pessoas, conexões e conquistas.
      </footer>
    </main>
  )
}

export function PresencaPage() {
  const location = useLocation()
  const token = readPresenceToken(location.hash, location.search)
  // Outra leitura substitui integralmente o resultado da anterior, sem confirmar sozinha.
  return <Confirmation key={token || 'invalid'} token={token} />
}
