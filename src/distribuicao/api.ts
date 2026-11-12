import { supabase } from '../lib/supabase'

export type DistributionResult = {
  status: 'distribuido' | 'sem_lead' | 'sem_corretor_elegivel'
  lead_id: string | null
  corretor_id: string | null
  distribuido_em: string | null
}

export type DistributionHistory = {
  lead_id: string
  corretor_id: string
  distribuido_em: string
  lead: { id: string; nome: string } | null
  corretor: { id: string; nome: string } | null
}

const HISTORY_SELECT =
  'lead_id,corretor_id,distribuido_em,lead:leads!lead_distribuicoes_lead_id_fkey(id,nome),corretor:profiles!lead_distribuicoes_corretor_id_fkey(id,nome)'
const PAGE_SIZE = 500

export async function distributeNextLead(): Promise<DistributionResult> {
  // Uma chamada sem parametros: escolha, atribuicao e rotacao sao exclusivas do banco.
  const { data, error } = await supabase
    .rpc('distribuir_proximo_lead')
    .abortSignal(AbortSignal.timeout(20_000))
    .single<DistributionResult>()

  if (error?.code === '42501')
    throw new Error(
      'Seu perfil não permite distribuir leads. Entre novamente ou contate o administrador.',
    )
  if (error?.code === '23505')
    throw new Error(
      'O lead mais antigo já possui uma distribuição no histórico. A operação foi cancelada sem atribuir outro lead.',
    )
  if (error?.code === '40001' || error?.code === '40P01')
    throw new Error(
      'Houve uma disputa de acesso. Atualize o histórico e tente novamente.',
    )
  if (
    error ||
    !data ||
    !['distribuido', 'sem_lead', 'sem_corretor_elegivel'].includes(data.status)
  )
    throw new Error(
      'Não foi possível confirmar o resultado. Confira o histórico e o reservatório antes de tentar novamente.',
    )
  if (
    data.status === 'distribuido' &&
    (!data.lead_id || !data.corretor_id || !data.distribuido_em)
  )
    throw new Error(
      'A resposta da distribuição está incompleta. Confira o histórico antes de tentar novamente.',
    )
  return data
}

export async function listDistributionHistory(
  signal: AbortSignal,
): Promise<DistributionHistory[]> {
  const rows: DistributionHistory[] = []
  let offset = 0
  while (true) {
    const { data, error, count } = await supabase
      .from('lead_distribuicoes')
      .select(HISTORY_SELECT, { count: 'exact' })
      .order('distribuido_em', { ascending: false })
      .order('lead_id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
      .abortSignal(signal)
      .returns<DistributionHistory[]>()
    if (error || !Array.isArray(data))
      throw new Error(
        'Não foi possível carregar o histórico de distribuição. Tente novamente.',
      )
    rows.push(...data)
    offset += data.length
    if (count !== null ? offset >= count : data.length < PAGE_SIZE) break
    if (data.length === 0)
      throw new Error(
        'O histórico retornou dados incompletos. Tente novamente.',
      )
  }
  return [...new Map(rows.map((row) => [row.lead_id, row])).values()].sort(
    (a, b) =>
      Date.parse(b.distribuido_em) - Date.parse(a.distribuido_em) ||
      b.lead_id.localeCompare(a.lead_id),
  )
}
