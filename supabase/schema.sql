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

create table if not exists public.streamers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null default 'twitch',
  twitch_login text not null,
  twitch_url text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint streamers_name_len check (char_length(name) between 2 and 40),
  constraint streamers_platform_chk check (platform in ('twitch', 'kick', 'youtube')),
  constraint streamers_login_chk check (twitch_login ~ '^[A-Za-z0-9_.-]{2,80}$'),
  constraint streamers_platform_login_unique unique (platform, twitch_login)
);

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

create table if not exists public.avatars (
  slug text primary key,
  class_name text not null,
  title text not null,
  image_path text not null,
  sort_order integer not null default 0
);

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
create index if not exists streamers_order_idx on public.streamers (published, sort_order, created_at);
create index if not exists photos_order_idx on public.photos (published, sort_order, created_at);
create index if not exists user_permissions_slug_idx on public.user_permissions (permission_slug);
alter table public.user_permissions replica identity full;
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

create or replace function public.delete_clan_user(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'no autorizado';
  end if;
  if target_id = auth.uid() then
    raise exception 'no puedes eliminarte a ti mismo';
  end if;
  if not exists (select 1 from public.profiles where id = target_id) then
    raise exception 'ese usuario no existe';
  end if;
  if (select role from public.profiles where id = target_id) = 'admin'
     and (select count(*) from public.profiles where role = 'admin' and id <> target_id) = 0 then
    raise exception 'debe quedar al menos un administrador';
  end if;
  delete from auth.users where id = target_id;
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
  if not public.is_admin() and not public.has_permission('alasgrises') then
    raise exception 'sin permiso';
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
alter table public.streamers enable row level security;
alter table public.photos enable row level security;
alter table public.avatars enable row level security;
alter table public.permissions enable row level security;
alter table public.user_permissions enable row level security;
alter table public.contact_messages enable row level security;
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.site_settings from anon, authenticated;
revoke all on table public.guides from anon, authenticated;
revoke all on table public.videos from anon, authenticated;
revoke all on table public.streamers from anon, authenticated;
revoke all on table public.photos from anon, authenticated;
revoke all on table public.avatars from anon, authenticated;
revoke all on table public.permissions from anon, authenticated;
revoke all on table public.user_permissions from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.conversations from anon, authenticated;
revoke all on table public.chat_messages from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select on table public.site_settings to anon, authenticated;
grant insert, update, delete on table public.site_settings to authenticated;
grant select, insert, update, delete on table public.guides to authenticated;
grant select on table public.videos to anon, authenticated;
grant insert, update, delete on table public.videos to authenticated;
grant select on table public.streamers to anon, authenticated;
grant insert, update, delete on table public.streamers to authenticated;
grant select on table public.photos to anon, authenticated;
grant insert, update, delete on table public.photos to authenticated;
grant select on table public.avatars to anon, authenticated;
grant select on table public.permissions to authenticated;
grant select, insert, delete on table public.user_permissions to authenticated;
grant insert on table public.contact_messages to anon, authenticated;
grant select, update, delete on table public.contact_messages to authenticated;
grant select, insert, update on table public.conversations to authenticated;
grant select, insert, update on table public.chat_messages to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.increment_downloads(uuid) to authenticated;
revoke all on function public.delete_clan_user(uuid) from public, anon;
grant execute on function public.delete_clan_user(uuid) to authenticated;

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
  for select to authenticated
  using (
    public.is_admin()
    or (published = true and public.has_permission('alasgrises'))
  );

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

drop policy if exists "streamers_read" on public.streamers;
create policy "streamers_read" on public.streamers
  for select to anon, authenticated
  using (published = true or public.is_admin());

drop policy if exists "streamers_insert" on public.streamers;
create policy "streamers_insert" on public.streamers
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "streamers_update" on public.streamers;
create policy "streamers_update" on public.streamers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "streamers_delete" on public.streamers;
create policy "streamers_delete" on public.streamers
  for delete to authenticated
  using (public.is_admin());

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

drop policy if exists "avatars_read" on public.avatars;
create policy "avatars_read" on public.avatars
  for select to anon, authenticated
  using (true);

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

insert into public.permissions (slug, name, description)
values ('alasgrises', 'AlasGrises', 'Permite ver y reproducir las guías del clan.')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description;

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
  using (
    bucket_id = 'guides'
    and (public.is_admin() or public.has_permission('alasgrises'))
  );

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
declare
  t text;
begin
  foreach t in array array['chat_messages', 'conversations', 'guides', 'videos', 'streamers', 'photos', 'site_settings', 'contact_messages', 'user_permissions']
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
Moderación | Convivencia | Sostiene el respeto y no deja espacio para la toxicidad.$staff$),
  ('about_quote', 'Lo importante es tener ganas de compartir y disfrutar el camino.'),
  ('philosophy_title', '🛡️ Nuestra filosofía'),
  ('philosophy_items', $philosophy$Respeto | Tratamos a todos con cordialidad, sin importar su experiencia o nivel.
Compañerismo | Nos apoyamos, compartimos conocimientos y avanzamos juntos.
Colaboración | Creemos que una comunidad crece cuando todos aportan.
Diversión | Jugamos para disfrutar, no para competir entre nosotros.
Cero toxicidad | No hay espacio para egos, malos tratos ni dramas innecesarios.$philosophy$),
  ('about_pillars', $pillars$Comunidad | Compartimos experiencias, aprendemos unos de otros y formamos nuevas amistades.
Respeto | Promovemos la colaboración, la buena convivencia y el compañerismo.
Compañerismo | Cada integrante tiene un lugar y siempre habrá alguien dispuesto a echar una mano.$pillars$),
  ('staff_title', 'Quienes cuidan el gremio'),
  ('staff_cards', $staffcards$Eryndor Vahl | Líder | Marca el rumbo del gremio y se asegura de que nadie quede fuera.
Maera Sol | Oficial | Organiza las partidas y recibe a quien llega por primera vez.
Kael Dravos | Estratega | Comparte rutas, builds y lo que cada temporada enseña.
Liora Ash | Comunidad | Cuida las amistades y que cada aporte tenga un lugar.
Thorne Vale | Moderación | Sostiene el respeto y no deja espacio para la toxicidad.$staffcards$),
  ('videos_title', 'El archivo del clan'),
  ('videos_text', 'Cinemáticas y piezas que el consejo deja en el carrusel. Pasa las alas, no te quedes en una sola llama.'),
  ('guides_title', 'El grimorio abierto'),
  ('guides_text', 'Las guías del gremio están en video. Sin cuenta se ve la ficha; el video completo se abre al registrarse.'),
  ('contact_title', 'Habla con el consejo'),
  ('contact_text', 'Escribe desde aquí si todavía no tienes cuenta. Quienes ya están en el gremio también pueden dejar un mensaje directo en el chat.'),
  ('streaming_title', 'En vivo en Twitch'),
  ('streaming_text', 'Los cazadores que transmiten aparecen aquí. El botón verde abre la transmisión; el rojo indica que están fuera de línea.'),
  ('photos_title', 'El álbum del clan'),
  ('photos_text', 'Las fotos se ven pequeñas. Pulsa una para verla en grande y pasa a la siguiente con las flechas.'),
  ('streamers', ''),
  ('paypal_url', '')
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

