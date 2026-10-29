-- CheeseTV 1.1.28: "Record on my TV" (account-wide). Metadata only; video never leaves the TV.
create table if not exists sync.devices (
  key text not null, device_id text not null, name text, kind text,
  last_seen timestamptz not null default now(), primary key (key, device_id));

create table if not exists sync.remote_jobs (
  key text not null, job_id uuid not null default gen_random_uuid(),
  item_id text not null, channel_title text, title text,
  kind text not null check (kind in ('now','scheduled')),
  start_at timestamptz not null, end_at timestamptz not null,
  status text not null default 'sent' check (status in ('sent','claimed','recording','done','failed','conflict','cancelled')),
  claimed_by text, message text, origin text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (key, job_id));

create table if not exists sync.dvr_entries (
  key text not null, entry_id text not null, title text, channel_title text,
  start_at timestamptz, end_at timestamptz,
  status text not null check (status in ('recording','done','failed','deleted')),
  device_id text not null, device_name text, size_bytes bigint, job_id uuid,
  updated_at timestamptz not null default now(), primary key (key, entry_id));

alter table sync.devices enable row level security;
alter table sync.remote_jobs enable row level security;
alter table sync.dvr_entries enable row level security;

-- Heartbeat: TV says it's online; returns open jobs it may claim.
create or replace function public.sync_device_heartbeat(p_key text, p_device_id text, p_name text, p_kind text)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  perform sync._check_key(p_key);
  if p_device_id is null or length(p_device_id) > 64 then raise exception 'invalid device' using errcode='22023'; end if;
  insert into sync.devices(key,device_id,name,kind,last_seen) values (p_key,p_device_id,left(p_name,80),case when p_kind in ('tv','phone','web') then p_kind end,now())
  on conflict (key,device_id) do update set name=excluded.name, kind=excluded.kind, last_seen=now();
  delete from sync.remote_jobs where key=p_key and end_at < now() - interval '7 days';
  -- Jobs nobody claimed before they ended -> failed.
  update sync.remote_jobs set status='failed', message='No TV picked this up in time', updated_at=now()
   where key=p_key and status='sent' and end_at < now();
  return jsonb_build_object('server_time', now(), 'jobs', coalesce((select jsonb_agg(to_jsonb(j)-'key' order by j.start_at)
    from sync.remote_jobs j where j.key=p_key and (j.status='sent' or (j.claimed_by=p_device_id and j.status in ('claimed','recording','cancelled')))), '[]'::jsonb));
end $$;

-- Phone/web: request a recording on the account's TV. One connection: block overlaps.
create or replace function public.sync_remote_record(p_key text, p_item_id text, p_channel_title text, p_title text,
  p_kind text, p_start timestamptz, p_end timestamptz, p_origin text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_job sync.remote_jobs; v_c sync.remote_jobs; v_tv int; v_fresh int;
begin
  perform sync._check_key(p_key);
  if p_item_id is null or p_start is null or p_end is null or p_end <= p_start or p_end - p_start > interval '12 hours'
     or p_end < now() or p_kind not in ('now','scheduled') then
    raise exception 'invalid recording' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('rr'||p_key));
  select * into v_c from sync.remote_jobs where key=p_key and status in ('sent','claimed','recording')
    and start_at < p_end and end_at > p_start order by start_at limit 1;
  if found then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'conflict_title', v_c.title,
      'conflict_start', v_c.start_at, 'conflict_end', v_c.end_at,
      'message', 'Your service allows one connection, and "'||coalesce(v_c.title,'another show')||'" is already set to record at that time.');
  end if;
  if exists (select 1 from sync.dvr_entries where key=p_key and status='recording' and coalesce(end_at, now()+interval '1 minute') > p_start and start_at < p_end) then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'message', 'Your TV is already recording another show at that time. Your service allows one connection.');
  end if;
  if (select count(*) from sync.remote_jobs where key=p_key) >= 200 then raise exception 'limit reached' using errcode='54000'; end if;
  insert into sync.remote_jobs(key,item_id,channel_title,title,kind,start_at,end_at,origin)
    values (p_key,left(p_item_id,64),left(p_channel_title,300),left(p_title,300),p_kind,p_start,p_end,case when p_origin in ('phone','web','tv') then p_origin end)
    returning * into v_job;
  select count(*), count(*) filter (where last_seen > now()-interval '45 minutes') into v_tv, v_fresh from sync.devices where key=p_key and kind='tv';
  return jsonb_build_object('ok', true, 'job', to_jsonb(v_job)-'key', 'tvs', v_tv, 'tvs_online', v_fresh);
end $$;

