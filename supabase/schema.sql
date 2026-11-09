-- Alas Grises · esquema de Supabase
-- Ejecutar completo en el editor SQL del proyecto frmvwqougxvsfygslbbv.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  avatar_url text not null default '',
  d4_class text not null default '',
  battletag text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.profiles add column if not exists d4_class text not null default '';
alter table public.profiles add column if not exists battletag text not null default '';

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'General',
  file_path text not null,
  file_name text not null,
  file_size bigint not null default 0,
  downloads integer not null default 0,
  published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  youtube_id text,
  video_url text,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  constraint videos_source_chk check (youtube_id is not null or video_url is not null)
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chat_body_len check (char_length(body) between 1 and 2000)
);

create index if not exists guides_published_idx on public.guides (published, created_at desc);
create index if not exists videos_order_idx on public.videos (sort_order, created_at);
create index if not exists chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_count integer;
begin
  select count(*) into user_count from public.profiles;
  insert into public.profiles (id, email, username, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(coalesce(new.email, 'cazador'), '@', 1)),
    case when user_count = 0 then 'admin' else 'user' end
  );
  return new;
end;
$$;

create or replace function public.protect_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if old.role = 'admin' and new.role is distinct from 'admin' then
    if (select count(*) from public.profiles where role = 'admin' and id <> old.id) = 0 then
      raise exception 'debe quedar al menos un administrador';
    end if;
  end if;
  if not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create or replace function public.chat_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() and auth.uid() = old.sender_id then
    raise exception 'no puedes editar ese mensaje';
  end if;
  new.id := old.id;
  new.body := old.body;
  new.sender_id := old.sender_id;
  new.conversation_id := old.conversation_id;
  new.created_at := old.created_at;
  return new;
end;
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
  update public.guides
  set downloads = downloads + 1
  where id = guide_id and published = true;
end;
$$;

create or replace function public.confirm_email_on_signup()
returns trigger
language plpgsql
security definer
set search_path = auth, public
as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists confirm_email_on_signup on auth.users;
create trigger confirm_email_on_signup
  before insert on auth.users
  for each row execute function public.confirm_email_on_signup();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

drop trigger if exists chat_touch_conversation on public.chat_messages;
create trigger chat_touch_conversation
  after insert on public.chat_messages
  for each row execute function public.touch_conversation();

drop trigger if exists chat_guard_update on public.chat_messages;
create trigger chat_guard_update
  before update on public.chat_messages
  for each row execute function public.chat_update_guard();

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.guides enable row level security;
alter table public.videos enable row level security;
alter table public.contact_messages enable row level security;
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.guides from anon, authenticated;
revoke all on table public.videos from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert, update, delete on table public.site_settings to authenticated;
grant select (id, title, description, category, file_name, file_size, downloads, published, created_at)
  on table public.guides to anon;
grant select, insert, update, delete on table public.guides to authenticated;
grant select on table public.videos to anon, authenticated;
grant insert, update, delete on table public.videos to authenticated;
grant insert on table public.contact_messages to anon, authenticated;
grant select, update, delete on table public.contact_messages to authenticated;
grant select, insert, update on table public.conversations to authenticated;
grant select, insert, update on table public.chat_messages to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.increment_downloads(uuid) to authenticated;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "settings_read" on public.site_settings;
create policy "settings_read" on public.site_settings
  for select to anon, authenticated
  using (true);

drop policy if exists "settings_write" on public.site_settings;
create policy "settings_write" on public.site_settings
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "settings_update" on public.site_settings;
create policy "settings_update" on public.site_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "guides_read" on public.guides;
create policy "guides_read" on public.guides
  for select to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "guides_insert" on public.guides;
create policy "guides_insert" on public.guides
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "guides_update" on public.guides;
create policy "guides_update" on public.guides
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "guides_delete" on public.guides;
create policy "guides_delete" on public.guides
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "videos_read" on public.videos;
create policy "videos_read" on public.videos
  for select to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "videos_insert" on public.videos;
create policy "videos_insert" on public.videos
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "videos_update" on public.videos;
create policy "videos_update" on public.videos
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "videos_delete" on public.videos;
create policy "videos_delete" on public.videos
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "contact_insert" on public.contact_messages;
create policy "contact_insert" on public.contact_messages
  for insert to anon, authenticated
  with check (
    char_length(name) between 2 and 80
    and char_length(email) between 5 and 160
    and position('@' in email) > 1
    and char_length(message) between 10 and 2000
  );

drop policy if exists "contact_admin_read" on public.contact_messages;
create policy "contact_admin_read" on public.contact_messages
  for select to authenticated
  using (public.is_admin());

