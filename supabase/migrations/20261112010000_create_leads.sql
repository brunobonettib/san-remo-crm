-- Depende de 20261112000000_create_profiles.sql.
-- Aplicar uma unica vez no SQL Editor do Supabase, como postgres.
-- Manter private fora dos schemas expostos pela Data API.
-- Nao cria distribuicao automatica nem modifica profiles ou suas politicas.
begin;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) > 0),
  telefone text not null check (length(btrim(telefone)) > 0),
  origem text not null check (length(btrim(origem)) > 0),
  interesse text not null check (length(btrim(interesse)) > 0),
  email text check (email is null or length(btrim(email)) > 0),
  etapa text not null default 'Novo'
    check (etapa in ('Novo', 'Em contato', 'Visita agendada', 'Proposta', 'Ganho', 'Perdido')),
  responsavel_id uuid default null references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Novos leads entram no reservatorio; excluir um perfil devolve seus leads a ele.
comment on column public.leads.responsavel_id is
  'NULL = reservatorio. Atribuicao futura por round-robin transacional com historico.';

create table public.lead_observacoes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  autor_id uuid not null default auth.uid()
    references public.profiles (id) on delete restrict,
  texto text not null check (length(btrim(texto)) > 0),
  created_at timestamptz not null default now()
);

-- Autoria historica preservada: um perfil com observacoes nao pode ser excluido.
-- Observacoes sao imutaveis via Data API, inclusive para gestores.
alter table public.leads owner to postgres;
alter table public.lead_observacoes owner to postgres;
alter table public.leads enable row level security;
alter table public.lead_observacoes enable row level security;

-- Retirar inclusive privilegios que defaults do projeto possam ter concedido.
revoke all on table public.leads from public, anon, authenticated, service_role;
revoke all on table public.lead_observacoes from public, anon, authenticated, service_role;
grant usage on schema public to authenticated;
grant select on table public.leads, public.lead_observacoes to authenticated;

-- INSERT limitado aos campos de negocio; ids e datas sao gerados pelo banco.
-- A politica RLS de INSERT restringe o cadastro de leads a gestores.
-- O cliente nao pode informar responsavel_id, nem mesmo com valor NULL.
grant insert (nome, telefone, origem, interesse, email, etapa)
  on public.leads to authenticated;

-- Gestor e corretor usam o MESMO papel PostgreSQL: authenticated.
-- Nao conceder UPDATE da tabela nem das demais colunas a esse papel.
-- Gestores editam os demais dados pela RPC abaixo, sem alterar o responsavel.
grant update (etapa) on public.leads to authenticated;
grant insert (lead_id, texto) on public.lead_observacoes to authenticated;

create policy leads_select_gestor
  on public.leads for select to authenticated
  using ((select private.is_gestor()));

create policy leads_select_corretor
  on public.leads for select to authenticated
  using (
    responsavel_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid()) and profile.papel = 'corretor'
    )
  );

create policy leads_insert_gestor
  on public.leads for insert to authenticated
  with check ((select private.is_gestor()));

create policy leads_update_gestor
  on public.leads for update to authenticated
  using ((select private.is_gestor()))
  with check ((select private.is_gestor()));

create policy leads_update_corretor
  on public.leads for update to authenticated
  using (
    responsavel_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid()) and profile.papel = 'corretor'
    )
  )
  with check (
    responsavel_id = (select auth.uid())
    and exists (
      select 1 from public.profiles as profile
      where profile.id = (select auth.uid()) and profile.papel = 'corretor'
    )
  );

-- O SELECT abaixo aplica a RLS de leads: gestores veem todas as observacoes;
-- corretores veem o historico apenas dos leads atualmente sob sua responsabilidade.
-- Nao ha dependencia inversa de leads para observacoes, evitando recursao.
create policy lead_observacoes_select
  on public.lead_observacoes for select to authenticated
  using (
    exists (
      select 1 from public.leads as lead
      where lead.id = lead_observacoes.lead_id
    )
  );

create policy lead_observacoes_insert
  on public.lead_observacoes for insert to authenticated
  with check (
    autor_id = (select auth.uid())
    and exists (
      select 1 from public.leads as lead
      where lead.id = lead_observacoes.lead_id
    )
  );

