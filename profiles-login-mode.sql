-- Lightweight no-auth mode for Golfly
-- WARNING: This is intentionally insecure and should only be used for low-risk hobby/internal use.

begin;

create extension if not exists pgcrypto;

-- 1) Add pincode to profiles for surname+pincode login
alter table public.profiles
  add column if not exists pincode text;

update public.profiles
set pincode = coalesce(pincode, '0000')
where pincode is null;

alter table public.profiles
  alter column pincode set not null;

create index if not exists idx_profiles_surname_pincode
  on public.profiles (surname, pincode);

-- 1b) Allow profile-only users by removing auth.users foreign key and adding UUID default
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_id_fkey;
  end if;
end $$;

alter table public.profiles
  alter column id set default gen_random_uuid();

-- 2) Disable RLS so anonymous browser calls can read/write
alter table public.profiles disable row level security;
alter table public.seasons disable row level security;
alter table public.matches disable row level security;
alter table public.match_players disable row level security;

-- 3) Ensure anon/authenticated roles can operate on tables/views
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.profiles to anon, authenticated;
grant select, insert, update, delete on table public.seasons to anon, authenticated;
grant select, insert, update, delete on table public.matches to anon, authenticated;
grant select, insert, update, delete on table public.match_players to anon, authenticated;

grant select on table public.v_match_results to anon, authenticated;
grant select on table public.v_season_leaderboard to anon, authenticated;
grant select on table public.v_default_season_leaderboard to anon, authenticated;

grant usage, select on all sequences in schema public to anon, authenticated;

commit;