-- TV: claim atomically (only one TV wins). Also refuses if this account already has an overlapping active job.
create or replace function public.sync_claim_remote(p_key text, p_job_id uuid, p_device_id text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v sync.remote_jobs;
begin
  perform sync._check_key(p_key);
  update sync.remote_jobs set status='claimed', claimed_by=left(p_device_id,64), updated_at=now()
   where key=p_key and job_id=p_job_id and status='sent' returning * into v;
  if not found then return jsonb_build_object('ok', false); end if;
  return jsonb_build_object('ok', true, 'job', to_jsonb(v)-'key');
end $$;

-- TV: status updates (recording / done / failed / conflict). Phone/web: cancel (p_device_id null).
create or replace function public.sync_update_remote(p_key text, p_job_id uuid, p_device_id text, p_status text, p_message text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare n int;
begin
  perform sync._check_key(p_key);
  if p_status = 'cancelled' then
    update sync.remote_jobs set status='cancelled', updated_at=now() where key=p_key and job_id=p_job_id and status in ('sent','claimed','recording');
  elsif p_status in ('recording','done','failed','conflict') then
    update sync.remote_jobs set status=p_status, message=left(p_message,300), updated_at=now()
     where key=p_key and job_id=p_job_id and claimed_by=p_device_id and status in ('claimed','recording');
  else raise exception 'invalid status' using errcode='22023'; end if;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', n > 0);
end $$;

-- Phone/web: status of requests + TVs on the account + account-wide DVR list.
create or replace function public.sync_get_remote(p_key text)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  perform sync._check_key(p_key);
  return jsonb_build_object('server_time', now(),
    'jobs', coalesce((select jsonb_agg(to_jsonb(j)-'key' order by j.start_at desc) from sync.remote_jobs j where j.key=p_key and j.end_at > now()-interval '2 days'), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(jsonb_build_object('device_id',d.device_id,'name',d.name,'kind',d.kind,'last_seen',d.last_seen,
        'online', d.last_seen > now()-interval '45 minutes')) from sync.devices d where d.key=p_key), '[]'::jsonb),
    'dvr', coalesce((select jsonb_agg(to_jsonb(e)-'key' order by e.start_at desc) from sync.dvr_entries e where e.key=p_key and e.status<>'deleted'), '[]'::jsonb));
end $$;

-- Any device: record a DVR entry (metadata only) under the account.
create or replace function public.sync_put_dvr_entry(p_key text, p_entry_id text, p_device_id text, p_device_name text, p_title text,
  p_channel_title text, p_start timestamptz, p_end timestamptz, p_status text, p_size bigint default null, p_job_id uuid default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  perform sync._check_key(p_key);
  if p_entry_id is null or p_device_id is null or p_status not in ('recording','done','failed','deleted') then raise exception 'invalid entry' using errcode='22023'; end if;
  if (select count(*) from sync.dvr_entries where key=p_key) >= 1000 then delete from sync.dvr_entries where key=p_key and status='deleted'; end if;
  insert into sync.dvr_entries(key,entry_id,title,channel_title,start_at,end_at,status,device_id,device_name,size_bytes,job_id,updated_at)
  values (p_key,left(p_entry_id,160),left(p_title,300),left(p_channel_title,300),p_start,p_end,p_status,left(p_device_id,64),left(p_device_name,80),p_size,p_job_id,now())
  on conflict (key,entry_id) do update set title=excluded.title, channel_title=excluded.channel_title, start_at=excluded.start_at, end_at=excluded.end_at,
    status=excluded.status, device_name=excluded.device_name, size_bytes=excluded.size_bytes, job_id=coalesce(excluded.job_id, sync.dvr_entries.job_id), updated_at=now()
  where sync.dvr_entries.device_id = excluded.device_id;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.sync_device_heartbeat(text,text,text,text), public.sync_remote_record(text,text,text,text,text,timestamptz,timestamptz,text),
  public.sync_claim_remote(text,uuid,text), public.sync_update_remote(text,uuid,text,text,text), public.sync_get_remote(text),
  public.sync_put_dvr_entry(text,text,text,text,text,text,timestamptz,timestamptz,text,bigint,uuid) from public;
grant execute on function public.sync_device_heartbeat(text,text,text,text), public.sync_remote_record(text,text,text,text,text,timestamptz,timestamptz,text),
  public.sync_claim_remote(text,uuid,text), public.sync_update_remote(text,uuid,text,text,text), public.sync_get_remote(text),
  public.sync_put_dvr_entry(text,text,text,text,text,text,timestamptz,timestamptz,text,bigint,uuid) to anon, authenticated;
