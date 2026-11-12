import { ETAPAS, etapaClass, formatDate } from './types'
import type { Lead } from './types'

export function LeadBoard({
  leads,
  onOpen,
}: {
  leads: Lead[]
  onOpen: (lead: Lead) => void
}) {
  return (
    <>
      <p className="lead-board-hint" id="lead-board-hint">
        Deslize para o lado para ver as seis etapas do funil{' '}
        <span aria-hidden="true">→</span>
      </p>
      <div
        className="lead-board"
        role="region"
        tabIndex={0}
        aria-label="Funil de vendas"
        aria-describedby="lead-board-hint"
      >
        {ETAPAS.map((etapa) => {
          const items = leads.filter((lead) => lead.etapa === etapa)
          return (
            <section
              className={`funnel-column ${etapaClass(etapa)}`}
              key={etapa}
              aria-label={etapa}
            >
              <header className="column-heading">
                <h3>
                  <span className="stage-dot" />
                  {etapa}
                </h3>
                <span className="column-count">{items.length}</span>
              </header>
              <div className="column-cards">
                {items.map((lead) => (
                  <button
                    className="lead-card"
                    key={lead.id}
                    onClick={() => onOpen(lead)}
                    aria-label={`Abrir lead ${lead.nome}`}
                  >
                    <span className="card-origin">{lead.origem}</span>
                    <h4>{lead.nome}</h4>
                    <p className="card-interest">{lead.interesse}</p>
                    <p className="card-phone">{lead.telefone}</p>
                    <div className="card-owner">
                      <span
                        className={
                          lead.responsavel_id
                            ? 'owner-avatar'
                            : 'reservoir-avatar'
                        }
                        aria-hidden="true"
                      >
                        {lead.responsavel_id
                          ? lead.responsavel?.nome.charAt(0) || '·'
                          : '↳'}
                      </span>
                      <span>
                        {lead.responsavel_id
                          ? lead.responsavel?.nome || 'Perfil indisponível'
                          : 'No reservatório'}
                      </span>
                    </div>
                    <span className="card-date">
                      {formatDate(lead.created_at)}
                    </span>
                  </button>
                ))}
                {items.length === 0 && (
                  <p className="column-empty">Nenhum lead nesta etapa</p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}