insert into public.streamers (name, twitch_login, twitch_url, sort_order)
select
  case when char_length(raw_name) between 2 and 40 then raw_name else twitch_login end,
  twitch_login,
  'https://www.twitch.tv/' || twitch_login,
  row_number() over (order by ord)::integer
from (
  select
    ord,
    left(trim(case when position('|' in line) > 0 then split_part(line, '|', 1) else '' end), 40) as raw_name,
    lower(split_part(split_part(regexp_replace(regexp_replace(
      case when position('|' in line) > 0 then trim(split_part(line, '|', 2)) else line end,
      '^@', ''), '^https?://(www\.)?([^/]*twitch\.tv/)?', '', 'i'), '/', 1), '?', 1)) as twitch_login
  from (
    select trim(item) as line, ordinality as ord
    from public.site_settings as settings
    cross join lateral regexp_split_to_table(coalesce(settings.value, ''), E'\n') with ordinality as pieces(item, ordinality)
    where settings.key = 'streamers'
  ) as lines
  where line <> ''
) as parsed
where twitch_login ~ '^[a-z0-9_]{3,25}$'
  and not exists (
    select 1 from public.streamers as existing where existing.twitch_login = parsed.twitch_login
  );

insert into public.avatars (slug, class_name, title, image_path, sort_order) values
  ('barbaro', 'Bárbaro', 'Bárbaro', '/img/avatars/barbaro.jpg', 1),
  ('hechicero', 'Hechicero', 'Hechicero', '/img/avatars/hechicero.jpg', 2),
  ('brujo', 'Brujo', 'Brujo', '/img/avatars/brujo.jpg', 3),
  ('druida', 'Druida', 'Druida', '/img/avatars/druida.jpg', 4),
  ('nigromante', 'Nigromante', 'Nigromante', '/img/avatars/nigromante.jpg', 5),
  ('picaro', 'Pícaro', 'Pícaro', '/img/avatars/picaro.jpg', 6),
  ('espiritualista', 'Espiritualista', 'Espiritualista', '/img/avatars/espiritualista.jpg', 7),
  ('paladin', 'Paladín', 'Paladín', '/img/avatars/paladin.jpg', 8)
on conflict (slug) do update set
  class_name = excluded.class_name,
  title = excluded.title,
  image_path = excluded.image_path,
  sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
