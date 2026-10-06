-- ==============================================================================
-- OPERATOR // MATRIX WORKSPACE - SUPABASE DATABASE SCHEMA
-- ==============================================================================
-- Cole este script no SQL Editor do seu projeto Supabase (Dashboard > SQL Editor)
-- e clique em "RUN".
-- ==============================================================================

-- 1. Criação da tabela de projetos do usuário
create table if not exists public.projects (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  slug text not null,
  category text default 'GERAL',
  description text default '',
  status text default 'active',
  tasks jsonb default '[]'::jsonb,
  observations jsonb default '[]'::jsonb,
  code_snippets jsonb default '[]'::jsonb,
  created_at bigint default (extract(epoch from now()) * 1000)::bigint,
  updated_at bigint default (extract(epoch from now()) * 1000)::bigint
);

-- 2. Habilitação de Row Level Security (RLS) para proteção estrita de dados
alter table public.projects enable row level security;

-- 3. Políticas de Segurança (Cada usuário só lê, insere, atualiza e remove os próprios dados)
drop policy if exists "Users can manage their own projects" on public.projects;

create policy "Users can manage their own projects"
on public.projects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- 4. Índice para agilizar consultas por usuário e data de atualização
create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_updated_at on public.projects(updated_at desc);

-- ==============================================================================
-- PRONTO! Sua tabela está criada com segurança total.
-- ==============================================================================
