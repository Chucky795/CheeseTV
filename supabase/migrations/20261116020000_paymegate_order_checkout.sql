-- Branded order checkout (paymegate-checkout edge function). Applied 2026-11-15 PT.
-- The PayMeGate API key was stored in Vault as 'paymegate_api_key' through a temporary nonce-locked function
-- (dropped right after). Nothing secret is in this file. pmg_secrets() stays service_role only.
create or replace function public.pmg_secrets() returns json language sql security definer set search_path=public as $$
 select json_build_object('webhook',(select decrypted_secret from vault.decrypted_secrets where name='paymegate_webhook_secret'),
  'api',(select decrypted_secret from vault.decrypted_secrets where name='paymegate_api_key'));
$$;
revoke all on function public.pmg_secrets() from public, anon, authenticated;
grant execute on function public.pmg_secrets() to service_role;
