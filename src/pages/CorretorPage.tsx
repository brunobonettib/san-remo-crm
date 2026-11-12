import { useState } from 'react'
import { Brand } from '../components/Brand'
import { useAuth } from '../auth/AuthProvider'
import { useLeads } from '../leads/useLeads'
import { LeadBoard } from '../leads/LeadBoard'
import { LeadDialog } from '../leads/LeadDialog'
import type { Lead } from '../leads/types'
import '../leads/leads.css'

export function CorretorPage() {
  const { profile, signOut, isSigningOut, logoutError } = useAuth()
  // A mesma consulta do gestor: o banco limita o resultado pela RLS da sessao.
  const { leads, status, error, reload, acceptSaved } = useLeads()
  const [selected, setSelected] = useState<Lead | null>(null)
  const ready = status === 'ready'
  const open = leads.filter(
    (lead) => lead.etapa !== 'Ganho' && lead.etapa !== 'Perdido',
  ).length
  const won = leads.filter((lead) => lead.etapa === 'Ganho').length
  const visits = leads.filter((lead) => lead.etapa === 'Visita agendada').length

  function saved(lead: Lead) {
    acceptSaved(lead)
    setSelected(lead)
  }

  return (
    <div className="crm-shell">
      <header className="workspace-header crm-header">
        <Brand />
        <div className="workspace-actions">
          <span className="role-badge">Corretor</span>
          <span className="crm-user">{profile?.nome}</span>
          <button
            className="secondary-button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
          >
            Sair <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>
      <div className="crm-subnav">
        <div>
          <span className="nav-marker" aria-hidden="true">
            ▦
          </span>{' '}
          Meus leads <span className="subnav-divider">/</span>
          <span>Funil de vendas</span>
        </div>
        <span className="crm-session">
          <span className="status-dot" /> Ambiente do corretor
        </span>
      </div>
      <main className="crm-main">
        <section className="crm-page-heading">
          <div>
            <p className="eyebrow">CADA CONEXÃO, UMA NOVA POSSIBILIDADE</p>
            <h1>
              Seu próximo passo
              <br className="mobile-heading-break" /> faz a diferença
              <span className="accent">.</span>
            </h1>
            <p>
              Olá, {profile?.nome.trim().split(/\s+/)[0]}. Acompanhe seus leads
              e dê continuidade a cada conversa.
            </p>
          </div>
        </section>
        {logoutError && (
          <p className="error-message" role="alert">
            {logoutError}
          </p>
        )}
        <div className="crm-metrics" aria-label="Resumo dos meus leads">
          {[
            {
              label: 'Meus leads',
              value: leads.length,
              note: 'Oportunidades sob seus cuidados',
              symbol: '↗',
            },
            {
              label: 'Em andamento',
              value: open,
              note: 'Conexões em desenvolvimento',
              symbol: '◴',
            },
            {
              label: 'Visitas agendadas',
              value: visits,
              note: 'Próximos encontros',
              symbol: '◇',
            },
            {
              label: 'Negócios ganhos',
              value: won,
              note: 'Suas conquistas',
              symbol: '✓',
            },
          ].map((metric) => (
            <div className="metric-card" key={metric.label}>
              <div>
                <span>{metric.label}</span>
                <span className="metric-symbol" aria-hidden="true">
                  {metric.symbol}
                </span>
              </div>
              <strong>{ready ? metric.value : '—'}</strong>
              <p>{metric.note}</p>
            </div>
          ))}
        </div>
        <section
          className="crm-leads-section"
          aria-labelledby="corretor-leads-title"
        >
          <div className="crm-section-heading">
            <div>
              <h2 id="corretor-leads-title">Meu funil de vendas</h2>
              <p>Suas oportunidades, uma etapa de cada vez.</p>
            </div>
            <button
              className="secondary-button refresh-button"
              disabled={status === 'loading'}
              onClick={() => void reload()}
            >
              <span aria-hidden="true">↻</span> Atualizar
            </button>
          </div>
          {status === 'loading' && (
            <div className="crm-load-state" role="status">
              <span className="spinner" />
              <h3>Carregando seus leads</h3>
              <p>Preparando as oportunidades sob sua responsabilidade.</p>
            </div>
          )}
          {status === 'error' && (
            <div className="crm-load-state">
              <h3>Não foi possível carregar seus leads</h3>
              <p role="alert">{error}</p>
              <button
                className="secondary-button"
                onClick={() => void reload()}
              >
                Tentar novamente
              </button>
            </div>
          )}
          {ready && (
            <>
              {leads.length === 0 && (
                <div className="crm-empty crm-empty-banner">
                  <h3>Nenhum lead atribuído a você</h3>
                  <p>
                    Quando houver uma oportunidade sob sua responsabilidade, ela
                    aparecerá aqui.
                  </p>
                </div>
              )}
              <LeadBoard leads={leads} onOpen={setSelected} />
            </>
          )}
        </section>
        <p className="crm-bottom-note">
          <span className="status-dot" /> Uma boa conversa é o começo de uma
          grande conquista.
        </p>
      </main>
      <footer className="workspace-footer">
        San Remo · Pessoas, conexões e conquistas.
      </footer>
      {selected && (
        <LeadDialog
          key={selected.id}
          lead={selected}
          onClose={() => setSelected(null)}
          onSaved={saved}
        />
      )}
    </div>
  )
}
