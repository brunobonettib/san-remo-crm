import { supabase } from '../lib/supabase'

export type PresenceQr = {
  token: string
  valido_desde: string
  valido_ate: string
}
export type Presence = {
  corretor_id: string
  posicao: number
  entrada_fila_em: string
  confirmado_em: string
  valido_ate: string
}
export type PresenceEntry = Presence & {
  nome: string
  elegivel: boolean
  consultado_em: string
}

function failure(code: string | undefined, confirming = false) {
  if (code === '42501')
    return new Error(
      'Seu perfil não permite esta operação. Confira a conta utilizada ou contate o administrador.',
    )
  if (confirming && code === '22023')
    return new Error(
      'Este QR Code é inválido ou expirou. Leia o QR vigente e confirme novamente.',
    )
  return new Error(
    confirming
      ? 'Não foi possível confirmar a resposta do servidor. Confira sua conexão e tente novamente com um QR vigente.'
      : 'Não foi possível consultar a presença. Verifique sua conexão e tente novamente.',
  )
}

export async function getPresenceQr(signal: AbortSignal): Promise<PresenceQr> {
  const { data, error } = await supabase
    .rpc('obter_qr_presenca')
    .abortSignal(signal)
    .single<PresenceQr>()
  if (error || !data) throw failure(error?.code)
  return data
}

export async function listPresences(
  signal: AbortSignal,
): Promise<PresenceEntry[]> {
  const entries: PresenceEntry[] = []
  let offset = 0
  while (true) {
    const { data, error, count } = await supabase
      .rpc('listar_presencas', {}, { count: 'exact' })
      .select('*')
      .order('posicao', { ascending: true })
      .range(offset, offset + 499)
      .abortSignal(signal)
      .returns<PresenceEntry[]>()
    if (error || !Array.isArray(data)) throw failure(error?.code)
    entries.push(...data)
    offset += data.length
    if (count !== null ? offset >= count : data.length < 500) break
    if (!data.length) throw failure(undefined)
  }
  return [
    ...new Map(entries.map((entry) => [entry.corretor_id, entry])).values(),
  ].sort((a, b) => a.posicao - b.posicao)
}

export async function confirmPresence(
  token: string,
  signal: AbortSignal,
): Promise<Presence> {
  // Unico parametro permitido. Identidade, horarios e posicao pertencem ao banco.
  const { data, error } = await supabase
    .rpc('confirmar_presenca', { p_token: token })
    .abortSignal(signal)
    .single<Presence>()
  if (error || !data) throw failure(error?.code, true)
  return data
}
