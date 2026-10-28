-- Testes de segurança dos times (supabase/teams.sql) num Postgres de verdade.
-- Rodado por scripts/test-db.sh depois de supabase-stub.sql e dos scripts de supabase/.
-- Contas: A = dona do time, B = colega (membro), C = pessoa de fora.

\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = notice;

\set A '00000000-0000-0000-0000-00000000000a'
\set B '00000000-0000-0000-0000-00000000000b'
\set C '00000000-0000-0000-0000-00000000000c'

-- Ajudantes ---------------------------------------------------------------------
create schema if not exists test;
grant usage on schema test to authenticated;

create or replace function test.check(ok boolean, msg text) returns void
language plpgsql as $$
begin
  if not coalesce(ok, false) then
    raise exception 'FALHOU: %', msg;
  end if;
  raise notice 'ok: %', msg;
end $$;

-- O comando precisa dar erro, com mensagem que case com o padrão.
create or replace function test.fails(stmt text, pattern text, msg text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    if sqlerrm ~* pattern then
      raise notice 'ok: %', msg;
      return;
    end if;
    raise exception 'FALHOU: % (erro inesperado: %)', msg, sqlerrm;
  end;
  raise exception 'FALHOU: % (não deu erro)', msg;
end $$;

-- Quantas linhas o comando alterou (RLS bloqueia em silêncio: 0 linhas).
create or replace function test.affected(stmt text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute stmt;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on all functions in schema test to authenticated;

-- Só os avisos "ok: ..." (e os erros) aparecem; os resultados dos selects não.
\o /dev/null

insert into auth.users (id, email) values
  (:'A', 'ana@operator.test'), (:'B', 'bia@operator.test'), (:'C', 'caio@operator.test');
insert into storage.buckets (id, name) values ('project-attachments', 'project-attachments') on conflict do nothing;

-- A cria projetos pessoais e o time --------------------------------------------------
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;

insert into public.projects (id, user_id, title, slug) values ('p1', :'A', 'Projeto 1', 'p1');
insert into public.projects (id, user_id, title, slug, version) values ('p2', :'A', 'Pessoal da A', 'p2', 99);
select test.check((select version from public.projects where id = 'p2') = 0, 'insert ignora version enviada pelo app');
select test.check((select updated_by from public.projects where id = 'p2') = :'A', 'insert grava updated_by');

select public.create_team('  Dupla  ') as team_t \gset
select test.check((select name from public.teams where id = :'team_t') = 'Dupla', 'create_team cria o time com nome limpo');
select test.check((select role from public.team_members where team_id = :'team_t' and user_id = :'A') = 'owner', 'quem cria vira dona');
select test.fails($$select public.create_team('   ')$$, 'check', 'nome vazio é recusado');

-- C cria o próprio time (para testes entre times)
reset role;
select set_config('request.jwt.claim.sub', :'C', false);
set role authenticated;
select public.create_team('Time do Caio') as team_c \gset
select test.check((select count(*) from public.teams) = 1, 'C só vê o próprio time');

-- Adicionar membros -----------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check(public.add_team_member(:'team_t', 'bia@operator.test') = 'added', 'A adiciona B pelo e-mail');
select test.check(public.add_team_member(:'team_t', '  BIA@Operator.test ') = 'already_member', 'e-mail repetido (maiúsculas/espaços) não duplica');
select test.check(public.add_team_member(:'team_t', 'ninguem@operator.test') = 'not_found', 'e-mail sem conta: not_found');
select test.check((select count(*) from public.list_team_members(:'team_t')) = 2, 'A lista 2 membros');
select test.check((select email from public.list_team_members(:'team_t') where role = 'owner') = 'ana@operator.test', 'lista traz o e-mail da dona');
select test.fails(format($$select public.add_team_member(%L, 'caio@operator.test')$$, :'team_c'), 'not_team_owner', 'A não adiciona gente no time de C');
select test.fails(format($$insert into public.team_members (team_id, user_id) values (%L, %L)$$, :'team_t', :'C'), 'row-level security', 'ninguém insere membro direto na tabela');
select test.fails($$insert into public.teams (name, created_by) values ('x', auth.uid())$$, 'row-level security', 'ninguém cria time direto na tabela');

reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select test.fails(format($$select public.add_team_member(%L, 'caio@operator.test')$$, :'team_t'), 'not_team_owner', 'B (membro) não adiciona ninguém');
select test.check((select count(*) from public.list_team_members(:'team_t')) = 2, 'B vê os membros do time');
select test.check(test.affected(format($$update public.team_members set role = 'owner' where team_id = %L and user_id = auth.uid()$$, :'team_t')) = 0, 'B não se promove a dona');
select test.check(test.affected(format($$update public.teams set name = 'Meu' where id = %L$$, :'team_t')) = 0, 'B não renomeia o time');
select test.check(test.affected(format($$delete from public.teams where id = %L$$, :'team_t')) = 0, 'B não apaga o time');

reset role;
select set_config('request.jwt.claim.sub', :'C', false);
set role authenticated;
select test.fails(format($$select * from public.list_team_members(%L)$$, :'team_t'), 'not_team_member', 'C não lista membros de um time alheio');
select test.check((select count(*) from public.team_members where team_id = :'team_t') = 0, 'C não vê os membros pela tabela');

-- Compartilhar projeto ---------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check(test.affected(format($$update public.projects set team_id = %L where id = 'p1' and user_id = auth.uid()$$, :'team_t')) = 1, 'A compartilha p1 com o time');
select test.fails(format($$update public.projects set team_id = %L where id = 'p2' and user_id = auth.uid()$$, :'team_c'), 'not_team_member', 'A não compartilha com time do qual não faz parte');
select test.fails(format($$insert into public.projects (id, user_id, title, slug, team_id) values ('p9', auth.uid(), 'x', 'x', %L)$$, :'team_c'), 'not_team_member', 'nem criando o projeto já no time alheio');

-- B (membro) usa o projeto do time
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select test.check((select count(*) from public.projects where id = 'p1') = 1, 'B vê o projeto compartilhado');
select test.check((select count(*) from public.projects where id = 'p2') = 0, 'B não vê o projeto pessoal da A');
select (select version from public.projects where id = 'p1') as v0 \gset
select test.check(test.affected($$update public.projects set title = 'Editado pela B' where id = 'p1'$$) = 1, 'B edita o projeto do time');
select test.check((select version from public.projects where id = 'p1') = :v0 + 1, 'version sobe a cada alteração');
select test.check((select updated_by from public.projects where id = 'p1') = :'B', 'updated_by mostra quem editou');
select test.check(test.affected(format($$update public.projects set title = 'velha' where id = 'p1' and version = %s$$, :v0)) = 0, 'salvar com version antiga não sobrescreve (edição simultânea)');
select test.fails($$update public.projects set team_id = null where id = 'p1'$$, 'only_project_owner_can_share|row-level security', 'B não descompartilha');
select test.fails(format($$update public.projects set team_id = %L where id = 'p1'$$, :'team_c'), 'only_project_owner_can_share|row-level security', 'B não move para outro time');
select test.fails(format($$update public.projects set user_id = %L where id = 'p1'$$, :'B'), 'project_owner_or_id_change_not_allowed', 'B não toma o projeto para si');
select test.fails($$update public.projects set id = 'outro' where id = 'p1'$$, 'project_owner_or_id_change_not_allowed', 'B não troca o id');
select test.check(test.affected($$delete from public.projects where id = 'p1'$$) = 0, 'B não apaga o projeto do time');
select test.check((select version from public.projects where id = 'p1') = :v0 + 1, 'version não pode ser forçada pelo app');
update public.projects set version = 0 where id = 'p1';
select test.check((select version from public.projects where id = 'p1') = :v0 + 2, 'version enviada é ignorada (gatilho incrementa)');

-- C (de fora) não alcança nada
reset role;
select set_config('request.jwt.claim.sub', :'C', false);
set role authenticated;
select test.check((select count(*) from public.projects where id in ('p1', 'p2')) = 0, 'C não vê projetos do time nem da A');
select test.check(test.affected($$update public.projects set title = 'hack' where id = 'p1'$$) = 0, 'C não edita o projeto do time');
select test.fails(format($$insert into public.projects (id, user_id, title, slug) values ('p1', %L, 'hack', 'x')$$, :'A'), 'row-level security', 'C não grava em nome da A');

-- Anexos -----------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
insert into storage.objects (bucket_id, name) values ('project-attachments', :'A' || '/p1/foto-da-bia.png');
select test.check((select count(*) from storage.objects where name = :'A' || '/p1/foto-da-bia.png') = 1, 'B envia anexo para o projeto do time (pasta da dona)');
select test.fails(format($$insert into storage.objects (bucket_id, name) values ('project-attachments', %L)$$, :'A' || '/p2/x.png'), 'row-level security', 'B não envia para projeto pessoal da A');
insert into storage.objects (bucket_id, name) values ('project-attachments', :'B' || '/pb/meu.png');

reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check((select count(*) from storage.objects where name = :'A' || '/p1/foto-da-bia.png') = 1, 'A vê o anexo que a B enviou');
select test.check((select count(*) from storage.objects where name = :'B' || '/pb/meu.png') = 0, 'A não vê arquivos pessoais da B');

reset role;
select set_config('request.jwt.claim.sub', :'C', false);
set role authenticated;
select test.check((select count(*) from storage.objects) = 0, 'C não vê nenhum anexo');
select test.fails(format($$insert into storage.objects (bucket_id, name) values ('project-attachments', %L)$$, :'A' || '/p1/hack.png'), 'row-level security', 'C não envia para o projeto do time');
select test.check(test.affected(format($$delete from storage.objects where name = %L$$, :'A' || '/p1/foto-da-bia.png')) = 0, 'C não apaga anexo do time');

-- Sair e remover do time ---------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
insert into public.projects (id, user_id, title, slug) values ('pb', :'B', 'Projeto da B', 'pb');
select test.check(test.affected(format($$update public.projects set team_id = %L where id = 'pb'$$, :'team_t')) = 1, 'B compartilha o próprio projeto com o time');
select test.check(test.affected(format($$delete from public.team_members where team_id = %L and user_id = %L$$, :'team_t', :'A')) = 0, 'B não remove a dona');

reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check((select count(*) from public.projects where id = 'pb') = 1, 'A vê o projeto que a B compartilhou');
select test.check(test.affected(format($$delete from public.team_members where team_id = %L and user_id = auth.uid()$$, :'team_t')) = 0, 'a dona não sai do time (apaga o time)');
select test.check(test.affected(format($$delete from public.team_members where team_id = %L and user_id = %L$$, :'team_t', :'B')) = 1, 'A remove a B');
select test.check((select count(*) from public.projects where id = 'pb') = 0, 'projeto da B some para a A');

reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select test.check((select team_id from public.projects where id = 'pb') is null, 'projeto da B volta a ser pessoal dela');
select test.check((select count(*) from public.projects where id = 'p1') = 0, 'B removida não vê mais o projeto do time');
select test.check((select count(*) from storage.objects where name = :'A' || '/p1/foto-da-bia.png') = 0, 'B removida não vê mais os anexos do time');

-- B volta, sai por conta própria
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check(public.add_team_member(:'team_t', 'bia@operator.test') = 'added', 'A adiciona a B de novo');
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select test.check(test.affected(format($$delete from public.team_members where team_id = %L and user_id = auth.uid()$$, :'team_t')) = 1, 'B sai do time');
select test.check((select count(*) from public.projects where id = 'p1') = 0, 'depois de sair, B não vê o projeto');

-- Apagar o time --------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check(public.add_team_member(:'team_t', 'bia@operator.test') = 'added', 'B volta mais uma vez');
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select test.check(test.affected(format($$update public.projects set team_id = %L where id = 'pb'$$, :'team_t')) = 1, 'B compartilha pb de novo');
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.check(test.affected(format($$delete from public.teams where id = %L$$, :'team_t')) = 1, 'A apaga o time');
select test.check((select team_id from public.projects where id = 'p1') is null, 'p1 volta a ser pessoal da A');
select test.check((select count(*) from public.team_members where team_id = :'team_t') = 0, 'membros do time apagado somem');
reset role;
select set_config('request.jwt.claim.sub', :'B', false);
set role authenticated;
select test.check((select team_id from public.projects where id = 'pb') is null, 'pb volta a ser pessoal da B');

-- O sync pessoal de hoje (upsert por user_id,id) continua funcionando -----------------------
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
insert into public.projects (id, user_id, title, slug, updated_at) values ('p2', :'A', 'Pessoal editado', 'p2', 123)
  on conflict (user_id, id) do update set title = excluded.title, updated_at = excluded.updated_at;
select test.check((select title from public.projects where id = 'p2') = 'Pessoal editado', 'upsert do sync pessoal continua funcionando');
insert into public.projects (id, user_id, title, slug) values ('proj-nebu-relay', :'A', 'Exemplo da A', 'x');
reset role;
select set_config('request.jwt.claim.sub', :'C', false);
set role authenticated;
insert into public.projects (id, user_id, title, slug) values ('proj-nebu-relay', :'C', 'Exemplo do C', 'x')
  on conflict (user_id, id) do update set title = excluded.title;
select test.check((select title from public.projects where id = 'proj-nebu-relay') = 'Exemplo do C', 'mesmo id de exemplo em contas diferentes (correção do PR #7)');

-- Rodar schema.sql de novo não desliga as proteções ----------------------------------------
reset role;
select set_config('request.jwt.claim.sub', '', false);
\i supabase/schema.sql
select set_config('request.jwt.claim.sub', :'C', false);
set role authenticated;
select public.create_team('Outro') as team_x \gset
select test.check(test.affected(format($$update public.projects set team_id = %L where id = 'p1'$$, :'team_x')) = 0, 'depois de rodar schema.sql de novo, C continua sem alcançar p1');
reset role;
select set_config('request.jwt.claim.sub', :'A', false);
set role authenticated;
select test.fails(format($$update public.projects set team_id = %L where id = 'p1'$$, :'team_x'), 'not_team_member', 'depois de rodar schema.sql de novo, A continua sem poder compartilhar com time alheio');
reset role;

\o
\echo 'TODOS OS TESTES DOS TIMES PASSARAM'
