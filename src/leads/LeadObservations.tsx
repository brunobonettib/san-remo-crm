import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createObservation, listObservations } from './observations'
import type { Observation } from './observations'
import { formatDate } from './types'

export function LeadObservations({
  leadId,
  disabled,
  onSavingChange,
}: {
  leadId: string
  disabled: boolean
  onSavingChange: (saving: boolean) => void
}) {
  const [items, setItems] = useState<Observation[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const active = useRef(false)
  const lock = useRef(false)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    let current = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30_000)
    setStatus('loading')
    setLoadError(null)
    setItems([])
    void listObservations(leadId, controller.signal)
      .then((result) => {
        if (!current) return
        setItems(result)
        setStatus('ready')
      })
      .catch((error) => {
        if (!current) return
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Não foi possível carregar as observações.',
        )
        setStatus('error')
      })
      .finally(() => window.clearTimeout(timeout))
    return () => {
      current = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [leadId, attempt])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || disabled || status !== 'ready') return
    setSuccess(false)
    setSaveError(null)
    if (!text.trim()) {
      setSaveError('Escreva uma observação antes de registrar.')
      return
    }
    lock.current = true
    setSaving(true)
    onSavingChange(true)
    try {
      const saved = await createObservation(leadId, text)
      if (!active.current) return
      setItems((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ])
      setText('')
      setSuccess(true)
    } catch (error) {
      if (active.current)
        setSaveError(
          error instanceof Error
            ? error.message
            : 'Não foi possível registrar a observação.',
        )
    } finally {
      lock.current = false
      if (active.current) {
        setSaving(false)
        onSavingChange(false)
      }
    }
  }

  return (
    <section className="lead-observations" aria-labelledby="observations-title">
      <div className="observations-heading">
        <div>
          <p className="eyebrow">HISTÓRICO DO RELACIONAMENTO</p>
          <h3 id="observations-title">
            Observações <span>{status === 'ready' ? items.length : '—'}</span>
          </h3>
        </div>
      </div>
      {status === 'loading' && (
        <p className="observations-state" role="status">
          <span className="spinner" /> Carregando observações...
        </p>
      )}
      {status === 'error' && (
        <div className="observations-state">
          <p className="error-message" role="alert">
            {loadError}
          </p>
          <button
            className="secondary-button"
            disabled={disabled}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Tentar carregar novamente
          </button>
        </div>
      )}
      {status === 'ready' && (
        <>
          <form
            className="observation-form"
            onSubmit={(event) => void submit(event)}
            aria-busy={saving}
          >
            <label htmlFor="observation-text">Nova observação</label>
            <textarea
              id="observation-text"
              name="texto"
              rows={3}
              required
              disabled={disabled || saving}
              value={text}
              placeholder="Registre o que é importante para o próximo contato..."
              onChange={(event) => {
                setText(event.target.value)
                setSuccess(false)
                setSaveError(null)
              }}
            />
            <div className="observation-form-footer">
              <span>Os registros fazem parte do histórico do lead.</span>
              <button
                className="primary-button"
                disabled={disabled || saving}
                type="submit"
              >
                {saving ? (
                  <>
                    <span className="spinner" /> Registrando...
                  </>
                ) : (
                  'Registrar observação'
                )}
              </button>
            </div>
          </form>
          {saveError && (
            <div className="observation-save-error">
              <p className="error-message" role="alert">
                {saveError}
              </p>
              <button
                className="text-button"
                disabled={disabled}
                onClick={() => {
                  setSuccess(false)
                  setAttempt((value) => value + 1)
                }}
              >
                Consultar histórico novamente
              </button>
            </div>
          )}
          {success && (
            <p className="observation-success" role="status">
              ✓ Observação registrada com sucesso.
            </p>
          )}
          {items.length === 0 ? (
            <p className="observations-empty">
              Nenhuma observação registrada. O histórico deste lead começa por
              aqui.
            </p>
          ) : (
            <ol className="observation-list">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="observation-meta">
                    <strong>
                      {item.autor?.nome || `Autor: ${item.autor_id}`}
                    </strong>
                    <time dateTime={item.created_at}>
                      {formatDate(item.created_at)}
                    </time>
                  </div>
                  <p>{item.texto}</p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
