export const ETAPAS = [
  'Novo',
  'Em contato',
  'Visita agendada',
  'Proposta',
  'Ganho',
  'Perdido',
] as const
export type Etapa = (typeof ETAPAS)[number]

export type Lead = {
  id: string
  nome: string
  telefone: string
  origem: string
  interesse: string
  email: string | null
  etapa: Etapa
  responsavel_id: string | null
  created_at: string
  updated_at: string
  responsavel: { id: string; nome: string } | null
}

export type LeadValues = Pick<
  Lead,
  'nome' | 'telefone' | 'origem' | 'interesse' | 'etapa'
> & { email: string }

export function compareLeads(a: Lead, b: Lead) {
  return (
    Date.parse(a.created_at) - Date.parse(b.created_at) ||
    a.id.localeCompare(b.id)
  )
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function etapaClass(etapa: Etapa) {
  return `stage-${ETAPAS.indexOf(etapa)}`
}