drop policy if exists "contact_admin_update" on public.contact_messages;
create policy "contact_admin_update" on public.contact_messages
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "contact_admin_delete" on public.contact_messages;
create policy "contact_admin_delete" on public.contact_messages
  for delete to authenticated
  using (public.is_admin());

drop policy if exists "conversations_read" on public.conversations;
create policy "conversations_read" on public.conversations
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert" on public.conversations
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "conversations_update" on public.conversations;
create policy "conversations_update" on public.conversations
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "chat_read" on public.chat_messages;
create policy "chat_read" on public.chat_messages
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "chat_insert" on public.chat_messages;
create policy "chat_insert" on public.chat_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and char_length(body) between 1 and 2000
    and (
      public.is_admin()
      or exists (
        select 1 from public.conversations c
        where c.id = conversation_id and c.user_id = auth.uid()
      )
    )
  );

drop policy if exists "chat_update" on public.chat_messages;
create policy "chat_update" on public.chat_messages
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('guides', 'guides', false)
on conflict (id) do update set public = false;

drop policy if exists "guides_storage_read" on storage.objects;
create policy "guides_storage_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'guides');

drop policy if exists "guides_storage_insert" on storage.objects;
create policy "guides_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'guides' and public.is_admin());

drop policy if exists "guides_storage_update" on storage.objects;
create policy "guides_storage_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'guides' and public.is_admin())
  with check (bucket_id = 'guides' and public.is_admin());

drop policy if exists "guides_storage_delete" on storage.objects;
create policy "guides_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'guides' and public.is_admin());

do $$
declare
  t text;
begin
  foreach t in array array['chat_messages', 'conversations', 'guides', 'videos', 'site_settings', 'contact_messages']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

insert into public.site_settings (key, value) values
  ('hero_kicker', 'Gremio de Diablo IV'),
  ('hero_title', 'ALAS GRISES'),
  ('hero_subtitle', 'Ceniza, acero y una hermandad que no suelta la espada.'),
  ('about_title', 'Una comunidad, una historia y un mismo destino.'),
  ('about_text', $about$Bienvenidos, viajeros, guerreros y aventureros.

Alas Grises nace como un espacio para quienes comparten la pasión por los mundos de fantasía, las grandes batallas y las aventuras que hacen de cada partida una experiencia memorable.

Somos una comunidad de jugadores que busca mucho más que conquistar desafíos: queremos compartir experiencias, aprender unos de otros, formar nuevas amistades y construir un lugar donde todos puedan sentirse parte de algo.

Creemos que un buen gremio no se mide únicamente por su poder, nivel o logros, sino también por las personas que lo conforman. Por eso, promovemos el respeto, la colaboración, la buena convivencia y el compañerismo.

Aquí cada integrante tiene un lugar, cada aporte cuenta y siempre habrá alguien dispuesto a echar una mano. No importa si eres un veterano de mil batallas o si recién comienzas tu aventura: lo importante es tener ganas de compartir y disfrutar el camino.$about$),
  ('contact_email', ''),
  ('discord_url', ''),
  ('footer_text', 'La ceniza cubre el filo, no el pacto. Santuario no perdona, y nosotros no nos soltamos.'),
  ('staff_intro', $staffintro$Detrás de cada gran comunidad existe un grupo de personas que dedica tiempo, esfuerzo y compromiso para mantenerla viva.

Nuestro equipo de liderazgo y Staff tiene la misión de orientar, organizar, apoyar a los integrantes y velar por el buen funcionamiento de Alas Grises.

A continuación, conocerás a las personas que forman parte de nuestro equipo y que trabajan día a día para hacer crecer esta comunidad.$staffintro$),
  ('staff_members', $staff$Consejo | Dirección | Cuida el rumbo del gremio y que cada persona tenga un lugar.
Oficiales | Organización | Acompañan las partidas, comparten conocimiento y ayudan a quien empieza.
Moderación | Convivencia | Sostiene el respeto y no deja espacio para la toxicidad.$staff$)
on conflict (key) do nothing;

insert into public.videos (title, description, youtube_id, sort_order, published)
select title, description, youtube_id, sort_order, published
from (
  values
    ('Cinemática de anuncio'::text, 'El regreso que partió Santuario. Tráiler oficial.'::text, '0SSYzl9fXOQ'::text, 1, true),
    ('Fecha de lanzamiento'::text, 'Inarius y el filo del cielo. Cinemática oficial.'::text, 'Ro26B394ZBM'::text, 2, true),
    ('Lord of Hatred'::text, 'El odio tiene señor. Cinemática oficial de la expansión.'::text, 'Gpaz0etTqJw'::text, 3, true)
) as seed(title, description, youtube_id, sort_order, published)
where not exists (select 1 from public.videos);

notify pgrst, 'reload schema';