-- Nenhum DELETE/TRUNCATE via cliente; nenhuma edicao de observacoes.
-- A ausencia de GRANTs e de politicas de escrita complementares e intencional.

-- Garantir o reservatorio tambem em INSERTs administrativos, fora da Data API.
-- A restricao vale somente na criacao; nao impede a atribuicao futura via UPDATE.
create function private.ensure_lead_reservatorio()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.responsavel_id is not null then
    raise exception 'Novos leads devem entrar no reservatorio, sem responsavel.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

alter function private.ensure_lead_reservatorio() owner to postgres;
revoke all on function private.ensure_lead_reservatorio()
  from public, anon, authenticated, service_role;

create trigger leads_require_reservatorio
  before insert on public.leads
  for each row execute function private.ensure_lead_reservatorio();

create function private.set_lead_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.statement_timestamp();
  return new;
end;
$$;

alter function private.set_lead_updated_at() owner to postgres;
revoke all on function private.set_lead_updated_at()
  from public, anon, authenticated, service_role;

-- O trigger pode atualizar updated_at sem dar UPDATE dessa coluna ao cliente.
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function private.set_lead_updated_at();

-- Edicao administrativa dos dados: enviar todos os campos editaveis abaixo.
-- p_email aceita NULL. O responsavel atual e preservado, atribuido ou nao.
-- A funcao nao permite alterar id, responsavel_id, created_at ou updated_at.
-- Atribuicao sera exclusiva de futura funcao round-robin transacional com historico.
create function public.atualizar_lead(
  p_id uuid,
  p_nome text,
  p_telefone text,
  p_origem text,
  p_interesse text,
  p_email text,
  p_etapa text
)
returns public.leads
language plpgsql
security definer
set search_path = ''
as $$
declare
  lead_atualizado public.leads;
begin
  -- SECURITY DEFINER ignora RLS como postgres: a autorizacao deve vir ANTES
  -- de qualquer leitura/escrita e usar o papel da tabela protegida profiles.
  -- Nunca confiar em papel recebido por parametro ou em user_metadata.
  if auth.uid() is null or not private.is_gestor() then
    raise exception 'Apenas gestores podem editar os dados do lead.'
      using errcode = '42501';
  end if;

  update public.leads
  set nome = p_nome,
      telefone = p_telefone,
      origem = p_origem,
      interesse = p_interesse,
      email = p_email,
      etapa = p_etapa
  where id = p_id
  returning * into lead_atualizado;

  if not found then
    raise exception 'Lead nao encontrado.' using errcode = 'P0002';
  end if;

  return lead_atualizado;
end;
$$;

alter function public.atualizar_lead(uuid, text, text, text, text, text, text)
  owner to postgres;
revoke all on function public.atualizar_lead(uuid, text, text, text, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.atualizar_lead(uuid, text, text, text, text, text, text)
  to authenticated;

-- Ordenacao deterministica: created_at ASC, id ASC (desempate por UUID).
create index leads_reservatorio_created_at_id_idx
  on public.leads (created_at, id) where responsavel_id is null;
create index leads_responsavel_created_at_id_idx
  on public.leads (responsavel_id, created_at, id);
create index leads_etapa_created_at_id_idx
  on public.leads (etapa, created_at, id);
create index lead_observacoes_lead_created_at_id_idx
  on public.lead_observacoes (lead_id, created_at, id);
create index lead_observacoes_autor_id_idx
  on public.lead_observacoes (autor_id);

commit;

-- Contrato da Data API para implementacao futura:
-- Gestor: SELECT/INSERT em leads; atualizar_lead(...) para edicao dos dados.
-- Todo lead nasce sem responsavel; nenhuma operacao do cliente altera a atribuicao.
-- Corretor: SELECT nos proprios leads; UPDATE com payload contendo apenas etapa.
-- Observacoes: INSERT apenas com lead_id e texto; autor_id = auth.uid().
-- Ids, timestamps, autoria e responsavel_id nao devem ser enviados nas escritas.
