import { useState } from 'react'
import type { FormEvent } from 'react'
import { ETAPAS } from './types'
import type { Lead, LeadValues } from './types'

export function LeadForm({
  lead,
  saving,
  error,
  onSave,
  onCancel,
}: {
  lead: Lead | null
  saving: boolean
  error: string | null
  onSave: (values: LeadValues) => void
  onCancel: () => void
}) {
  const [values, setValues] = useState<LeadValues>({
    nome: lead?.nome ?? '',
    telefone: lead?.telefone ?? '',
    origem: lead?.origem ?? '',
    interesse: lead?.interesse ?? '',
    email: lead?.email ?? '',
    etapa: lead?.etapa ?? 'Novo',
  })
  const [validationError, setValidationError] = useState<string | null>(null)
  function field<K extends keyof LeadValues>(name: K, value: LeadValues[K]) {
    setValues((current) => ({ ...current, [name]: value }))
    setValidationError(null)
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    if (
      ['nome', 'telefone', 'origem', 'interesse'].some(
        (key) => !values[key as keyof LeadValues].trim(),
      )
    ) {
      setValidationError(
        'Preencha todos os campos obrigatórios com um valor válido.',
      )
      return
    }
    onSave(values)
  }

  return (
    <form className="lead-form" onSubmit={submit} aria-busy={saving}>
      <p className="form-description">
        {lead
          ? 'Atualize as informações deste contato.'
          : 'Preencha os dados para iniciar uma nova oportunidade.'}{' '}
        <span>Campos com * são obrigatórios.</span>
      </p>
      <fieldset disabled={saving} className="lead-form-fields">
        <div className="field form-full">
          <label htmlFor="lead-nome">Nome completo *</label>
          <input
            autoFocus
            id="lead-nome"
            name="nome"
            required
            autoComplete="name"
            value={values.nome}
            onChange={(event) => field('nome', event.target.value)}
            placeholder="Nome do contato"
          />
        </div>
        <div className="field">
          <label htmlFor="lead-telefone">Telefone *</label>
          <input
            id="lead-telefone"
            name="telefone"
            type="tel"
            required
            autoComplete="tel"
            value={values.telefone}
            onChange={(event) => field('telefone', event.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div className="field">
          <label htmlFor="lead-email">
            E-mail <span>(opcional)</span>
          </label>
          <input
            id="lead-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(event) => field('email', event.target.value)}
            placeholder="contato@exemplo.com"
          />
        </div>
        <div className="field">
          <label htmlFor="lead-origem">Origem *</label>
          <input
            id="lead-origem"
            name="origem"
            required
            value={values.origem}
            onChange={(event) => field('origem', event.target.value)}
            placeholder="Ex.: indicação, site, Instagram"
          />
        </div>
        <div className="field">
          <label htmlFor="lead-etapa">Etapa *</label>
          <select
            id="lead-etapa"
            name="etapa"
            required
            value={values.etapa}
            onChange={(event) =>
              field('etapa', event.target.value as LeadValues['etapa'])
            }
          >
            {ETAPAS.map((etapa) => (
              <option key={etapa}>{etapa}</option>
            ))}
          </select>
        </div>
        <div className="field form-full">
          <label htmlFor="lead-interesse">Interesse *</label>
          <input
            id="lead-interesse"
            name="interesse"
            required
            value={values.interesse}
            onChange={(event) => field('interesse', event.target.value)}
            placeholder="Ex.: apartamento de 2 quartos na região central"
          />
        </div>
      </fieldset>
      <p className="assignment-note">
        <span aria-hidden="true">↳</span>{' '}
        {lead
          ? 'A edição dos dados preserva o responsável atual.'
          : 'Este lead será adicionado ao reservatório, sem responsável.'}
      </p>
      {(validationError || error) && (
        <p className="error-message" role="alert">
          {validationError || error}
        </p>
      )}
      <div className="lead-dialog-actions">
        <button
          className="secondary-button"
          type="button"
          disabled={saving}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button className="primary-button" type="submit" disabled={saving}>
          {saving ? (
            <>
              <span className="spinner" /> Salvando...
            </>
          ) : lead ? (
            'Salvar alterações'
          ) : (
            'Cadastrar lead'
          )}
        </button>
      </div>
    </form>
  )
}
