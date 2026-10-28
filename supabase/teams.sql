-- ==============================================================================
-- OPERATOR // MATRIX WORKSPACE - TIMES (PROJETOS COMPARTILHADOS)
-- ==============================================================================
-- Cole este script no SQL Editor do Supabase e clique em "RUN", depois de
-- schema.sql e storage.sql. Pode ser executado mais de uma vez sem problema.
--
-- Modelo:
-- - Um time tem uma dona ('owner') e membros ('member').
-- - A dona adiciona membros pelo e-mail de quem já tem conta no app.
-- - Um projeto pertence a uma pessoa (user_id) e pode ser compartilhado com um
--   time (team_id). Membros do time leem e editam; só a dona do projeto
--   compartilha, descompartilha ou apaga.
-- ==============================================================================

-- 1. Tabelas ---------------------------------------------------------------------

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user_id on public.team_members(user_id);

-- Projetos: time (vazio = pessoal), versão (sobe a cada alteração, para detectar
-- edições simultâneas) e quem fez a última alteração.
alter table public.projects add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.projects add column if not exists version integer not null default 0;
alter table public.projects add column if not exists updated_by uuid references auth.users(id) on delete set null;

create index if not exists idx_projects_team_id on public.projects(team_id) where team_id is not null;

-- 2. Funções de apoio ------------------------------------------------------------
-- security definer: consultam team_members sem esbarrar nas próprias políticas.

