-- Alas Grises · avatares de clase para el perfil.
-- Ejecutar en el editor SQL del proyecto frmvwqougxvsfygslbbv.

create table if not exists public.avatars (
  slug text primary key,
  class_name text not null,
  title text not null,
  image_path text not null,
  sort_order integer not null default 0
);

alter table public.avatars enable row level security;

revoke all on table public.avatars from anon, authenticated;
grant select on table public.avatars to anon, authenticated;

drop policy if exists "avatars_read" on public.avatars;
create policy "avatars_read" on public.avatars
  for select to anon, authenticated
  using (true);

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
