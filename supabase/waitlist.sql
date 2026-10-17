-- ==============================================================================
-- OPERATOR // LISTA DE ESPERA DO SYNC PRO (landing page)
-- ==============================================================================
-- Cole no SQL Editor do Supabase e clique em "RUN". Pode rodar mais de uma vez.
--
-- Quem visita a landing page só consegue INSERIR o próprio e-mail. Ninguém lê a
-- lista pela API pública: para ver os inscritos, use o Table Editor do painel.
-- ==============================================================================

create table if not exists public.waitlist (
  id bigint generated always as identity primary key,
  email text not null check (
    char_length(email) between 6 and 254
    and email = lower(email)
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  source text not null default 'landing' check (char_length(source) <= 40),
  theme text check (char_length(theme) <= 20),
  created_at timestamptz not null default now()
);

-- Um e-mail entra uma vez só (a landing trata o conflito como "já está na lista").
create unique index if not exists waitlist_email_key on public.waitlist (email);

alter table public.waitlist enable row level security;

drop policy if exists "Anyone can join the waitlist" on public.waitlist;
create policy "Anyone can join the waitlist"
on public.waitlist for insert
to anon, authenticated
with check (true);

-- Sem policy de SELECT, UPDATE ou DELETE: a lista não é legível pela chave pública.
revoke select, update, delete on public.waitlist from anon, authenticated;

-- ==============================================================================
-- PRONTO! Os e-mails aparecem em Table Editor > waitlist.
-- ==============================================================================
