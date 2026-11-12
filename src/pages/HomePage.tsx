import { Brand } from '../components/Brand'
import { useAuth } from '../auth/AuthProvider'
import type { Papel } from '../auth/AuthProvider'

export function HomePage({ papel }: { papel: Papel }) {
  const { profile, signOut, logoutError, isSigningOut } = useAuth()
  const isGestor = papel === 'gestor'

  return (
    <div className="workspace">
      <header className="workspace-header">
        <Brand />
        <div className="workspace-actions">
          <span className="role-badge">{isGestor ? 'Gestor' : 'Corretor'}</span>
          <button
            className="secondary-button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
          >
            Sair <span aria-hidden="true">↗</span>
          </button>
        </div>
      </header>
      <main className="workspace-main">
        <p className="eyebrow">
          {isGestor ? 'ÁREA DO GESTOR' : 'ÁREA DO CORRETOR'}
        </p>
        <h1>
          Olá, {profile?.nome}
          <span className="accent">.</span>
        </h1>
        <p className="workspace-intro">
          {isGestor
            ? 'Bem-vindo ao seu ambiente de gestão na San Remo.'
            : 'Bem-vindo ao seu espaço de trabalho na San Remo.'}
        </p>
        {logoutError && (
          <p className="error-message" role="alert">
            {logoutError}
          </p>
        )}
        <section className="welcome-panel" aria-labelledby="welcome-title">
          <div className="welcome-icon" aria-hidden="true">
            ↗
          </div>
          <div>
            <span className="small-label">CONEXÃO ESTABELECIDA</span>
            <h2 id="welcome-title">Seu espaço está pronto.</h2>
            <p>
              {isGestor
                ? 'Você está na página inicial exclusiva de gestores.'
                : 'Você está na página inicial exclusiva de corretores.'}{' '}
              As ferramentas de trabalho estarão disponíveis nas próximas
              etapas.
            </p>
          </div>
        </section>
        <div className="workspace-footnote">
          <span className="status-dot" /> Sessão autenticada{' '}
          <span aria-hidden="true">·</span> Acesso{' '}
          {isGestor ? 'de gestor' : 'de corretor'}
        </div>
      </main>
      <footer className="workspace-footer">
        San Remo · Pessoas, conexões e conquistas.
      </footer>
    </div>
  )
}
