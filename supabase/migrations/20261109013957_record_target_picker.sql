-- UNAPPLIED CANDIDATE v2. Separate server/app approval required.
-- Account key remains a sensitive bearer capability, NOT verified Supabase user membership.
-- Receiver identity is server-assigned and bound to a random 256-bit device credential.
-- Account-capability holders may enroll NEW identities; they cannot take over existing ones.
-- Existing account-wide jobs remain legacy-compatible; new clients never create them.
alter table sync.remote_jobs add column if not exists target_device_id text;
alter table sync.remote_jobs add column if not exists target_device_name text;
alter table sync.remote_jobs add column if not exists request_id uuid;
alter table sync.remote_jobs add column if not exists accepted_at timestamptz;
create unique index if not exists remote_jobs_request_id on sync.remote_jobs(key, request_id) where request_id is not null;

create table if not exists sync.record_receivers (
 key text not null, device_id text not null default ('rr2_'||replace(gen_random_uuid()::text,'-','')),
 credential_hash text not null, name text not null, protocol integer not null default 2 check(protocol=2),
 build integer not null check(build>=51), last_seen timestamptz, revoked_at timestamptz,
 created_at timestamptz not null default now(), primary key(key,device_id),unique(key,credential_hash));
alter table sync.record_receivers enable row level security;
revoke all on sync.record_receivers from public,anon,authenticated,service_role;

