-- Depende de 20261112000000_create_profiles.sql (PostgreSQL 14+).
-- Aplicar uma unica vez no SQL Editor como postgres, apos as migracoes anteriores.
-- Manter private fora dos schemas expostos. Nao implementa distribuicao de leads.
begin;

-- Uma unica linha coordena QR, confirmacoes e a ordem persistente da fila.
-- O contador nunca reinicia na troca de QR, no dia seguinte ou com a fila vazia.
create table private.presenca_controle (
  id integer primary key check (id = 1),
  janela_inicio timestamptz,
  token uuid,
  ultima_posicao bigint not null default 0 check (ultima_posicao >= 0),
  check ((janela_inicio is null) = (token is null))
);

insert into private.presenca_controle (id) values (1);

create table private.presencas (
  corretor_id uuid primary key references public.profiles (id) on delete cascade,
  posicao bigint not null unique check (posicao > 0),
  entrada_fila_em timestamptz not null,
  confirmado_em timestamptz not null,
  valido_ate timestamptz not null,
  check (valido_ate = confirmado_em + interval '5 hours'),
  check (entrada_fila_em <= confirmado_em)
);

-- UNIQUE(posicao) ja fornece o indice de ordenacao da fila.
create index presencas_valido_ate_idx on private.presencas (valido_ate);

alter table private.presenca_controle owner to postgres;
alter table private.presencas owner to postgres;
alter table private.presenca_controle enable row level security;
alter table private.presencas enable row level security;
revoke all on table private.presenca_controle, private.presencas
  from public, anon, authenticated, service_role;

-- Sem politicas ou GRANTs de acesso direto, inclusive para gestores.
-- RLS nega por padrao; somente as RPCs autorizadas abaixo acessam como postgres.
-- Nao usar FORCE RLS: o bypass do proprietario nas RPCs e intencional.
grant usage on schema public to authenticated;

create function public.obter_qr_presenca()
returns table (token uuid, valido_desde timestamptz, valido_ate timestamptz)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_controle private.presenca_controle;
  v_agora timestamptz;
  v_janela timestamptz;
begin
  if auth.uid() is null or not private.is_gestor() then
    raise exception 'Apenas gestores podem obter o QR de presenca.' using errcode = '42501';
  end if;

  select controle.* into strict v_controle
  from private.presenca_controle as controle where controle.id = 1 for update;

  -- Revalidar o papel apos a espera e impedir sua troca ate o fim da transacao.
  perform 1 from public.profiles as perfil
  where perfil.id = auth.uid() and perfil.papel = 'gestor' for share;
  if not found then
    raise exception 'Apenas gestores podem obter o QR de presenca.' using errcode = '42501';
  end if;

  -- clock_timestamp e lido APOS os locks: now() manteria o inicio da transacao.
  -- Janelas UTC [inicio, inicio + 5 min), por exemplo 12:00:00 ate 12:04:59.999...
  v_agora := pg_catalog.clock_timestamp();
  v_janela := pg_catalog.date_bin(
    interval '5 minutes', v_agora, timestamptz '1970-01-01 00:00:00+00'
  );

  if v_controle.janela_inicio is distinct from v_janela then
    update private.presenca_controle as controle
    set janela_inicio = v_janela, token = pg_catalog.gen_random_uuid()
    where controle.id = 1 returning controle.* into v_controle;
  end if;

  -- Emissao sob demanda: chamadas simultaneas na mesma janela recebem o mesmo QR.
  -- Nao aceita data do cliente, nao antecipa tokens e nao prolonga a janela.
  return query select v_controle.token, v_janela, v_janela + interval '5 minutes';
end;
$$;

