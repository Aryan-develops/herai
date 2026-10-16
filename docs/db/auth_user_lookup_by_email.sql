-- Applied to the production Supabase project as migration "auth_user_lookup_by_email" (2026-10-16).
-- Looks a sign-up up by email through the unique email index instead of scanning the user list.
-- Service role only: it reveals whether an address has an account, so clients must never be able to call it.
create or replace function public.auth_user_by_email(p_email text)
returns table (id uuid, confirmed boolean, name text)
language sql
security definer
set search_path = ''
stable
as $$
  select u.id, (u.email_confirmed_at is not null) as confirmed, (u.raw_user_meta_data ->> 'name') as name
  from auth.users u
  where u.email = lower(p_email)
  limit 1;
$$;

revoke all on function public.auth_user_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_by_email(text) to service_role;
