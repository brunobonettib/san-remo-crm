-- Depende das migracoes anteriores de profiles, leads e presenca.
-- Aplicar uma unica vez no SQL Editor como postgres, apos as anteriores.
-- Manter private fora dos schemas expostos pela Data API.
begin;

-- Uma distribuicao por lead, inclusive se ele for devolvido administrativamente
-- ao reservatorio. RESTRICT preserva o historico e impede apagar suas referencias.
create table public.lead_distribuicoes (
  lead_id uuid primary key references public.leads (id) on delete restrict,
  corretor_id uuid not null references public.profiles (id) on delete restrict,
  distribuido_em timestamptz not null
);

alter table public.lead_distribuicoes owner to postgres;
alter table public.lead_distribuicoes enable row level security;
revoke all on table public.lead_distribuicoes
  from public, anon, authenticated, service_role;
grant usage on schema public to authenticated;
grant select on table public.lead_distribuicoes to authenticated;

create policy lead_distribuicoes_select_gestor
  on public.lead_distribuicoes for select to authenticated
  using ((select private.is_gestor()));

-- Sem politicas/GRANTs de escrita ao cliente. A RPC e a unica escrita exposta.
create index lead_distribuicoes_data_lead_idx
  on public.lead_distribuicoes (distribuido_em, lead_id);
create index lead_distribuicoes_corretor_data_idx
  on public.lead_distribuicoes (corretor_id, distribuido_em, lead_id);

-- Defesa adicional contra alteracoes/exclusoes acidentais, inclusive pelo painel.
create function private.proteger_historico_distribuicao()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception 'O historico de distribuicao e imutavel.' using errcode = '42501';
end;
$$;

alter function private.proteger_historico_distribuicao() owner to postgres;
revoke all on function private.proteger_historico_distribuicao()
  from public, anon, authenticated, service_role;

create trigger lead_distribuicoes_imutaveis
  before update or delete on public.lead_distribuicoes
  for each row execute function private.proteger_historico_distribuicao();
create trigger lead_distribuicoes_sem_truncate
  before truncate on public.lead_distribuicoes
  for each statement execute function private.proteger_historico_distribuicao();

