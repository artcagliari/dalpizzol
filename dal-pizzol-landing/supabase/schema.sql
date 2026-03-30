-- Estrutura inicial para cadastro de imoveis com fotos no Supabase
-- Execute no SQL Editor do Supabase.

create table if not exists public.imoveis_local (
  id uuid primary key,
  created_at bigint not null,
  title text not null,
  price text not null,
  location text not null,
  description text,
  property_type text,
  listing_kind text check (listing_kind in ('aluguel', 'venda')),
  price_label text,
  area text,
  bedrooms int,
  bathrooms int,
  parking int,
  suites int,
  features text[],
  page_link text,
  image_paths text[] not null default '{}'
);

alter table public.imoveis_local enable row level security;

-- Ajuste as politicas conforme sua estrategia de autenticacao.
-- Politica aberta para ambiente de desenvolvimento:
drop policy if exists "Dev read imoveis_local" on public.imoveis_local;
create policy "Dev read imoveis_local"
on public.imoveis_local
for select
to anon
using (true);

drop policy if exists "Dev insert imoveis_local" on public.imoveis_local;
create policy "Dev insert imoveis_local"
on public.imoveis_local
for insert
to anon
with check (true);

drop policy if exists "Dev delete imoveis_local" on public.imoveis_local;
create policy "Dev delete imoveis_local"
on public.imoveis_local
for delete
to anon
using (true);

insert into storage.buckets (id, name, public)
values ('imoveis-fotos', 'imoveis-fotos', false)
on conflict (id) do nothing;

-- Politicas Storage (bucket imoveis-fotos) para desenvolvimento:
drop policy if exists "Dev read imoveis-fotos" on storage.objects;
create policy "Dev read imoveis-fotos"
on storage.objects
for select
to anon
using (bucket_id = 'imoveis-fotos');

drop policy if exists "Dev insert imoveis-fotos" on storage.objects;
create policy "Dev insert imoveis-fotos"
on storage.objects
for insert
to anon
with check (bucket_id = 'imoveis-fotos');

drop policy if exists "Dev delete imoveis-fotos" on storage.objects;
create policy "Dev delete imoveis-fotos"
on storage.objects
for delete
to anon
using (bucket_id = 'imoveis-fotos');

