-- ==============================================================================
-- OPERATOR // MATRIX WORKSPACE - SUPABASE STORAGE (ANEXOS PRIVADOS)
-- ==============================================================================
-- Cole este script no SQL Editor do Supabase e clique em "RUN".
-- Pode ser executado mais de uma vez sem problema.
--
-- IMPORTANTE: rode somente DEPOIS que a versão do app com URLs assinadas estiver
-- publicada. Versões antigas usam a URL pública e deixariam de abrir os arquivos.
-- ==============================================================================

-- 1. Bucket privado com limite de 50 MB por arquivo (máximo do plano grátis).
--    Se o bucket já existir (público), ele passa a ser privado.
insert into storage.buckets (id, name, public, file_size_limit)
values ('project-attachments', 'project-attachments', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = 52428800;

-- 2. Políticas: cada usuário só acessa a própria pasta (<user_id>/<project_id>/arquivo).
drop policy if exists "Users upload own attachments" on storage.objects;
drop policy if exists "Users update own attachments" on storage.objects;
drop policy if exists "Users delete own attachments" on storage.objects;
drop policy if exists "Users read own attachments" on storage.objects;

create policy "Users read own attachments"
on storage.objects for select to authenticated
using (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users upload own attachments"
on storage.objects for insert to authenticated
with check (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own attachments"
on storage.objects for update to authenticated
using (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own attachments"
on storage.objects for delete to authenticated
using (bucket_id = 'project-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- ==============================================================================
-- PRONTO! Os anexos agora só abrem para o dono, por links temporários (1 hora).
-- ==============================================================================