create function public.distribuir_proximo_lead()
returns table (
  status text, lead_id uuid, corretor_id uuid, distribuido_em timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_gestor uuid := auth.uid();
  v_controle private.presenca_controle;
  v_lead uuid;
  v_candidato record;
  v_presenca private.presencas;
  v_ultima_examinada bigint := 0;
  v_nova_posicao bigint;
  v_agora timestamptz;
begin
  -- SECURITY DEFINER ignora RLS: autorizar ANTES de acessar os dados protegidos.
  if v_gestor is null or not private.is_gestor() then
    raise exception 'Apenas gestores autenticados podem distribuir leads.'
      using errcode = '42501';
  end if;

  -- Mesmo lock global de obter_qr_presenca/confirmar_presenca, ate COMMIT/ROLLBACK.
  -- Nunca adquirir um lock de lead, perfil ou presenca antes deste controle.
  select controle.* into strict v_controle
  from private.presenca_controle as controle where controle.id = 1 for update;

  -- Revalidar o gestor apos a espera e manter seu papel ate encerrar a transacao.
  perform 1 from public.profiles as perfil
  where perfil.id = v_gestor and perfil.papel = 'gestor' for share;
  if not found then
    raise exception 'Apenas gestores autenticados podem distribuir leads.'
      using errcode = '42501';
  end if;

  -- Nao usar SKIP LOCKED: pular um lead ocupado quebraria a ordem do reservatorio.
  -- created_at/id nao sao editaveis pela Data API; o indice parcial ja existe.
  select lead.id into v_lead
  from public.leads as lead
  where lead.responsavel_id is null
  order by lead.created_at asc, lead.id asc
  limit 1 for update;

  if not found then
    return query select 'sem_lead'::text, null::uuid, null::uuid, null::timestamptz;
    return;
  end if;

  loop
    -- O controle global estabiliza a ordem frente a todas as RPCs da fila.
    -- Esta leitura apenas procura um candidato; a validade e reavaliada apos locks.
    select presenca.corretor_id, presenca.posicao into v_candidato
    from private.presencas as presenca
    join public.profiles as perfil on perfil.id = presenca.corretor_id
    where perfil.papel = 'corretor'
      and presenca.posicao > v_ultima_examinada
      and presenca.valido_ate > pg_catalog.clock_timestamp()
    order by presenca.posicao asc
    limit 1;

    if not found then
      return query select 'sem_corretor_elegivel'::text, v_lead,
        null::uuid, null::timestamptz;
      return;
    end if;
    v_ultima_examinada := v_candidato.posicao;

    -- Como na confirmacao: bloquear o perfil ANTES da respectiva presenca.
    -- FOR SHARE impede troca de papel/exclusao durante a atribuicao.
    perform 1 from public.profiles as perfil
    where perfil.id = v_candidato.corretor_id and perfil.papel = 'corretor'
    for share;
    if not found then
      continue;
    end if;

    select presenca.* into v_presenca
    from private.presencas as presenca
    where presenca.corretor_id = v_candidato.corretor_id for update;
    if not found then
      continue;
    end if;

    -- Todos os locks de controle, lead, perfil e presenca ja foram obtidos.
    -- Se expirou durante a espera, tentar o proximo, sem mover o candidato expirado.
    v_agora := pg_catalog.clock_timestamp();
    if v_presenca.valido_ate > v_agora then
      exit;
    end if;
  end loop;

  -- Sem ON CONFLICT DO NOTHING: duplicidade deve abortar a transacao inteira.
  -- Isso tambem protege um lead ja distribuido que tenha sido devolvido manualmente
  -- ao reservatorio. Nao se pula esse lead para distribuir um mais recente.
  insert into public.lead_distribuicoes (lead_id, corretor_id, distribuido_em)
  values (v_lead, v_presenca.corretor_id, v_agora);

  update public.leads as lead
  set responsavel_id = v_presenca.corretor_id
  where lead.id = v_lead and lead.responsavel_id is null;
  if not found then
    raise exception 'O lead deixou de estar disponivel para distribuicao.'
      using errcode = '40001';
  end if;

  update private.presenca_controle as controle
  set ultima_posicao = controle.ultima_posicao + 1
  where controle.id = 1 returning controle.ultima_posicao into v_nova_posicao;

  -- Reutiliza a MESMA fila. Nao renova validade nem altera os horarios de presenca.
  update private.presencas as presenca
  set posicao = v_nova_posicao
  where presenca.corretor_id = v_presenca.corretor_id;
  if not found then
    raise exception 'Nao foi possivel atualizar a posicao do corretor.'
      using errcode = '40001';
  end if;

  return query select 'distribuido'::text, v_lead, v_presenca.corretor_id, v_agora;
end;
$$;

alter function public.distribuir_proximo_lead() owner to postgres;
revoke all on function public.distribuir_proximo_lead()
  from public, anon, authenticated, service_role;
grant execute on function public.distribuir_proximo_lead() to authenticated;

commit;

-- Contrato da Data API:
-- Gestor: RPC distribuir_proximo_lead(), sem parametros, retorna exatamente uma linha.
-- status = distribuido: lead_id/corretor_id/distribuido_em identificam o resultado.
-- status = sem_lead: reservatorio vazio, demais campos NULL, nenhuma escrita.
-- status = sem_corretor_elegivel: lead_id aguardando, demais campos NULL, nenhuma escrita.
-- Historico: SELECT public.lead_distribuicoes (somente gestor via RLS).
-- A PK lead_id recusa segunda distribuicao com SQLSTATE 23505; nunca remover historico
-- para redistribuir. Leads/perfis referenciados nao podem ser excluidos (RESTRICT).
-- Atualizacoes de contato/etapa e renovacao de presenca continuam nas RPCs existentes.
-- Distribuicao, historico, contador e fila confirmam ou revertem juntos; sem COMMIT
-- interno nem tratamento que esconda falhas. Transacoes devem ser curtas.
-- Em falha 40001/40P01, repetir a transacao inteira. Em resposta de rede perdida,
-- consultar o historico antes de repetir: uma nova chamada pode distribuir OUTRO lead.
-- Testes locais: ordem created_at/id e A-B-C-A, chamadas concorrentes e confirmacao de
-- presenca simultanea, expiracao durante bloqueios, duplicidade, ausencias e rollback.
