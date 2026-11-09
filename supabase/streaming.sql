-- Alas Grises · tabla de streaming.
-- Ejecutar en el editor SQL del proyecto frmvwqougxvsfygslbbv.

create table if not exists public.streamers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  twitch_login text not null,
  twitch_url text not null,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint streamers_name_len check (char_length(name) between 2 and 40),
  constraint streamers_login_chk check (twitch_login ~ '^[a-z0-9_]{3,25}$'),
  constraint streamers_login_unique unique (twitch_login)
);

create index if not exists streamers_order_idx on public.streamers (published, sort_order, created_at);

alter table public.streamers enable row level security;

revoke all on table public.streamers from anon, authenticated;
grant select on table public.streamers to anon, authenticated;
grant insert, update, delete on table public.streamers to authenticated;

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

do $$
begin
  alter publication supabase_realtime add table public.streamers;
exception
  when duplicate_object then null;
end $$;

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

notify pgrst, 'reload schema';