create or replace function public.is_team_member(p_team uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_team_owner(p_team uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members
    where team_id = p_team and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- 3. Ações (chamadas pelo app com supabase.rpc) ------------------------------------

-- Cria o time e coloca quem chamou como dona.
create or replace function public.create_team(p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_team uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;
  insert into public.teams (name, created_by) values (btrim(p_name), v_user) returning id into v_team;
  insert into public.team_members (team_id, user_id, role) values (v_team, v_user, 'owner');
  return v_team;
end;
$$;

-- Adiciona um membro pelo e-mail. Só a dona do time pode.
-- Retorna 'added', 'already_member' ou 'not_found' (e-mail sem conta no app).
create or replace function public.add_team_member(p_team uuid, p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_target uuid;
begin
  if not public.is_team_owner(p_team) then
    raise exception 'not_team_owner';
  end if;
  select id into v_target from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if v_target is null then
    return 'not_found';
  end if;
  if exists (select 1 from public.team_members where team_id = p_team and user_id = v_target) then
    return 'already_member';
  end if;
  insert into public.team_members (team_id, user_id, role) values (p_team, v_target, 'member');
  return 'added';
end;
$$;

-- Lista os membros com e-mail. Só para quem é do time.
create or replace function public.list_team_members(p_team uuid)
returns table (user_id uuid, email text, role text, added_at timestamptz)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_team_member(p_team) then
    raise exception 'not_team_member';
  end if;
  return query
    select m.user_id, u.email::text, m.role, m.added_at
    from public.team_members m
    join auth.users u on u.id = m.user_id
    where m.team_id = p_team
    order by m.role desc, m.added_at;
end;
$$;

revoke all on function public.is_team_member(uuid) from public;
revoke all on function public.is_team_owner(uuid) from public;
revoke all on function public.create_team(text) from public;
revoke all on function public.add_team_member(uuid, text) from public;
revoke all on function public.list_team_members(uuid) from public;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.create_team(text) to authenticated;
grant execute on function public.add_team_member(uuid, text) to authenticated;
grant execute on function public.list_team_members(uuid) to authenticated;

-- 4. Políticas (RLS) ---------------------------------------------------------------

alter table public.teams enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "Members read their teams" on public.teams;
drop policy if exists "Owners rename their teams" on public.teams;
drop policy if exists "Owners delete their teams" on public.teams;

create policy "Members read their teams"
on public.teams for select to authenticated
using (public.is_team_member(id));

create policy "Owners rename their teams"
on public.teams for update to authenticated
using (public.is_team_owner(id))
with check (public.is_team_owner(id));

create policy "Owners delete their teams"
on public.teams for delete to authenticated
using (public.is_team_owner(id));

-- Times são criados só por create_team (sem política de insert).

drop policy if exists "Members read team members" on public.team_members;
drop policy if exists "Owners remove members, members leave" on public.team_members;

create policy "Members read team members"
on public.team_members for select to authenticated
using (public.is_team_member(team_id));

-- A dona remove outros membros; um membro pode sair. A dona não sai: apaga o time.
create policy "Owners remove members, members leave"
on public.team_members for delete to authenticated
using (
  (public.is_team_owner(team_id) and user_id <> (select auth.uid()))
  or (user_id = (select auth.uid()) and role = 'member')
);

-- Membros só entram por add_team_member (sem política de insert/update).

drop policy if exists "Team members read team projects" on public.projects;
drop policy if exists "Team members update team projects" on public.projects;

create policy "Team members read team projects"
on public.projects for select to authenticated
using (team_id is not null and public.is_team_member(team_id));

create policy "Team members update team projects"
on public.projects for update to authenticated
using (team_id is not null and public.is_team_member(team_id))
with check (team_id is not null and public.is_team_member(team_id));

-- A política "Users can manage their own projects" (schema.sql) continua valendo
-- para a dona do projeto. Apagar projeto continua sendo só da dona.

-- 5. Proteções em gatilho -----------------------------------------------------------
-- Ficam no gatilho (e não só nas políticas) para valerem mesmo que schema.sql seja
-- rodado de novo e recrie a política da dona.

create or replace function public.projects_guard()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  -- Sem usuário (SQL Editor, chave de serviço): não interfere.
  if v_user is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.team_id is not null and not public.is_team_member(new.team_id) then
      raise exception 'not_team_member';
    end if;
    new.version := 0;
    new.updated_by := v_user;
    return new;
  end if;

  if new.id is distinct from old.id or new.user_id is distinct from old.user_id then
    raise exception 'project_owner_or_id_change_not_allowed';
  end if;

  if new.team_id is distinct from old.team_id then
    -- Compartilhar/descompartilhar: só a dona do projeto, e só com um time do qual
    -- ela faz parte. Exceções, sempre voltando o projeto para pessoal: a dona saiu
    -- do time (team_members_cleanup) ou o time foi apagado (on delete set null).
    if v_user = old.user_id then
      if new.team_id is not null and not public.is_team_member(new.team_id) then
        raise exception 'not_team_member';
      end if;
    elsif not (
      new.team_id is null
      and (
        not exists (select 1 from public.teams t where t.id = old.team_id)
        or not exists (select 1 from public.team_members m where m.team_id = old.team_id and m.user_id = old.user_id)
      )
    ) then
      raise exception 'only_project_owner_can_share';
    end if;
  end if;

  new.version := old.version + 1;
  new.updated_by := v_user;
  return new;
end;
$$;

drop trigger if exists projects_guard on public.projects;
create trigger projects_guard
before insert or update on public.projects
for each row execute function public.projects_guard();

-- Quem sai (ou é removido) de um time leva de volta os projetos que tinha
-- compartilhado com ele: o projeto volta a ser pessoal da dona.
create or replace function public.team_members_cleanup()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.projects
    set team_id = null
    where team_id = old.team_id and user_id = old.user_id;
  return old;
end;
$$;

revoke all on function public.team_members_cleanup() from public;
revoke all on function public.projects_guard() from public;

drop trigger if exists team_members_cleanup on public.team_members;
create trigger team_members_cleanup
after delete on public.team_members
for each row execute function public.team_members_cleanup();

-- 6. Anexos dos projetos de time ----------------------------------------------------
-- Os arquivos continuam na pasta da dona do projeto (<user_id>/<project_id>/arquivo).
-- Membros do time podem ver, enviar e apagar arquivos dessa pasta.

create or replace function public.can_access_team_file(p_name text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.user_id::text = (storage.foldername(p_name))[1]
      and p.id = (storage.foldername(p_name))[2]
      and p.team_id is not null
      and public.is_team_member(p.team_id)
  );
$$;

revoke all on function public.can_access_team_file(text) from public;
grant execute on function public.can_access_team_file(text) to authenticated;

drop policy if exists "Team members read team attachments" on storage.objects;
drop policy if exists "Team members upload team attachments" on storage.objects;
drop policy if exists "Team members delete team attachments" on storage.objects;

create policy "Team members read team attachments"
on storage.objects for select to authenticated
using (bucket_id = 'project-attachments' and public.can_access_team_file(name));

create policy "Team members upload team attachments"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-attachments' and public.can_access_team_file(name));

create policy "Team members delete team attachments"
on storage.objects for delete to authenticated
using (bucket_id = 'project-attachments' and public.can_access_team_file(name));

-- 7. Tempo real ---------------------------------------------------------------------
-- O app escuta mudanças em projects para mostrar na hora o que o time alterou.
-- (O Realtime respeita as políticas acima: cada pessoa só recebe o que pode ler.)

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'projects'
     ) then
    alter publication supabase_realtime add table public.projects;
  end if;
end $$;

-- ==============================================================================
-- PRONTO! Crie o time pelo app (comando "team" no Ctrl+K) e adicione os membros.
-- ==============================================================================
