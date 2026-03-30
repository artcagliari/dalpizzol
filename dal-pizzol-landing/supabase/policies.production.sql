-- Politicas de exemplo para producao (requer autenticacao Supabase Auth).
-- Execute depois de definir seu fluxo de login.

alter table public.imoveis_local
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.imoveis_local
  alter column owner_id set default auth.uid();

create index if not exists idx_imoveis_local_owner_id on public.imoveis_local(owner_id);

alter table public.imoveis_local enable row level security;

-- Limpa politicas de dev, se existirem:
drop policy if exists "Dev read imoveis_local" on public.imoveis_local;
drop policy if exists "Dev insert imoveis_local" on public.imoveis_local;
drop policy if exists "Dev delete imoveis_local" on public.imoveis_local;

drop policy if exists "Prod read own imoveis_local" on public.imoveis_local;
create policy "Prod read own imoveis_local"
on public.imoveis_local
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "Prod insert own imoveis_local" on public.imoveis_local;
create policy "Prod insert own imoveis_local"
on public.imoveis_local
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "Prod delete own imoveis_local" on public.imoveis_local;
create policy "Prod delete own imoveis_local"
on public.imoveis_local
for delete
to authenticated
using (owner_id = auth.uid());

-- Storage (bucket imoveis-fotos)
-- O path deve comecar com "<auth.uid()>/", ex.: "0000.../imovel-id/0-uuid.jpg".
drop policy if exists "Dev read imoveis-fotos" on storage.objects;
drop policy if exists "Dev insert imoveis-fotos" on storage.objects;
drop policy if exists "Dev delete imoveis-fotos" on storage.objects;

drop policy if exists "Prod read own imoveis-fotos" on storage.objects;
create policy "Prod read own imoveis-fotos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'imoveis-fotos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Prod insert own imoveis-fotos" on storage.objects;
create policy "Prod insert own imoveis-fotos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'imoveis-fotos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Prod delete own imoveis-fotos" on storage.objects;
create policy "Prod delete own imoveis-fotos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'imoveis-fotos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

