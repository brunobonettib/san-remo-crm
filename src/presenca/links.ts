const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function readPresenceToken(hash: string, search = ''): string | null {
  const params = new URLSearchParams(hash ? hash.slice(1) : search)
  const tokens = params.getAll('token')
  return tokens.length === 1 && UUID.test(tokens[0]) ? tokens[0] : null
}

export function presencePath(token: string) {
  return `/presenca#token=${encodeURIComponent(token)}`
}

export function presenceLink(token: string): string {
  const configured = import.meta.env.VITE_APP_URL?.trim()
  try {
    const url = new URL(configured || window.location.origin)
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      throw new Error()
    return `${url.origin}${presencePath(token)}`
  } catch {
    throw new Error(
      'Configure VITE_APP_URL com a origem pública da aplicação, como https://crm.exemplo.com.',
    )
  }
}

// Aceitar somente o destino interno desta funcionalidade, nunca uma URL externa.
export function presenceReturnTo(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('presenceReturnTo' in state))
    return null
  const target = state.presenceReturnTo
  if (typeof target !== 'string') return null
  try {
    const url = new URL(target, window.location.origin)
    if (url.origin !== window.location.origin || url.pathname !== '/presenca')
      return null
    const token = readPresenceToken(url.hash, url.search)
    return token ? presencePath(token) : '/presenca'
  } catch {
    return null
  }
}