-- Privileged implementations stay in the non-exposed sync schema. Public RPCs are invoker wrappers.
grant usage on schema sync to anon, authenticated, service_role;
create or replace function sync._remote_record_to_device(p_key text, p_item_id text, p_channel_title text, p_title text,
  p_kind text, p_start timestamptz, p_end timestamptz, p_target_device_id text, p_request_id uuid, p_origin text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_job sync.remote_jobs; v_device sync.devices;
begin
  perform sync._check_key(p_key);
  if p_request_id is null or p_target_device_id is null or btrim(p_target_device_id) = '' or length(p_target_device_id)>64
    or p_item_id is null or btrim(p_item_id)='' or p_start is null or p_end is null or p_end<=p_start
    or p_end-p_start>interval '12 hours' or p_end<=now() or p_kind is null or p_kind not in ('now','scheduled') then
    return jsonb_build_object('ok',false,'error','invalid_request','message','Choose a device and a valid recording time. Nothing was sent.');
  end if;
  perform pg_advisory_xact_lock(hashtext('rr'||p_key));
  select * into v_job from sync.remote_jobs where key=p_key and request_id=p_request_id;
  if found then
    if v_job.target_device_id<>p_target_device_id or v_job.item_id<>left(p_item_id,64)
      or v_job.start_at<>p_start or v_job.end_at<>p_end then
      return jsonb_build_object('ok',false,'error','request_mismatch','message','That request ID was already used. Check DVR before retrying.');
    end if;
    return jsonb_build_object('ok',true,'job',to_jsonb(v_job)-'key','duplicate',true);
  end if;
  select device_id,name,last_seen into v_device.device_id,v_device.name,v_device.last_seen
    from sync.record_receivers where key=p_key and device_id=p_target_device_id and protocol=2 and build>=51 and revoked_at is null;
  if not found or v_device.last_seen is null or v_device.last_seen<=now()-interval '45 minutes' then
    return jsonb_build_object('ok',false,'error','target_unavailable','message','Update CheeseTV on the intended Android TV to 1.1.44 (build 51) or newer, open it, and refresh. Nothing was sent.');
  end if;
  if exists(select 1 from sync.remote_jobs where key=p_key and status in ('sent','claimed','recording') and start_at<p_end and end_at>p_start)
     or exists(select 1 from sync.dvr_entries where key=p_key and status='recording' and coalesce(end_at,now()+interval '1 minute')>p_start and start_at<p_end) then
    return jsonb_build_object('ok',false,'error','conflict','message','Another recording overlaps that time. Your service allows one connection. Nothing was sent.');
  end if;
  if (select count(*) from sync.remote_jobs where key=p_key)>=200 then
    return jsonb_build_object('ok',false,'error','limit','message','Recording request limit reached. Nothing was sent.');
  end if;
  insert into sync.remote_jobs(key,item_id,channel_title,title,kind,start_at,end_at,origin,target_device_id,target_device_name,request_id)
  values(p_key,left(p_item_id,64),left(p_channel_title,300),left(p_title,300),p_kind,p_start,p_end,
    case when p_origin in ('phone','web','ios','tv') then p_origin end,p_target_device_id,v_device.name,p_request_id) returning * into v_job;
  return jsonb_build_object('ok',true,'job',to_jsonb(v_job)-'key');
end $$;

create or replace function public.sync_remote_record_to_device(p_key text, p_item_id text, p_channel_title text, p_title text,
  p_kind text, p_start timestamptz, p_end timestamptz, p_target_device_id text, p_request_id uuid, p_origin text default null)
returns jsonb language sql security invoker set search_path = '' as $$
  select sync._remote_record_to_device(p_key,p_item_id,p_channel_title,p_title,p_kind,p_start,p_end,p_target_device_id,p_request_id,p_origin);
$$;

-- Heartbeat does not offer a targeted job to any other box, including OLD app versions.
create or replace function sync._device_heartbeat_targeted(p_key text,p_device_id text,p_name text,p_kind text)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform sync._check_key(p_key);
  if p_device_id is null or btrim(p_device_id)='' or length(p_device_id)>64 then raise exception 'invalid device' using errcode='22023'; end if;
  insert into sync.devices(key,device_id,name,kind,last_seen) values(p_key,p_device_id,left(p_name,80),case when p_kind in ('tv','phone','web') then p_kind end,now())
  on conflict(key,device_id) do update set name=excluded.name,kind=excluded.kind,last_seen=now();
  delete from sync.remote_jobs where key=p_key and end_at<now()-interval '7 days';
  update sync.remote_jobs set status='failed',message=case when target_device_id is null then 'No TV picked this up in time' else 'The selected device did not pick this up in time' end,updated_at=now()
    where key=p_key and status='sent' and end_at<now();
  return jsonb_build_object('server_time',now(),'jobs',coalesce((select jsonb_agg(to_jsonb(j)-'key' order by j.start_at)
    from sync.remote_jobs j where j.key=p_key and (
      (p_kind='tv' and j.status='sent' and j.target_device_id is null)
      or (j.target_device_id is null and j.claimed_by=p_device_id and j.status in ('claimed','recording','cancelled')))), '[]'::jsonb));
end $$;
create or replace function public.sync_device_heartbeat(p_key text,p_device_id text,p_name text,p_kind text)
returns jsonb language sql security invoker set search_path = '' as $$
  select sync._device_heartbeat_targeted(p_key,p_device_id,p_name,p_kind);
$$;

-- Legacy gate refuses ALL targeted jobs, including a forged selected receiver ID.
create or replace function sync._claim_remote_targeted(p_key text,p_job_id uuid,p_device_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v sync.remote_jobs;
begin
  perform sync._check_key(p_key);
  if p_device_id is null or btrim(p_device_id)='' or length(p_device_id)>64 then return jsonb_build_object('ok',false); end if;
  update sync.remote_jobs j set status='claimed',claimed_by=p_device_id,updated_at=now()
    where j.key=p_key and j.job_id=p_job_id and j.status='sent' and j.end_at>now()
      and j.target_device_id is null
      and exists(select 1 from sync.devices d where d.key=p_key and d.device_id=p_device_id and d.kind='tv'
        and d.last_seen>now()-interval '45 minutes') returning j.* into v;
  if not found then return jsonb_build_object('ok',false); end if;
  return jsonb_build_object('ok',true,'job',to_jsonb(v)-'key');
end $$;
create or replace function public.sync_claim_remote(p_key text,p_job_id uuid,p_device_id text)
returns jsonb language sql security invoker set search_path = '' as $$
  select sync._claim_remote_targeted(p_key,p_job_id,p_device_id);
$$;

revoke all on function sync._remote_record_to_device(text,text,text,text,text,timestamptz,timestamptz,text,uuid,text),
 sync._device_heartbeat_targeted(text,text,text,text),sync._claim_remote_targeted(text,uuid,text),
 public.sync_remote_record_to_device(text,text,text,text,text,timestamptz,timestamptz,text,uuid,text),
 public.sync_device_heartbeat(text,text,text,text),public.sync_claim_remote(text,uuid,text) from public;
grant execute on function sync._remote_record_to_device(text,text,text,text,text,timestamptz,timestamptz,text,uuid,text),
 sync._device_heartbeat_targeted(text,text,text,text),sync._claim_remote_targeted(text,uuid,text),
 public.sync_remote_record_to_device(text,text,text,text,text,timestamptz,timestamptz,text,uuid,text),
 public.sync_device_heartbeat(text,text,text,text),public.sync_claim_remote(text,uuid,text) to anon,authenticated,service_role;
-- Explicit RPC/helper grants preserve all deployed caller roles; table RLS/table grants are unchanged.
create or replace function sync._enroll_record_receiver_v2impl(p_key text,p_credential text,p_name text,p_build integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare r sync.record_receivers;
begin
 perform sync._check_key(p_key);
 if p_credential is null or p_credential !~ '^[0-9a-f]{64}$' or p_build is null or p_build<51 then return jsonb_build_object('ok',false); end if;
 perform pg_advisory_xact_lock(hashtext('enroll'||p_key));
 select * into r from sync.record_receivers where key=p_key and credential_hash=encode(sha256(convert_to(p_credential,'UTF8')),'hex');
 if found then return jsonb_build_object('ok',r.revoked_at is null,'device_id',r.device_id,'protocol',2); end if;
 if (select count(*) from sync.record_receivers where key=p_key and revoked_at is null)>=20 then return jsonb_build_object('ok',false,'error','receiver_limit'); end if;
 insert into sync.record_receivers(key,credential_hash,name,build) values(p_key,encode(sha256(convert_to(p_credential,'UTF8')),'hex'),coalesce(nullif(left(btrim(p_name),80),''),'Android TV'),p_build) returning * into r;
 return jsonb_build_object('ok',true,'device_id',r.device_id,'protocol',2);
end
$$;

create or replace function public.sync_enroll_record_receiver(p_key text,p_credential text,p_name text,p_build integer) returns jsonb language sql security invoker set search_path='' as $$ select sync._enroll_record_receiver_v2impl(p_key,p_credential,p_name,p_build); $$;

revoke all on function sync._enroll_record_receiver_v2impl(text,text,text,integer), public.sync_enroll_record_receiver(text,text,text,integer) from public;
grant execute on function sync._enroll_record_receiver_v2impl(text,text,text,integer), public.sync_enroll_record_receiver(text,text,text,integer) to anon,authenticated,service_role;

create or replace function sync._record_receiver_ok(p_key text,p_device_id text,p_credential text)
returns boolean language sql security definer set search_path='' as $$
 select p_credential ~ '^[0-9a-f]{64}$' and exists(select 1 from sync.record_receivers r where r.key=p_key and r.device_id=p_device_id and r.protocol=2 and r.build>=51 and r.revoked_at is null and r.credential_hash=encode(sha256(convert_to(p_credential,'UTF8')),'hex'));
$$;
revoke all on function sync._record_receiver_ok(text,text,text) from public,anon,authenticated,service_role;

create or replace function sync._record_receiver_heartbeat_v2impl(p_key text,p_device_id text,p_credential text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform sync._check_key(p_key);
 if not coalesce(sync._record_receiver_ok(p_key,p_device_id,p_credential),false) then return jsonb_build_object('ok',false,'error','receiver_auth'); end if;
 update sync.record_receivers set last_seen=now() where key=p_key and device_id=p_device_id;
 update sync.remote_jobs set status='failed',message='The selected receiver did not accept before the request ended',updated_at=now()
  where key=p_key and target_device_id=p_device_id and status in ('sent','claimed') and end_at<=now();
 return jsonb_build_object('ok',true,'protocol',2,'jobs',coalesce((select jsonb_agg(to_jsonb(j)-'key' order by j.start_at) from sync.remote_jobs j
  where j.key=p_key and j.target_device_id=p_device_id and (j.status='sent' or (j.claimed_by=p_device_id and j.status in ('claimed','recording','cancelled')))),'[]'::jsonb));
end
$$;

create or replace function public.sync_record_receiver_heartbeat(p_key text,p_device_id text,p_credential text) returns jsonb language sql security invoker set search_path='' as $$ select sync._record_receiver_heartbeat_v2impl(p_key,p_device_id,p_credential); $$;

revoke all on function sync._record_receiver_heartbeat_v2impl(text,text,text), public.sync_record_receiver_heartbeat(text,text,text) from public;
grant execute on function sync._record_receiver_heartbeat_v2impl(text,text,text), public.sync_record_receiver_heartbeat(text,text,text) to anon,authenticated,service_role;

create or replace function sync._claim_remote_v2_v2impl(p_key text,p_job_id uuid,p_device_id text,p_credential text) returns jsonb language plpgsql security definer set search_path='' as $$
declare j sync.remote_jobs;
begin
 perform sync._check_key(p_key);
 if not coalesce(sync._record_receiver_ok(p_key,p_device_id,p_credential),false) then return jsonb_build_object('ok',false); end if;
 if not exists(select 1 from sync.record_receivers where key=p_key and device_id=p_device_id and last_seen>now()-interval '45 minutes') then return jsonb_build_object('ok',false); end if;
 update sync.remote_jobs set status='claimed',claimed_by=p_device_id,updated_at=now() where key=p_key and job_id=p_job_id and target_device_id=p_device_id and status='sent' and end_at>now() returning * into j;
 if found then return jsonb_build_object('ok',true,'job',to_jsonb(j)-'key','recovered',false); end if;
 select * into j from sync.remote_jobs where key=p_key and job_id=p_job_id and target_device_id=p_device_id and claimed_by=p_device_id and status in ('claimed','recording') and end_at>now();
 if not found then return jsonb_build_object('ok',false); end if;
 return jsonb_build_object('ok',true,'job',to_jsonb(j)-'key','recovered',true);
end
$$;

create or replace function public.sync_claim_remote_v2(p_key text,p_job_id uuid,p_device_id text,p_credential text) returns jsonb language sql security invoker set search_path='' as $$ select sync._claim_remote_v2_v2impl(p_key,p_job_id,p_device_id,p_credential); $$;

revoke all on function sync._claim_remote_v2_v2impl(text,uuid,text,text), public.sync_claim_remote_v2(text,uuid,text,text) from public;
grant execute on function sync._claim_remote_v2_v2impl(text,uuid,text,text), public.sync_claim_remote_v2(text,uuid,text,text) to anon,authenticated,service_role;

create or replace function sync._update_remote_v2impl(p_key text,p_job_id uuid,p_device_id text,p_status text,p_message text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform sync._check_key(p_key);
 if p_status='cancelled' then
 update sync.remote_jobs set status='cancelled',updated_at=now() where key=p_key and job_id=p_job_id and status in ('sent','claimed','recording');
 elsif p_status in ('recording','done','failed','conflict') then
 update sync.remote_jobs set status=p_status,message=left(p_message,300),updated_at=now() where key=p_key and job_id=p_job_id and target_device_id is null and claimed_by=p_device_id and status in ('claimed','recording');
 else return jsonb_build_object('ok',false); end if;
 get diagnostics n=row_count;return jsonb_build_object('ok',n>0);
end
$$;

create or replace function public.sync_update_remote(p_key text,p_job_id uuid,p_device_id text,p_status text,p_message text default null) returns jsonb language sql security invoker set search_path='' as $$ select sync._update_remote_v2impl(p_key,p_job_id,p_device_id,p_status,p_message); $$;

revoke all on function sync._update_remote_v2impl(text,uuid,text,text,text), public.sync_update_remote(text,uuid,text,text,text) from public;
grant execute on function sync._update_remote_v2impl(text,uuid,text,text,text), public.sync_update_remote(text,uuid,text,text,text) to anon,authenticated,service_role;

create or replace function sync._update_remote_v2_v2impl(p_key text,p_job_id uuid,p_device_id text,p_credential text,p_status text,p_message text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform sync._check_key(p_key);
 if not coalesce(sync._record_receiver_ok(p_key,p_device_id,p_credential),false) or p_status is null or p_status not in ('recording','done','failed','conflict') then return jsonb_build_object('ok',false); end if;
 update sync.remote_jobs set status=p_status,message=left(p_message,300),accepted_at=coalesce(accepted_at,now()),updated_at=now() where key=p_key and job_id=p_job_id and target_device_id=p_device_id and claimed_by=p_device_id and (status in ('claimed','recording') or status=p_status);
 get diagnostics n=row_count;
 return jsonb_build_object('ok',n>0,'terminal',n=0 and (not exists(select 1 from sync.remote_jobs where key=p_key and job_id=p_job_id) or exists(select 1 from sync.remote_jobs where key=p_key and job_id=p_job_id and target_device_id=p_device_id and status in ('done','failed','cancelled','conflict'))));
end
$$;

create or replace function public.sync_update_remote_v2(p_key text,p_job_id uuid,p_device_id text,p_credential text,p_status text,p_message text default null) returns jsonb language sql security invoker set search_path='' as $$ select sync._update_remote_v2_v2impl(p_key,p_job_id,p_device_id,p_credential,p_status,p_message); $$;

revoke all on function sync._update_remote_v2_v2impl(text,uuid,text,text,text,text), public.sync_update_remote_v2(text,uuid,text,text,text,text) from public;
grant execute on function sync._update_remote_v2_v2impl(text,uuid,text,text,text,text), public.sync_update_remote_v2(text,uuid,text,text,text,text) to anon,authenticated,service_role;

create or replace function sync._get_remote_v2impl(p_key text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform sync._check_key(p_key);
 return jsonb_build_object('server_time',now(),'receiver_protocol',2,'minimum_receiver_build',51,
 'jobs',coalesce((select jsonb_agg(to_jsonb(j)-'key' order by start_at desc) from sync.remote_jobs j where key=p_key and end_at>now()-interval '2 days'),'[]'::jsonb),
 'devices',coalesce((select jsonb_agg(jsonb_build_object('device_id',device_id,'name',name,'kind',kind,'last_seen',last_seen,'online',last_seen>now()-interval '45 minutes')) from sync.devices where key=p_key),'[]'::jsonb)||coalesce((select jsonb_agg(jsonb_build_object('device_id',device_id,'name',name,'kind','tv','record_protocol',protocol,'receiver_build',build,'last_seen',last_seen,'online',coalesce(last_seen>now()-interval '45 minutes',false))) from sync.record_receivers where key=p_key and revoked_at is null),'[]'::jsonb),
 'legacy_devices',coalesce((select jsonb_agg(jsonb_build_object('device_id',device_id,'name',name,'kind',kind,'last_seen',last_seen)) from sync.devices where key=p_key),'[]'::jsonb),
 'dvr',coalesce((select jsonb_agg(to_jsonb(e)-'key' order by start_at desc) from sync.dvr_entries e where key=p_key and status<>'deleted'),'[]'::jsonb));
end
$$;

create or replace function public.sync_get_remote(p_key text) returns jsonb language sql security invoker set search_path='' as $$ select sync._get_remote_v2impl(p_key); $$;

revoke all on function sync._get_remote_v2impl(text), public.sync_get_remote(text) from public;
grant execute on function sync._get_remote_v2impl(text), public.sync_get_remote(text) to anon,authenticated,service_role;

create or replace function sync._put_dvr_entry_v2impl(p_key text,p_entry_id text,p_device_id text,p_device_name text,p_title text,p_channel_title text,p_start timestamptz,p_end timestamptz,p_status text,p_size bigint default null,p_job_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  perform sync._check_key(p_key);
  if exists(select 1 from sync.record_receivers where key=p_key and device_id=p_device_id) or exists(select 1 from sync.remote_jobs where key=p_key and job_id=p_job_id and target_device_id is not null) then return jsonb_build_object('ok',false); end if;
  if p_entry_id is null or p_device_id is null or p_status is null or p_status not in ('recording','done','failed','deleted') then raise exception 'invalid entry' using errcode='22023'; end if;
  if (select count(*) from sync.dvr_entries where key=p_key) >= 1000 then delete from sync.dvr_entries where key=p_key and status='deleted'; end if;
  insert into sync.dvr_entries(key,entry_id,title,channel_title,start_at,end_at,status,device_id,device_name,size_bytes,job_id,updated_at)
  values (p_key,left(p_entry_id,160),left(p_title,300),left(p_channel_title,300),p_start,p_end,p_status,left(p_device_id,64),left(p_device_name,80),p_size,p_job_id,now())
  on conflict (key,entry_id) do update set title=excluded.title, channel_title=excluded.channel_title, start_at=excluded.start_at, end_at=excluded.end_at,
    status=excluded.status, device_name=excluded.device_name, size_bytes=excluded.size_bytes, job_id=coalesce(excluded.job_id, sync.dvr_entries.job_id), updated_at=now()
  where sync.dvr_entries.device_id = excluded.device_id;
  return jsonb_build_object('ok', true);
end
$$;

create or replace function public.sync_put_dvr_entry(p_key text,p_entry_id text,p_device_id text,p_device_name text,p_title text,p_channel_title text,p_start timestamptz,p_end timestamptz,p_status text,p_size bigint default null,p_job_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select sync._put_dvr_entry_v2impl(p_key,p_entry_id,p_device_id,p_device_name,p_title,p_channel_title,p_start,p_end,p_status,p_size,p_job_id); $$;

revoke all on function sync._put_dvr_entry_v2impl(text,text,text,text,text,text,timestamptz,timestamptz,text,bigint,uuid), public.sync_put_dvr_entry(text,text,text,text,text,text,timestamptz,timestamptz,text,bigint,uuid) from public;
grant execute on function sync._put_dvr_entry_v2impl(text,text,text,text,text,text,timestamptz,timestamptz,text,bigint,uuid), public.sync_put_dvr_entry(text,text,text,text,text,text,timestamptz,timestamptz,text,bigint,uuid) to anon,authenticated,service_role;

create or replace function sync._put_dvr_entry_v2_v2impl(p_key text,p_device_id text,p_credential text,p_job_id uuid,p_entry_id text,p_title text,p_channel_title text,p_start timestamptz,p_end timestamptz,p_status text,p_size bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare r sync.record_receivers; n integer;
begin
 perform sync._check_key(p_key);
 if not coalesce(sync._record_receiver_ok(p_key,p_device_id,p_credential),false) or p_status is null or p_status not in ('recording','done','failed','deleted') then return jsonb_build_object('ok',false); end if;
 if not exists(select 1 from sync.remote_jobs where key=p_key and job_id=p_job_id and target_device_id=p_device_id and claimed_by=p_device_id) and not (p_status='deleted' and exists(select 1 from sync.dvr_entries where key=p_key and entry_id=p_entry_id and device_id=p_device_id and job_id=p_job_id)) then return jsonb_build_object('ok',false); end if;
 if p_status='recording' and not exists(select 1 from sync.remote_jobs where key=p_key and job_id=p_job_id and status in ('claimed','recording')) then return jsonb_build_object('ok',false); end if;
 select * into r from sync.record_receivers where key=p_key and device_id=p_device_id;
 insert into sync.dvr_entries(key,entry_id,title,channel_title,start_at,end_at,status,device_id,device_name,size_bytes,job_id)
 values(p_key,left(p_entry_id,160),left(p_title,300),left(p_channel_title,300),p_start,p_end,p_status,p_device_id,r.name,p_size,p_job_id)
 on conflict(key,entry_id) do update set status=excluded.status,size_bytes=excluded.size_bytes,updated_at=now() where sync.dvr_entries.device_id=p_device_id and sync.dvr_entries.job_id=p_job_id and not (sync.dvr_entries.status in ('done','failed','deleted') and excluded.status='recording');
 get diagnostics n=row_count;return jsonb_build_object('ok',n>0);
end
$$;

create or replace function public.sync_put_dvr_entry_v2(p_key text,p_device_id text,p_credential text,p_job_id uuid,p_entry_id text,p_title text,p_channel_title text,p_start timestamptz,p_end timestamptz,p_status text,p_size bigint) returns jsonb language sql security invoker set search_path='' as $$ select sync._put_dvr_entry_v2_v2impl(p_key,p_device_id,p_credential,p_job_id,p_entry_id,p_title,p_channel_title,p_start,p_end,p_status,p_size); $$;

revoke all on function sync._put_dvr_entry_v2_v2impl(text,text,text,uuid,text,text,text,timestamptz,timestamptz,text,bigint), public.sync_put_dvr_entry_v2(text,text,text,uuid,text,text,text,timestamptz,timestamptz,text,bigint) from public;
grant execute on function sync._put_dvr_entry_v2_v2impl(text,text,text,uuid,text,text,text,timestamptz,timestamptz,text,bigint), public.sync_put_dvr_entry_v2(text,text,text,uuid,text,text,text,timestamptz,timestamptz,text,bigint) to anon,authenticated,service_role;

create or replace function sync._accept_remote_v2(p_key text,p_job_id uuid,p_device_id text,p_credential text) returns jsonb language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 perform sync._check_key(p_key);
 if not coalesce(sync._record_receiver_ok(p_key,p_device_id,p_credential),false) then return jsonb_build_object('ok',false); end if;
 update sync.remote_jobs set accepted_at=coalesce(accepted_at,now()),updated_at=now() where key=p_key and job_id=p_job_id and target_device_id=p_device_id and claimed_by=p_device_id and status='claimed' and end_at>now();
 get diagnostics n=row_count;return jsonb_build_object('ok',n>0);
end $$;
create or replace function public.sync_accept_remote_v2(p_key text,p_job_id uuid,p_device_id text,p_credential text) returns jsonb language sql security invoker set search_path='' as $$ select sync._accept_remote_v2(p_key,p_job_id,p_device_id,p_credential); $$;
revoke all on function sync._accept_remote_v2(text,uuid,text,text),public.sync_accept_remote_v2(text,uuid,text,text) from public;
grant execute on function sync._accept_remote_v2(text,uuid,text,text),public.sync_accept_remote_v2(text,uuid,text,text) to anon,authenticated,service_role;

notify pgrst,'reload schema';
