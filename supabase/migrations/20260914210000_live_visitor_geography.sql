-- Live visitor geography for merchant shops.
-- Store only country-level location; no IP address is persisted.

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  visitor_key text not null,
  country_code text,
  country_name text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visitor_sessions_visitor_key_check check (char_length(visitor_key) between 16 and 128),
  constraint visitor_sessions_country_code_check check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  unique (merchant_id, visitor_key)
);

create index if not exists visitor_sessions_merchant_last_seen_idx
  on public.visitor_sessions (merchant_id, last_seen_at desc);

create index if not exists visitor_sessions_merchant_country_idx
  on public.visitor_sessions (merchant_id, country_code);

alter table public.visitor_sessions enable row level security;

drop policy if exists visitor_sessions_merchant_select on public.visitor_sessions;
create policy visitor_sessions_merchant_select
  on public.visitor_sessions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.merchants m
      where m.id = visitor_sessions.merchant_id
        and m.owner_id = auth.uid()
    )
  );

revoke all on public.visitor_sessions from anon, authenticated;
grant select on public.visitor_sessions to authenticated;

create or replace function public.touch_visitor_session(
  p_merchant_id uuid,
  p_visitor_key text,
  p_country_code text,
  p_country_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_merchant_id is null then raise exception 'Händler fehlt'; end if;
  if p_visitor_key is null or char_length(p_visitor_key) < 16 or char_length(p_visitor_key) > 128 then raise exception 'Ungültige Besucher-ID'; end if;
  insert into public.visitor_sessions (merchant_id, visitor_key, country_code, country_name)
  values (
    p_merchant_id,
    p_visitor_key,
    nullif(upper(trim(p_country_code)), ''),
    nullif(trim(p_country_name), '')
  )
  on conflict (merchant_id, visitor_key) do update
  set country_code = coalesce(excluded.country_code, public.visitor_sessions.country_code),
      country_name = coalesce(excluded.country_name, public.visitor_sessions.country_name),
      last_seen_at = now(),
      updated_at = now();
end;
$$;

revoke all on function public.touch_visitor_session(uuid,text,text,text) from public, anon, authenticated;
