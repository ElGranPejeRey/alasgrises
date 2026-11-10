-- Alas Grises · permiso AlasGrises para ver las guías.
-- Ejecutar en el editor SQL del proyecto frmvwqougxvsfygslbbv.

create table if not exists public.permissions (
  slug text primary key,
  name text not null,
  description text not null default ''
);

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_slug text not null references public.permissions (slug) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, permission_slug)
);

create index if not exists user_permissions_slug_idx on public.user_permissions (permission_slug);

alter table public.user_permissions replica identity full;

insert into public.permissions (slug, name, description)
values ('alasgrises', 'AlasGrises', 'Permite ver y reproducir las guías del clan.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

create or replace function public.has_permission(target text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_permissions
    where user_id = auth.uid()
      and permission_slug = target
  );
$$;

create or replace function public.increment_downloads(guide_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_admin() and not public.has_permission('alasgrises') then
    raise exception 'sin permiso';
  end if;
  update public.guides
  set downloads = downloads + 1
  where id = guide_id and published = true;
end;
$$;

alter table public.permissions enable row level security;
alter table public.user_permissions enable row level security;

revoke all on table public.permissions from anon, authenticated;
revoke all on table public.user_permissions from anon, authenticated;
revoke select on table public.guides from anon;

grant select on table public.permissions to authenticated;
grant select, insert, delete on table public.user_permissions to authenticated;
grant execute on function public.has_permission(text) to authenticated;

drop policy if exists "permissions_read" on public.permissions;
create policy "permissions_read" on public.permissions
  for select to authenticated
  using (true);

drop policy if exists "user_permissions_read" on public.user_permissions;
create policy "user_permissions_read" on public.user_permissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "user_permissions_insert" on public.user_permissions;
create policy "user_permissions_insert" on public.user_permissions
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "user_permissions_delete" on public.user_permissions;
create policy "user_permissions_delete" on public.user_permissions
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "guides_read" on public.guides;
create policy "guides_read" on public.guides
  for select to authenticated
  using (
    public.is_admin()
    or (published = true and public.has_permission('alasgrises'))
  );

drop policy if exists "guides_storage_read" on storage.objects;
create policy "guides_storage_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'guides'
    and (public.is_admin() or public.has_permission('alasgrises'))
  );

do $$
begin
  alter publication supabase_realtime add table public.user_permissions;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
