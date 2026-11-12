import { useState } from 'react'
import { Brand } from '../components/Brand'
import { useAuth } from '../auth/AuthProvider'
import { useLeads } from '../leads/useLeads'
import { LeadBoard } from '../leads/LeadBoard'
import { ReservoirList } from '../leads/ReservoirList'
import { LeadDialog } from '../leads/LeadDialog'
import type { Lead } from '../leads/types'
import { PresencaGestor } from '../presenca/PresencaGestor'
import { DistributionPanel } from '../distribuicao/DistributionPanel'
import '../leads/leads.css'

export function GestorPage() {
  const { profile, signOut, isSigningOut, logoutError } = useAuth()
  const { leads, status, error, reload, acceptSaved } = useLeads()
  const [view, setView] = useState<'funnel' | 'reservoir'>('funnel')
  const [dialog, setDialog] = useState<{ lead: Lead | null } | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [presenceRefresh, setPresenceRefresh] = useState(0)
  const reservoir = leads.filter((lead) => lead.responsavel_id === null)
  const won = leads.filter((lead) => lead.etapa === 'Ganho').length
  const open = leads.filter(
    (lead) => lead.etapa !== 'Ganho' && lead.etapa !== 'Perdido',
  ).length
  const ready = status === 'ready'
  const firstName = profile?.nome.trim().split(/\s+/)[0]

  function saved(lead: Lead, created: boolean) {
    acceptSaved(lead)
    setDialog(null)
    setSuccess(
      created
        ? 'Lead cadastrado com sucesso e adicionado ao reservatório.'
        : 'Dados do lead atualizados com sucesso.',
    )
  }
  function refresh() {
    setSuccess(null)
    void reload()
  }

  return (
    <div className="crm-shell">
      <header className="workspace-header crm-header">
        <Brand />
        <div className="workspace-actions">
          <span className="role-badge">Gestor</span>
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
          Gestão de leads <span className="subnav-divider">/</span>
          <span>Visão geral</span>
        </div>
        <span className="crm-session">
          <span className="status-dot" /> Ambiente de gestão
        </span>
      </div>
      <main className="crm-main">
        <section className="crm-page-heading">
          <div>
            <p className="eyebrow">RELACIONAMENTOS QUE GERAM CONQUISTAS</p>
            <h1>
              Seu próximo negócio
              <br className="mobile-heading-break" /> começa aqui
              <span className="accent">.</span>
            </h1>
            <p>
              Olá, {firstName}. Acompanhe as oportunidades e mantenha cada
              conexão por perto.
            </p>
          </div>
          <button
            className="primary-button new-lead-button"
            disabled={!ready}
            onClick={() => {
              setSuccess(null)
              setDialog({ lead: null })
            }}
          >
            <span aria-hidden="true">+</span> Novo lead
          </button>
        </section>
        {logoutError && (
          <p className="error-message" role="alert">
            {logoutError}
          </p>
        )}
        {success && (
          <div className="crm-success" role="status">
            <span aria-hidden="true">✓</span>
            {success}
            <button
              aria-label="Dispensar mensagem"
              onClick={() => setSuccess(null)}
            >
              ×
            </button>
          </div>
        )}
        <div className="crm-metrics" aria-label="Resumo dos leads">
          {[
            {
              label: 'Total de leads',
              value: leads.length,
              note: 'Todas as oportunidades',
              symbol: '↗',
            },
            {
              label: 'Em andamento',
              value: open,
              note: 'Conexões em desenvolvimento',
              symbol: '◴',
            },
            {
              label: 'No reservatório',
              value: reservoir.length,
              note: 'Aguardando atribuição',
              symbol: '↳',
            },
            {
              label: 'Negócios ganhos',
              value: won,
              note: 'Conquistas da equipe',
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
        <DistributionPanel
          onDistributed={() => {
            void reload()
            setPresenceRefresh((current) => current + 1)
          }}
        />
        <section
          className="crm-leads-section"
          aria-labelledby="leads-section-title"
        >
          <div className="crm-section-heading">
            <div>
              <h2 id="leads-section-title">Oportunidades</h2>
              <p>Uma visão clara de cada etapa da jornada.</p>
            </div>
            <button
              className="secondary-button refresh-button"
              disabled={status === 'loading'}
              onClick={refresh}
            >
              <span aria-hidden="true">↻</span> Atualizar
            </button>
          </div>
          <div className="crm-view-toolbar">
            <div
              className="crm-view-options"
              role="group"
              aria-label="Visualização dos leads"
            >
              <button
                className={view === 'funnel' ? 'active' : ''}
                aria-pressed={view === 'funnel'}
                onClick={() => setView('funnel')}
              >
                Funil de vendas <span>{ready ? leads.length : '—'}</span>
              </button>
              <button
                className={view === 'reservoir' ? 'active' : ''}
                aria-pressed={view === 'reservoir'}
                onClick={() => setView('reservoir')}
              >
                Reservatório <span>{ready ? reservoir.length : '—'}</span>
              </button>
            </div>
            <span className="crm-order-note">
              {view === 'reservoir'
                ? 'Mais antigos primeiro'
                : '6 etapas · Uma jornada'}
            </span>
          </div>
          {status === 'loading' && (
            <div className="crm-load-state" role="status">
              <span className="spinner" />
              <h3>Carregando oportunidades</h3>
              <p>Buscando os leads da sua equipe.</p>
            </div>
          )}
          {status === 'error' && (
            <div className="crm-load-state">
              <span className="crm-error-symbol" aria-hidden="true">
                !
              </span>
              <h3>Não foi possível atualizar a lista</h3>
              <p role="alert">{error}</p>
              <button className="secondary-button" onClick={refresh}>
                Tentar novamente
              </button>
            </div>
          )}
          {ready && view === 'funnel' && (
            <>
              {leads.length === 0 && (
                <div className="crm-empty crm-empty-banner">
                  <h3>Seu funil começa com uma nova conexão.</h3>
                  <p>
                    Nenhum lead cadastrado. Use “Novo lead” para adicionar a
                    primeira oportunidade ao reservatório.
                  </p>
                </div>
              )}
              <LeadBoard leads={leads} onOpen={(lead) => setDialog({ lead })} />
            </>
          )}
          {ready && view === 'reservoir' && (
            <ReservoirList
              leads={reservoir}
              onOpen={(lead) => setDialog({ lead })}
            />
          )}
        </section>
        <PresencaGestor key={presenceRefresh} />
        <p className="crm-bottom-note">
          <span className="status-dot" /> Cada lead representa uma nova
          possibilidade.
        </p>
      </main>
      <footer className="workspace-footer">
        San Remo · Pessoas, conexões e conquistas.
      </footer>
      {dialog && (
        <LeadDialog
          key={dialog.lead?.id || 'new'}
          lead={dialog.lead}
          onClose={() => setDialog(null)}
          onSaved={saved}
        />
      )}
    </div>
  )
}