create function public.confirmar_presenca(p_token uuid)
returns table (
  corretor_id uuid, posicao bigint, entrada_fila_em timestamptz,
  confirmado_em timestamptz, valido_ate timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
  v_controle private.presenca_controle;
  v_presenca private.presencas;
  v_agora timestamptz;
  v_posicao bigint;
begin
  -- Identidade exclusivamente da sessao; papel exclusivamente da tabela protegida.
  if v_usuario is null or not exists (
    select 1 from public.profiles as perfil
    where perfil.id = v_usuario and perfil.papel = 'corretor'
  ) then
    raise exception 'Apenas corretores podem confirmar presenca.' using errcode = '42501';
  end if;

  -- Ordem de locks para todas as escritas: controle -> perfil -> presenca.
  -- O lock global dura ate COMMIT/ROLLBACK e serializa tambem corretores distintos.
  select controle.* into strict v_controle
  from private.presenca_controle as controle where controle.id = 1 for update;

  perform 1 from public.profiles as perfil
  where perfil.id = v_usuario and perfil.papel = 'corretor' for share;
  if not found then
    raise exception 'Apenas corretores podem confirmar presenca.' using errcode = '42501';
  end if;

  select presenca.* into v_presenca from private.presencas as presenca
  where presenca.corretor_id = v_usuario for update;

  v_agora := pg_catalog.clock_timestamp();
  if p_token is null or v_controle.token is null
     or p_token <> v_controle.token
     or v_agora < v_controle.janela_inicio
     or v_agora >= v_controle.janela_inicio + interval '5 minutes' then
    raise exception 'QR de presenca invalido ou expirado.' using errcode = '22023';
  end if;

  if v_presenca.corretor_id is null or v_presenca.valido_ate <= v_agora then
    -- Primeira entrada ou retorno expirado: novo ordinal, maior que todos os anteriores.
    update private.presenca_controle as controle
    set ultima_posicao = controle.ultima_posicao + 1
    where controle.id = 1 returning controle.ultima_posicao into v_posicao;

    insert into private.presencas as presenca
      (corretor_id, posicao, entrada_fila_em, confirmado_em, valido_ate)
    values (v_usuario, v_posicao, v_agora, v_agora, v_agora + interval '5 hours')
    on conflict on constraint presencas_pkey do update
    set posicao = excluded.posicao,
        entrada_fila_em = excluded.entrada_fila_em,
        confirmado_em = excluded.confirmado_em,
        valido_ate = excluded.valido_ate
    returning presenca.* into v_presenca;
  else
    -- Renovacao valida nao altera posicao nem entrada_fila_em.
    -- Cinco horas a partir desta confirmacao, sem acumular horas sobre valido_ate.
    update private.presencas as presenca
    set confirmado_em = v_agora, valido_ate = v_agora + interval '5 hours'
    where presenca.corretor_id = v_usuario returning presenca.* into v_presenca;
  end if;

  return query select v_presenca.corretor_id, v_presenca.posicao,
    v_presenca.entrada_fila_em, v_presenca.confirmado_em, v_presenca.valido_ate;
end;
$$;

create function public.listar_presencas()
returns table (
  corretor_id uuid, nome text, posicao bigint, entrada_fila_em timestamptz,
  confirmado_em timestamptz, valido_ate timestamptz, elegivel boolean,
  consultado_em timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_agora timestamptz;
begin
  if auth.uid() is null or not private.is_gestor() then
    raise exception 'Apenas gestores podem consultar a fila de presenca.' using errcode = '42501';
  end if;

  v_agora := pg_catalog.clock_timestamp();
  return query
    select presenca.corretor_id, perfil.nome, presenca.posicao,
      presenca.entrada_fila_em, presenca.confirmado_em, presenca.valido_ate,
      presenca.valido_ate > v_agora, v_agora
    from private.presencas as presenca
    join public.profiles as perfil on perfil.id = presenca.corretor_id
    where perfil.papel = 'corretor'
    order by presenca.posicao asc;
end;
$$;

alter function public.obter_qr_presenca() owner to postgres;
alter function public.confirmar_presenca(uuid) owner to postgres;
alter function public.listar_presencas() owner to postgres;
revoke all on function public.obter_qr_presenca(), public.confirmar_presenca(uuid),
  public.listar_presencas() from public, anon, authenticated, service_role;
grant execute on function public.obter_qr_presenca(), public.confirmar_presenca(uuid),
  public.listar_presencas() to authenticated;

commit;

-- Contrato para implementacao futura:
-- Gestor: RPC obter_qr_presenca() para exibir o token, renovar a exibicao na fronteira
-- de valido_ate; RPC listar_presencas() para a fila, inclusive expirados sinalizados.
-- Corretor: RPC confirmar_presenca(p_token), retornando apenas sua propria presenca.
-- Nenhuma RPC recebe identidade, horario, duracao ou posicao fornecidos pelo cliente.
-- Expiracao e logica: valido_ate <= horario do banco; dispensa cron e nao apaga a fila.
-- posicao e ordinal persistente, nao numero consecutivo dos atualmente elegiveis.
-- O futuro round-robin DEVE bloquear presenca_controle(id=1) antes de tocar a fila,
-- revalidar papel/valido_ate pelo relogio apos os locks e usar o mesmo contador para
-- mover ao final. Esta migracao nao movimenta a fila por atendimento nem atribui leads.
-- Usar transacoes curtas; em isolamento REPEATABLE READ/SERIALIZABLE, o chamador deve
-- repetir a transacao inteira em falha de serializacao (SQLSTATE 40001).
-- Testar em ambiente isolado: fronteiras de 5 min/5 h, tokens nulo/antigo/futuro,
-- renovacao, retorno expirado, duplicatas, rollback, permissoes e chamadas concorrentes
-- (mesmo corretor, corretores distintos, emissao do QR e espera cruzando a expiracao).
