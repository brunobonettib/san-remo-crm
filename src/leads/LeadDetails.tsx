import type { ReactNode } from 'react'
import { LeadObservations } from './LeadObservations'
import { etapaClass, formatDate } from './types'
import type { Lead } from './types'

export function LeadDetails({
  lead,
  onEdit,
  children,
  disabled,
  onNotesSavingChange,
}: {
  lead: Lead
  onEdit?: () => void
  children?: ReactNode
  disabled: boolean
  onNotesSavingChange: (saving: boolean) => void
}) {
  return (
    <div className="lead-details">
      <div className="detail-summary">
        <div className="lead-monogram" aria-hidden="true">
          {lead.nome.charAt(0)}
        </div>
        <div>
          <span className={`stage-badge ${etapaClass(lead.etapa)}`}>
            {lead.etapa}
          </span>
          <p>{lead.interesse}</p>
        </div>
      </div>
      <dl className="lead-detail-grid">
        <div>
          <dt>Telefone</dt>
          <dd>{lead.telefone}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{lead.email || 'Não informado'}</dd>
        </div>
        <div>
          <dt>Origem</dt>
          <dd>{lead.origem}</dd>
        </div>
        <div>
          <dt>Etapa</dt>
          <dd>{lead.etapa}</dd>
        </div>
        <div className="form-full">
          <dt>Responsável</dt>
          <dd>
            {lead.responsavel_id
              ? lead.responsavel?.nome || 'Perfil indisponível'
              : 'Sem responsável · No reservatório'}
          </dd>
        </div>
        <div>
          <dt>Cadastrado em</dt>
          <dd>{formatDate(lead.created_at)}</dd>
        </div>
        <div>
          <dt>Última atualização</dt>
          <dd>{formatDate(lead.updated_at)}</dd>
        </div>
      </dl>
      {onEdit && (
        <div className="lead-dialog-actions">
          <button
            className="primary-button"
            onClick={onEdit}
            disabled={disabled}
          >
            Editar dados <span aria-hidden="true">↗</span>
          </button>
        </div>
      )}
      {children}
      <LeadObservations
        key={lead.id}
        leadId={lead.id}
        disabled={disabled}
        onSavingChange={onNotesSavingChange}
      />
    </div>
  )
}
