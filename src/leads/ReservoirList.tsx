import { etapaClass, formatDate } from './types'
import type { Lead } from './types'

export function ReservoirList({
  leads,
  onOpen,
}: {
  leads: Lead[]
  onOpen: (lead: Lead) => void
}) {
  if (!leads.length)
    return (
      <div className="crm-empty">
        <span aria-hidden="true">↳</span>
        <h3>Reservatório vazio</h3>
        <p>Não há leads aguardando atribuição no momento.</p>
      </div>
    )
  return (
    <div className="reservoir-table-scroll">
      <table className="reservoir-table">
        <caption className="visually-hidden">
          Leads sem responsável, do mais antigo para o mais recente
        </caption>
        <thead>
          <tr>
            <th scope="col">Lead</th>
            <th scope="col">Interesse</th>
            <th scope="col">Origem</th>
            <th scope="col">Etapa</th>
            <th scope="col">Cadastrado em ↑</th>
            <th scope="col">
              <span className="visually-hidden">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <strong>{lead.nome}</strong>
                <span>{lead.telefone}</span>
              </td>
              <td>{lead.interesse}</td>
              <td>{lead.origem}</td>
              <td>
                <span className={`stage-badge ${etapaClass(lead.etapa)}`}>
                  {lead.etapa}
                </span>
              </td>
              <td className="table-date">{formatDate(lead.created_at)}</td>
              <td>
                <button
                  className="text-button"
                  onClick={() => onOpen(lead)}
                  aria-label={`Abrir lead ${lead.nome}`}
                >
                  Ver detalhes <span aria-hidden="true">↗</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
