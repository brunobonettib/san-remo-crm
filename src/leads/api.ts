import { supabase } from '../lib/supabase'
import type { Etapa, Lead, LeadValues } from './types'
import { compareLeads } from './types'

const LEAD_SELECT =
  'id,nome,telefone,origem,interesse,email,etapa,responsavel_id,created_at,updated_at,responsavel:profiles!leads_responsavel_id_fkey(id,nome)'
const PAGE_SIZE = 500

function failure(error: { code?: string } | null, action: 'load' | 'save') {
  if (error?.code === '42501')
    return new Error(
      'Seu acesso não permite esta operação. Entre novamente ou contate o administrador.',
    )
  return new Error(
    action === 'load'
      ? 'Não foi possível carregar os leads. Verifique sua conexão e tente novamente.'
      : 'Não foi possível confirmar o salvamento. Atualize a lista antes de tentar novamente.',
  )
}

export async function listLeads(signal: AbortSignal): Promise<Lead[]> {
  const leads: Lead[] = []
  let offset = 0
  while (true) {
    const { data, error, count } = await supabase
      .from('leads')
      .select(LEAD_SELECT, { count: 'exact' })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
      .abortSignal(signal)
      .returns<Lead[]>()
    if (error || !data) throw failure(error, 'load')
    leads.push(...data)
    offset += data.length
    if (count !== null ? offset >= count : data.length < PAGE_SIZE) break
    if (data.length === 0) throw failure(null, 'load')
  }
  return [...new Map(leads.map((lead) => [lead.id, lead])).values()].sort(
    compareLeads,
  )
}

function payload(values: LeadValues) {
  // Lista explicita de campos: nunca enviar responsavel_id, ids ou timestamps.
  return {
    nome: values.nome.trim(),
    telefone: values.telefone.trim(),
    origem: values.origem.trim(),
    interesse: values.interesse.trim(),
    email: values.email.trim() || null,
    etapa: values.etapa,
  }
}

export async function createLead(values: LeadValues): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert(payload(values))
    .select(LEAD_SELECT)
    .abortSignal(AbortSignal.timeout(20_000))
    .single<Lead>()
  if (error || !data) throw failure(error, 'save')
  return data
}

export async function updateLead(
  id: string,
  values: LeadValues,
): Promise<Lead> {
  const fields = payload(values)
  const { data, error } = await supabase
    .rpc('atualizar_lead', {
      p_id: id,
      p_nome: fields.nome,
      p_telefone: fields.telefone,
      p_origem: fields.origem,
      p_interesse: fields.interesse,
      p_email: fields.email,
      p_etapa: fields.etapa,
    })
    .select(LEAD_SELECT)
    .abortSignal(AbortSignal.timeout(20_000))
    .single<Lead>()
  if (error || !data) throw failure(error, 'save')
  return data
}

export async function updateLeadStage(id: string, etapa: Etapa): Promise<Lead> {
  // A permissao por coluna permite ao corretor enviar SOMENTE etapa.
  // A RLS valida a responsabilidade atual; nao usar a RPC administrativa.
  const { data, error } = await supabase
    .from('leads')
    .update({ etapa })
    .eq('id', id)
    .select(LEAD_SELECT)
    .abortSignal(AbortSignal.timeout(20_000))
    .single<Lead>()
  if (error || !data) throw failure(error, 'save')
  return data
}
