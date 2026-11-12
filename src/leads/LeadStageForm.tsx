import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { updateLeadStage } from './api'
import { ETAPAS } from './types'
import type { Etapa, Lead } from './types'

export function LeadStageForm({
  lead,
  disabled,
  onSaved,
  onSavingChange,
}: {
  lead: Lead
  disabled: boolean
  onSaved: (lead: Lead) => void
  onSavingChange: (saving: boolean) => void
}) {
  const [etapa, setEtapa] = useState<Etapa>(lead.etapa)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const active = useRef(false)
  const lock = useRef(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (lock.current || disabled || etapa === lead.etapa) return
    lock.current = true
    setSaving(true)
    onSavingChange(true)
    setError(null)
    setSuccess(false)
    try {
      const saved = await updateLeadStage(lead.id, etapa)
      if (!active.current) return
      onSaved(saved)
      setEtapa(saved.etapa)
      setSuccess(true)
    } catch (error) {
      if (active.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível atualizar a etapa.',
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
    <form
      className="lead-stage-form"
      onSubmit={(event) => void submit(event)}
      aria-busy={saving}
    >
      <label htmlFor="lead-stage-update">Atualizar etapa</label>
      <div className="stage-form-row">
        <select
          id="lead-stage-update"
          name="etapa"
          value={etapa}
          disabled={disabled || saving}
          onChange={(event) => {
            setEtapa(event.target.value as Etapa)
            setSuccess(false)
            setError(null)
          }}
        >
          {ETAPAS.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
        <button
          type="submit"
          className="primary-button"
          disabled={disabled || saving || etapa === lead.etapa}
        >
          {saving ? (
            <>
              <span className="spinner" /> Salvando...
            </>
          ) : (
            'Salvar etapa'
          )}
        </button>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="observation-success" role="status">
          ✓ Etapa atualizada com sucesso.
        </p>
      )}
    </form>
  )
}
