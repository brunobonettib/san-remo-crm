import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type Papel = 'gestor' | 'corretor'
export type Profile = { id: string; nome: string; papel: Papel }

type AuthSnapshot = {
  session: Session | null
  initialized: boolean
  error: string | null
}
type AuthState =
  | { status: 'loading'; profile: null; error: null }
  | { status: 'signed-out'; profile: null; error: null }
  | { status: 'ready'; profile: Profile; error: null }
  | { status: 'error'; profile: null; error: string }
type AuthContextValue = AuthState & {
  signOut: () => Promise<void>
  isSigningOut: boolean
  logoutError: string | null
  retry: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)
const REQUEST_TIMEOUT = 15_000

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthSnapshot>({
    session: null,
    initialized: false,
    error: null,
  })
  const [profileResult, setProfileResult] = useState<{
    source: AuthSnapshot
    profile: Profile | null
    error: string | null
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    let receivedEvent = false
    const sessionError =
      'Não foi possível recuperar sua sessão. Tente novamente.'

    // Apenas atualizar estado aqui; consultas Supabase ficam fora do callback.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      receivedEvent = true
      setLogoutError(null)
      setAuth({ session, initialized: true, error: null })
    })

    const timeout = window.setTimeout(() => {
      if (active && !receivedEvent) {
        setAuth({ session: null, initialized: true, error: sessionError })
      }
    }, REQUEST_TIMEOUT)

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        // Eventos recentes prevalecem sobre uma leitura inicial atrasada.
        if (!active || receivedEvent) return
        window.clearTimeout(timeout)
        setAuth({
          session: error ? null : data.session,
          initialized: true,
          error: error ? sessionError : null,
        })
      })
      .catch(() => {
        if (!active || receivedEvent) return
        window.clearTimeout(timeout)
        setAuth({ session: null, initialized: true, error: sessionError })
      })

    return () => {
      active = false
      window.clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [attempt])

  useEffect(() => {
    if (!auth.initialized || auth.error || !auth.session) return
    const { user } = auth.session
    let active = true
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    async function loadProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, papel')
          .eq('id', user.id)
          .abortSignal(controller.signal)
          .maybeSingle()

        if (!active) return
        let profile: Profile | null = null
        let message: string | null = null
        if (error) {
          message =
            'Não foi possível consultar seu perfil. Verifique sua conexão e tente novamente.'
        } else if (!data) {
          message =
            'Seu usuário ainda não tem um perfil de acesso. Entre em contato com o administrador.'
        } else if (
          data.id !== user.id ||
          typeof data.nome !== 'string' ||
          !data.nome.trim() ||
          (data.papel !== 'gestor' && data.papel !== 'corretor')
        ) {
          message =
            'Seu perfil de acesso é inválido. Entre em contato com o administrador.'
        } else {
          profile = { id: data.id, nome: data.nome, papel: data.papel }
        }
        setProfileResult({ source: auth, profile, error: message })
      } catch {
        if (active)
          setProfileResult({
            source: auth,
            profile: null,
            error: 'Não foi possível consultar seu perfil. Tente novamente.',
          })
      } finally {
        window.clearTimeout(timeout)
      }
    }

    void loadProfile()
    return () => {
      active = false
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [auth])

  async function signOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    setLogoutError(null)
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) throw error
      setProfileResult(null)
      setAuth({ session: null, initialized: true, error: null })
    } catch {
      setLogoutError(
        'Não foi possível confirmar a saída no servidor. Verifique sua conexão.',
      )
    } finally {
      setIsSigningOut(false)
    }
  }

  function retry() {
    setProfileResult(null)
    setAuth((current) => ({ ...current, initialized: false, error: null }))
    setAttempt((current) => current + 1)
  }

  let state: AuthState
  if (!auth.initialized) {
    state = { status: 'loading', profile: null, error: null }
  } else if (auth.error) {
    state = { status: 'error', profile: null, error: auth.error }
  } else if (!auth.session) {
    state = { status: 'signed-out', profile: null, error: null }
  } else if (!profileResult || profileResult.source !== auth) {
    // Um resultado so vale para a sessao/evento que iniciou sua consulta.
    state = { status: 'loading', profile: null, error: null }
  } else if (profileResult.error || !profileResult.profile) {
    state = {
      status: 'error',
      profile: null,
      error: profileResult.error ?? 'Acesso não autorizado.',
    }
  } else {
    state = { status: 'ready', profile: profileResult.profile, error: null }
  }

  return (
    <AuthContext.Provider
      value={{ ...state, signOut, isSigningOut, logoutError, retry }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context)
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.')
  return context
}
