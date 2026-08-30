-- Security hardening from the Supabase advisor.
-- Trigger and event-trigger functions do NOT require EXECUTE privilege to fire,
-- so revoking it closes their needless PostgREST RPC surface without affecting
-- signup provisioning or DDL RLS auto-enable.

-- Pin our trigger function's search_path (now() resolves via implicit pg_catalog).
alter function public.set_updated_at() set search_path = '';

-- Our signup-provisioning trigger function should not be callable via /rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Tidy prior-iteration functions if present (safe no-ops on a fresh database).
do $$
begin
  if to_regprocedure('public.update_updated_at()') is not null then
    drop function public.update_updated_at();
  end if;
  if to_regprocedure('public.auto_confirm_email()') is not null then
    revoke execute on function public.auto_confirm_email() from public, anon, authenticated;
  end if;
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
