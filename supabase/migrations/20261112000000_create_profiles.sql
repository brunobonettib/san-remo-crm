-- Aplicar uma unica vez no SQL Editor do Supabase, usando o papel postgres.
-- Manter o schema private fora dos schemas expostos pela Data API.
-- A migracao nao cria usuarios nem perfis automaticamente.
begin;

create schema if not exists private authorization postgres;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  papel text not null check (papel in ('gestor', 'corretor'))
);

alter table public.profiles owner to postgres;
alter table public.profiles enable row level security;

-- Remover inclusive eventuais privilegios automaticos do projeto.
-- Escritas administrativas serao feitas como postgres pelo painel.
revoke all on table public.profiles from public, anon, authenticated, service_role;
grant usage on schema public to authenticated;
grant select on table public.profiles to authenticated;

-- O dono da tabela consulta sem RLS, evitando recursao na propria politica.
-- Nao usar FORCE ROW LEVEL SECURITY: o bypass do dono e intencional aqui.
-- Sem argumento de usuario: verifica exclusivamente a identidade da sessao.
-- O papel vem da tabela protegida, nunca de metadados editaveis pelo usuario.
create function private.is_gestor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.papel = 'gestor'
  );
$$;

alter function private.is_gestor() owner to postgres;
revoke all on function private.is_gestor() from public, anon, authenticated, service_role;
grant execute on function private.is_gestor() to authenticated;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

-- Neste CRM de uma unica equipe, gestores podem consultar todos os perfis.
-- A tabela expoe somente id, nome e papel, sem dados de auth.users.
create policy profiles_select_gestor
  on public.profiles
  for select
  to authenticated
  using ((select private.is_gestor()));

-- Sem politicas ou GRANTs de INSERT, UPDATE, DELETE ou TRUNCATE ao cliente.
-- Isso tambem impede que gestores alterem papeis pelo frontend.
commit;

-- Cadastro administrativo posterior (fora desta migracao):
-- 1. Em Authentication > Users, criar o usuario ficticio e copiar seu UUID.
-- 2. No Table Editor, inserir public.profiles com esse id, nome e papel;
--    ou executar no SQL Editor como postgres (substituindo o UUID abaixo):
-- insert into public.profiles (id, nome, papel)
-- values ('UUID_DO_USUARIO', 'Nome ficticio', 'corretor');
-- 3. Para um gestor, usar papel = 'gestor' nesse cadastro administrativo.
-- Usuarios sem perfil nao recebem acesso aos perfis de outros usuarios.
