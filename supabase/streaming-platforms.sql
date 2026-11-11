alter table public.streamers
  add column if not exists platform text not null default 'twitch';

alter table public.streamers drop constraint if exists streamers_login_chk;
alter table public.streamers drop constraint if exists streamers_login_unique;
alter table public.streamers drop constraint if exists streamers_platform_chk;
alter table public.streamers drop constraint if exists streamers_platform_login_unique;

alter table public.streamers
  add constraint streamers_platform_chk check (platform in ('twitch', 'kick', 'youtube'));

alter table public.streamers
  add constraint streamers_login_chk check (twitch_login ~ '^[A-Za-z0-9_.-]{2,80}$');

alter table public.streamers
  add constraint streamers_platform_login_unique unique (platform, twitch_login);

notify pgrst, 'reload schema';
