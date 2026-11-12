import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import type { Papel } from './auth/AuthProvider'
import { Brand } from './components/Brand'
import { HomePage } from './pages/HomePage'

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)

function SessionStatus({ pending = false }: { pending?: boolean }) {
  const { status, error, retry, signOut, isSigningOut, logoutError } = useAuth()
  const loading = pending || status === 'loading' || isSigningOut
  return (
    <main className="session-screen">
      <Brand />
      <section className="session-card" aria-busy={loading}>
        {loading ? (
          <>
            <span className="spinner session-spinner" />
            <h1>
              {isSigningOut ? 'Encerrando sessão' : 'Verificando seu acesso'}
            </h1>
            <p role="status">
              Só um instante, estamos preparando seu ambiente.
            </p>
          </>
        ) : (
          <>
            <span className="session-error-icon" aria-hidden="true">
              !
            </span>
            <h1>Acesso indisponível</h1>
            <p role="alert">{error}</p>
            <div className="session-actions">
              <button className="primary-button" onClick={retry}>
                Tentar novamente
              </button>
              <button
                className="secondary-button"
                onClick={() => void signOut()}
              >
                Sair da conta
              </button>
            </div>
            {logoutError && (
              <p className="error-message" role="alert">
                {logoutError}
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}

function ProtectedRoute({
  papel,
  children,
}: {
  papel: Papel
  children: ReactNode
}) {
  const auth = useAuth()
  if (auth.isSigningOut || auth.status === 'loading' || auth.status === 'error')
    return <SessionStatus />
  if (auth.status === 'signed-out') return <Navigate to="/login" replace />
  if (auth.profile.papel !== papel)
    return <Navigate to={`/${auth.profile.papel}`} replace />
  return children
}

function EntryRoute({ login = false }: { login?: boolean }) {
  const auth = useAuth()
  if (auth.isSigningOut || auth.status === 'loading' || auth.status === 'error')
    return <SessionStatus />
  if (auth.status === 'ready')
    return <Navigate to={`/${auth.profile.papel}`} replace />
  return login ? <LoginPage /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Suspense fallback={<SessionStatus pending />}>
      <Routes>
        <Route path="/login" element={<EntryRoute login />} />
        <Route
          path="/gestor"
          element={
            <ProtectedRoute papel="gestor">
              <HomePage papel="gestor" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/corretor"
          element={
            <ProtectedRoute papel="corretor">
              <HomePage papel="corretor" />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<EntryRoute />} />
      </Routes>
    </Suspense>
  )
}

export default App
