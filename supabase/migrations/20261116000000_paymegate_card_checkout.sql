-- PayMeGate card checkout (prepared, NOT applied).
-- 1) card_checkouts: what the customer typed on signup/renew before going to the hosted checkout
--    (the order.paid webhook only carries the email, so this is how a renewal gets its username).
-- 2) paymegate_events: idempotency log for order.paid deliveries.
-- 3) Zelle alert triggers only fire for status 'pending', so a card payment inserted as 'paid'
--    by the webhook doesn't also send the "check Zelle" alert. Zelle inserts are unchanged.

create table if not exists public.card_checkouts(
 id bigint generated always as identity primary key,
 created_at timestamptz not null default now(),
 kind text not null check (kind in ('new','renewal')),
 connections int not null check (connections between 1 and 3),
 amount numeric(6,2) not null,
 email text not null, customer_name text, phone text, device text, username text,
 paid_at timestamptz, order_uuid uuid, signup_id bigint, renewal_id bigint);
create index if not exists card_checkouts_email_idx on public.card_checkouts(lower(email), created_at desc);
alter table public.card_checkouts enable row level security;
revoke all on public.card_checkouts from anon, authenticated;

create table if not exists public.paymegate_events(
 event_id uuid primary key,
 received_at timestamptz not null default now(),
 order_uuid uuid not null, amount numeric(10,2), currency text, customer_email text,
 kind text, connections int, checkout_id bigint, signup_id bigint, renewal_id bigint, payload jsonb not null);
alter table public.paymegate_events enable row level security;
revoke all on public.paymegate_events from anon, authenticated;

create or replace function public.start_card_checkout(p_kind text,p_connections int,p_email text,p_name text default null,
 p_phone text default null,p_device text default null,p_username text default null)
returns json language plpgsql security definer set search_path=public as $$
declare v_amt numeric; v_id bigint; e text:=lower(btrim(coalesce(p_email,''))); n text:=nullif(btrim(coalesce(p_name,'')),'');
 ph text:=nullif(btrim(coalesce(p_phone,'')),''); d text:=nullif(btrim(coalesce(p_device,'')),''); u text:=nullif(btrim(coalesce(p_username,'')),'');
begin
 if p_kind not in ('new','renewal') then raise exception 'Invalid checkout type'; end if;
 if length(e)>120 or e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Please enter a valid email'; end if;
 if n is not null and length(n)>80 then raise exception 'Name is too long'; end if;
 if ph is not null and length(ph)>30 then raise exception 'Phone is too long'; end if;
 if d is not null and length(d)>40 then raise exception 'Device is too long'; end if;
 if p_kind='renewal' and (u is null or length(u) not between 2 and 64) then raise exception 'Please enter your CheeseTV username'; end if;
 if p_kind='new' then u:=null; end if;
 v_amt := case p_connections when 1 then 14.99 when 2 then 19.99 when 3 then 27.99 end;
 if v_amt is null then raise exception 'Please pick 1, 2 or 3 connections'; end if;
 if (select count(*) from card_checkouts where lower(email)=e and created_at>now()-interval '1 hour')>=5
  or (select count(*) from card_checkouts where created_at>now()-interval '10 minutes')>=40
 then raise exception 'Too many requests right now, please try again later'; end if;
 insert into card_checkouts(kind,connections,amount,email,customer_name,phone,device,username)
  values(p_kind,p_connections,v_amt,e,n,ph,d,u) returning id into v_id;
 return json_build_object('id',v_id,'amount',v_amt);
end $$;
revoke all on function public.start_card_checkout(text,int,text,text,text,text,text) from public;
grant execute on function public.start_card_checkout(text,int,text,text,text,text,text) to anon, authenticated;

drop trigger if exists signup_notify on public.signup_requests;
create trigger signup_notify after insert on public.signup_requests for each row
 when (new.status = 'pending') execute function public.notify_signup();
drop trigger if exists renewal_notify on public.renewal_requests;
create trigger renewal_notify after insert on public.renewal_requests for each row
 when (new.status = 'pending') execute function public.notify_renewal();

-- Webhook signing secret lives in Vault as 'paymegate_webhook_secret' (no CLI/management token for function env secrets).
create or replace function public.pmg_secrets() returns json language sql security definer set search_path=public as $$
 select json_build_object('webhook',(select decrypted_secret from vault.decrypted_secrets where name='paymegate_webhook_secret'));
$$;
revoke all on function public.pmg_secrets() from public, anon, authenticated;
grant execute on function public.pmg_secrets() to service_role;

-- Telegram delivery result per event (true when Telegram accepted the alert).
alter table public.paymegate_events add column if not exists alert_ok boolean;
