-- Alas Grises · permite al admin borrar una cuenta.
-- Ejecutar en el editor SQL del proyecto frmvwqougxvsfygslbbv.

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

revoke all on function public.delete_clan_user(uuid) from public, anon;
grant execute on function public.delete_clan_user(uuid) to authenticated;

notify pgrst, 'reload schema';
