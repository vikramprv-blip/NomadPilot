-- Run in Supabase SQL Editor

-- Gemini usage tracking (rate limiting)
create table if not exists gemini_usage (
  key text not null,
  scope text not null,
  count integer default 0,
  updated_at timestamptz default now(),
  primary key (key, scope)
);

-- Auto-clean old entries daily (keeps table small)
create or replace function clean_old_usage() returns void as $$
begin
  delete from gemini_usage where updated_at < now() - interval '2 days';
end;
$$ language plpgsql;

-- Gemini response cache (avoids repeat API calls)
create table if not exists gemini_cache (
  key text primary key,
  type text,
  response text,
  created_at timestamptz default now()
);

-- Auto-clean cache entries older than 48 hours
create or replace function clean_old_cache() returns void as $$
begin
  delete from gemini_cache where created_at < now() - interval '48 hours';
end;
$$ language plpgsql;

-- No RLS needed — these are server-side only tables
-- But restrict to service role
alter table gemini_usage enable row level security;
alter table gemini_cache  enable row level security;

create policy "service_only_usage" on gemini_usage for all using (false);
create policy "service_only_cache"  on gemini_cache  for all using (false);
