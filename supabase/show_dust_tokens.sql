alter table public.profiles
  add column if not exists show_dust_tokens boolean not null default false;
