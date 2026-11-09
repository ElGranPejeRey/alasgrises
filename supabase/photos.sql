-- Alas Grises · galería de fotos.
-- Ejecutar en el editor SQL del proyecto frmvwqougxvsfygslbbv.

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  caption text not null default '',
  storage_path text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint photos_title_len check (char_length(title) <= 80),
  constraint photos_caption_len check (char_length(caption) <= 240)
);

create index if not exists photos_order_idx on public.photos (published, sort_order, created_at);

alter table public.photos enable row level security;

revoke all on table public.photos from anon, authenticated;
grant select on table public.photos to anon, authenticated;
grant insert, update, delete on table public.photos to authenticated;

drop policy if exists "photos_read" on public.photos;
create policy "photos_read" on public.photos
  for select to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "photos_insert" on public.photos;
create policy "photos_insert" on public.photos
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "photos_update" on public.photos;
create policy "photos_update" on public.photos
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "photos_delete" on public.photos;
create policy "photos_delete" on public.photos
  for delete to authenticated
  using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos_storage_read" on storage.objects;
create policy "photos_storage_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'photos');

drop policy if exists "photos_storage_insert" on storage.objects;
create policy "photos_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos_storage_update" on storage.objects;
create policy "photos_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos_storage_delete" on storage.objects;
create policy "photos_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());

do $$
begin
  alter publication supabase_realtime add table public.photos;
exception
  when duplicate_object then null;
end $$;

insert into public.site_settings (key, value) values
  ('photos_title', 'El álbum del clan'),
  ('photos_text', 'Las fotos se ven pequeñas. Pulsa una para verla en grande y pasa a la siguiente con las flechas.')
on conflict (key) do nothing;

notify pgrst, 'reload schema';
