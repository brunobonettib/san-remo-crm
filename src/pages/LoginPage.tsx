import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { Brand } from '../components/Brand'
import { useAuth } from '../auth/AuthProvider'

export function LoginPage() {
  const { logoutError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (authError) {
        setError(
          authError.code === 'invalid_credentials'
            ? 'E-mail ou senha incorretos. Confira seus dados e tente novamente.'
            : authError.code === 'email_not_confirmed'
              ? 'Seu e-mail ainda não foi confirmado. Entre em contato com o administrador.'
              : 'Não foi possível entrar. Confira seus dados e sua conexão e tente novamente.',
        )
      }
    } catch {
      setError(
        'Não foi possível conectar. Verifique sua conexão e tente novamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-layout">
      <section className="login-panel">
        <header className="login-header">
          <Brand />
          <span className="restricted-label">
            <span /> Acesso exclusivo
          </span>
        </header>
        <div className="login-content">
          <p className="eyebrow">SEU PRÓXIMO CAPÍTULO COMEÇA AQUI</p>
          <h1>
            Bom ter você
            <br />
            de volta<span className="accent">.</span>
          </h1>
          <p className="login-description">
            Entre na sua conta para acessar o ambiente
            <br className="desktop-break" /> de trabalho da San Remo.
          </p>
          <form
            onSubmit={handleSubmit}
            className="login-form"
            aria-busy={isSubmitting}
          >
            {logoutError && (
              <p className="error-message" role="alert">
                {logoutError}
              </p>
            )}
            <div className="field">
              <label htmlFor="email">E-mail profissional</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="voce@sanremo.com.br"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <div className="password-field">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Digite sua senha"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    {showPassword && (
                      <path
                        d="m4 3 16 18"
                        stroke="currentColor"
                        strokeWidth="1.6"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="primary-button login-submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" /> Entrando...
                </>
              ) : (
                <>
                  Entrar na plataforma <span aria-hidden="true">↗</span>
                </>
              )}
            </button>
          </form>
          <p className="access-help">
            Precisa de acesso ou esqueceu sua senha?
            <br />
            <span>Entre em contato com o administrador.</span>
          </p>
          <div className="security-note">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="m10 2 6 2.5v5c0 4-6 7-6 7s-6-3-6-7v-5L10 2Z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path d="m7 9 2 2 4-4" stroke="currentColor" strokeWidth="1.3" />
            </svg>{' '}
            Ambiente seguro. Acesso individual e protegido.
          </div>
        </div>
        <footer className="login-footer">
          <span>© {new Date().getFullYear()} San Remo</span>
          <span>Feito para conectar oportunidades.</span>
        </footer>
      </section>
      <aside
        className="login-showcase"
        aria-label="San Remo, pessoas e oportunidades"
      >
        <div className="showcase-top">
          <span className="showcase-tag">PESSOAS. CONEXÕES. CONQUISTAS.</span>
          <span className="showcase-number">01 / SAN REMO</span>
        </div>
        <div className="architecture" aria-hidden="true">
          <div className="architecture-orbit" />
          <svg viewBox="0 0 600 500" fill="none">
            <defs>
              <linearGradient
                id="facade"
                x1="150"
                y1="60"
                x2="430"
                y2="480"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#c9b697" />
                <stop offset="1" stopColor="#8a806d" />
              </linearGradient>
              <linearGradient
                id="glass"
                x1="200"
                y1="90"
                x2="390"
                y2="490"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#577078" />
                <stop offset="1" stopColor="#162f36" />
              </linearGradient>
              <pattern
                id="windows"
                width="39"
                height="47"
                patternUnits="userSpaceOnUse"
              >
                <rect width="39" height="47" fill="url(#glass)" />
                <path d="M0 0h39v47" stroke="#b7a486" strokeWidth="5" />
                <path d="M0 43h39" stroke="#142b30" strokeWidth="4" />
              </pattern>
            </defs>
            <path
              d="m69 450 380-66 110 57-373 59Z"
              fill="#0b2025"
              opacity=".4"
            />
            <path
              d="M142 125 336 48l119 63v333l-195 40-118-63Z"
              fill="url(#facade)"
            />
            <path d="m336 48 119 63v333l-119-54Z" fill="#686c61" />
            <path d="m157 141 163-63v315l-163 63Z" fill="url(#windows)" />
            <path d="m349 81 91 48v289l-91-41Z" fill="url(#glass)" />
            <path
              d="m349 128 91 46m-91 1 91 45m-91 2 91 44m-91 3 91 42m-91 5 91 41m-91 6 91 42M378 96v294m30-278v291"
              stroke="#9b927c"
              strokeWidth="5"
            />
            <path
              d="M142 125 336 48l119 63-17 8-103-53-178 70Z"
              fill="#e0ceb0"
            />
            <path
              d="m142 185 194-75m-194 134 194-74m-194 134 194-75m-194 134 194-74m-194 134 194-75"
              stroke="#cfbda0"
              strokeWidth="8"
            />
            <path
              d="m142 193 194-75m-194 134 194-74m-194 134 194-75m-194 134 194-74m-194 134 194-75"
              stroke="#101f22"
              strokeOpacity=".4"
              strokeWidth="4"
            />
            <path
              d="M142 125v332m46-350v333m49-351v333m49-352v333M336 48v391"
              stroke="#c1ac8b"
              strokeWidth="7"
            />
            <path d="m115 457 223-48 137 54-221 37Z" fill="#ad9c81" />
            <path d="m115 457 139 36v7l-139-36Z" fill="#776e5d" />
            <path
              d="M82 464V344m0 53-25-26m25 49 24-23"
              stroke="#627b64"
              strokeWidth="5"
            />
            <ellipse cx="80" cy="355" rx="27" ry="45" fill="#354f43" />
            <ellipse cx="91" cy="345" rx="19" ry="33" fill="#506851" />
          </svg>
          <span className="architecture-caption">
            ESPAÇOS QUE INSPIRAM NOVAS HISTÓRIAS
          </span>
        </div>
        <div className="showcase-copy">
          <span className="showcase-line" />
          <h2>
            Grandes conquistas
            <br />
            começam com uma
            <br />
            <em>boa conexão.</em>
          </h2>
          <p>
            Um lugar para aproximar pessoas
            <br />e construir novas possibilidades.
          </p>
        </div>
        <div className="showcase-bottom">
          <span>SAN REMO · CRM IMOBILIÁRIO</span>
          <span className="showcase-spark" aria-hidden="true">
            ✳
          </span>
        </div>
      </aside>
    </main>
  )
}
