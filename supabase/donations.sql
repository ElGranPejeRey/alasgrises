insert into public.site_settings (key, value)
values ('paypal_url', '')
on conflict (key) do nothing;
