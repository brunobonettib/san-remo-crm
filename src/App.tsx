import type { ReactNode } from 'react'
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import type { Papel } from './auth/AuthProvider'
import { Brand } from './components/Brand'
import { presenceReturnTo } from './presenca/links'

const LoginPage = lazy(() =>
  import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const GestorPage = lazy(() =>
  import('./pages/GestorPage').then((module) => ({
    default: module.GestorPage,
  })),
)
const CorretorPage = lazy(() =>
  import('./pages/CorretorPage').then((module) => ({
    default: module.CorretorPage,
  })),
)
const PresencaPage = lazy(() =>
  import('./pages/PresencaPage').then((module) => ({
    default: module.PresencaPage,
  })),
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
  const location = useLocation()
  if (auth.isSigningOut || auth.status === 'loading' || auth.status === 'error')
    return <SessionStatus />
  if (auth.status === 'signed-out')
    return (
      <Navigate
        to="/login"
        replace
        state={
          location.pathname === '/presenca'
            ? {
                presenceReturnTo:
                  location.pathname + location.search + location.hash,
              }
            : null
        }
      />
    )
  if (auth.profile.papel !== papel)
    return <Navigate to={`/${auth.profile.papel}`} replace />
  return children
}

function EntryRoute({ login = false }: { login?: boolean }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.isSigningOut || auth.status === 'loading' || auth.status === 'error')
    return <SessionStatus />
  if (auth.status === 'ready')
    return (
      <Navigate
        to={
          (login && presenceReturnTo(location.state)) ||
          `/${auth.profile.papel}`
        }
        replace
      />
    )
  return login ? <LoginPage /> : <Navigate to="/login" replace />
}

function App() {
  return (
    <Suspense fallback={<SessionStatus pending />}>
      <Routes>
        <Route path="/login" element={<EntryRoute login />} />
        <Route
          path="/presenca"
          element={
            <ProtectedRoute papel="corretor">
              <PresencaPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gestor"
          element={
            <ProtectedRoute papel="gestor">
              <GestorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/corretor"
          element={
            <ProtectedRoute papel="corretor">
              <CorretorPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<EntryRoute />} />
      </Routes>
    </Suspense>
  )
}

export default App
