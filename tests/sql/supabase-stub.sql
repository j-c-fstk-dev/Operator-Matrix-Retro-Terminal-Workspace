-- O mínimo do Supabase para testar os scripts de supabase/ num Postgres comum:
-- papéis anon/authenticated, auth.users, auth.uid() e o esquema storage.
-- Usado só pelos testes (scripts/test-db.sh); não rode no Supabase.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text unique);

-- Como no Supabase: o id do usuário vem do JWT da requisição.
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false, file_size_limit bigint
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text not null,
  owner uuid default auth.uid()
);
alter table storage.objects enable row level security;

-- Pastas do caminho, sem o nome do arquivo: 'a/b/c.txt' -> {a,b}.
create or replace function storage.foldername(name text) returns text[]
language sql immutable
as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

grant usage on schema storage to anon, authenticated;
grant all on storage.objects to authenticated;
grant execute on function storage.foldername(text) to anon, authenticated;
