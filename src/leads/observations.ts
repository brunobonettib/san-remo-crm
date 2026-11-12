import { supabase } from '../lib/supabase'

export type Observation = {
  id: string
  lead_id: string
  autor_id: string
  texto: string
  created_at: string
  autor: { id: string; nome: string } | null
}

const SELECT =
  'id,lead_id,autor_id,texto,created_at,autor:profiles!lead_observacoes_autor_id_fkey(id,nome)'
const PAGE_SIZE = 500

export async function listObservations(
  leadId: string,
  signal: AbortSignal,
): Promise<Observation[]> {
  const observations: Observation[] = []
  let offset = 0
  while (true) {
    const { data, error, count } = await supabase
      .from('lead_observacoes')
      .select(SELECT, { count: 'exact' })
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1)
      .abortSignal(signal)
      .returns<Observation[]>()
    if (error || !data)
      throw new Error(
        'Não foi possível carregar as observações. Tente novamente.',
      )
    observations.push(...data)
    offset += data.length
    if (count !== null ? offset >= count : data.length < PAGE_SIZE) break
    if (!data.length)
      throw new Error(
        'Não foi possível carregar todo o histórico. Tente novamente.',
      )
  }
  return [...new Map(observations.map((item) => [item.id, item])).values()]
}

export async function createObservation(
  leadId: string,
  text: string,
): Promise<Observation> {
  const texto = text.trim()
  if (!texto) throw new Error('Escreva uma observação antes de registrar.')
  // Autor e data pertencem ao banco. Nao receber esses valores do formulario.
  const { data, error } = await supabase
    .from('lead_observacoes')
    .insert({ lead_id: leadId, texto })
    .select(SELECT)
    .abortSignal(AbortSignal.timeout(20_000))
    .single<Observation>()
  if (error || !data)
    throw new Error(
      'Não foi possível confirmar o registro. Consulte o histórico antes de tentar novamente.',
    )
  return data
}
