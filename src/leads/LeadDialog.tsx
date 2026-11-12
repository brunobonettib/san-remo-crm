import { useEffect, useRef, useState } from 'react'
import { createLead, updateLead } from './api'
import { LeadDetails } from './LeadDetails'
import { LeadForm } from './LeadForm'
import { LeadStageForm } from './LeadStageForm'
import { useAuth } from '../auth/AuthProvider'
import type { Lead, LeadValues } from './types'

export function LeadDialog({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead | null
  onClose: () => void
  onSaved: (lead: Lead, created: boolean) => void
}) {
  const { profile } = useAuth()
  const canEditData = profile?.papel === 'gestor'
  const dialog = useRef<HTMLDialogElement>(null)
  const saveLock = useRef(false)
  const active = useRef(false)
  const [editing, setEditing] = useState(canEditData && !lead)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stageSaving, setStageSaving] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const busy = saving || stageSaving || noteSaving

  useEffect(() => {
    active.current = true
    const element = dialog.current!
    element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      active.current = false
      element.close()
      document.body.style.overflow = previousOverflow
    }
  }, [])

  async function save(values: LeadValues) {
    if (saveLock.current || !canEditData) return
    saveLock.current = true
    setSaving(true)
    setError(null)
    try {
      const result = lead
        ? await updateLead(lead.id, values)
        : await createLead(values)
      if (active.current) onSaved(result, !lead)
    } catch (error) {
      if (active.current)
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o lead. Tente novamente.',
        )
    } finally {
      saveLock.current = false
      if (active.current) setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      className="lead-dialog"
      aria-labelledby="lead-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!saveLock.current && !busy) onClose()
      }}
    >
      <header className="lead-dialog-header">
        <div>
          <p className="eyebrow">{lead ? 'OPORTUNIDADE' : 'NOVO CONTATO'}</p>
          <h2 id="lead-dialog-title">
            {editing ? (lead ? 'Editar lead' : 'Cadastrar lead') : lead?.nome}
          </h2>
        </div>
        <button
          type="button"
          className="dialog-close"
          aria-label="Fechar"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
      </header>
      {editing && canEditData ? (
        <LeadForm
          lead={lead}
          saving={saving}
          error={error}
          onSave={(values) => void save(values)}
          onCancel={() => (lead ? setEditing(false) : onClose())}
        />
      ) : (
        lead && (
          <LeadDetails
            lead={lead}
            onEdit={canEditData ? () => setEditing(true) : undefined}
            disabled={busy}
            onNotesSavingChange={setNoteSaving}
          >
            {!canEditData && (
              <LeadStageForm
                lead={lead}
                disabled={busy}
                onSaved={(saved) => onSaved(saved, false)}
                onSavingChange={setStageSaving}
              />
            )}
          </LeadDetails>
        )
      )}
    </dialog>
  )
}
