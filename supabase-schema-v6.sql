-- ── Beta testers table ────────────────────────────────────────────────────────
create table if not exists beta_testers (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  name          text,
  country       text,
  travel_type   text,          -- 'business' | 'leisure' | 'both'
  how_heard     text,          -- 'twitter' | 'linkedin' | 'friend' | 'google' | 'other'
  use_case      text,          -- what they want to use NomadPilot for
  status        text not null default 'waitlist',  -- 'waitlist' | 'invited' | 'active' | 'churned'
  invited_at    timestamptz,
  activated_at  timestamptz,   -- first search after signup
  last_active   timestamptz,
  search_count  int default 0,
  booking_count int default 0,
  source        text default 'organic',  -- utm_source
  invite_code   text unique default substring(md5(random()::text), 1, 8),
  notes         text,          -- admin notes
  created_at    timestamptz default now()
);

-- ── Beta events table (activity tracking) ─────────────────────────────────────
create table if not exists beta_events (
  id         uuid primary key default gen_random_uuid(),
  tester_id  uuid references beta_testers(id) on delete cascade,
  email      text,             -- denormalized for easy querying
  event      text not null,    -- 'signup' | 'search' | 'partner_click' | 'booking_saved' | 'share'
  metadata   jsonb default '{}',
  created_at timestamptz default now()
);

-- ── RLS policies ──────────────────────────────────────────────────────────────
alter table beta_testers enable row level security;
alter table beta_events   enable row level security;

-- Anyone can insert (signup form is public)
create policy "Public can sign up for beta"
  on beta_testers for insert with check (true);

-- Only service role can read (admin only)
create policy "Service role reads beta_testers"
  on beta_testers for select using (auth.role() = 'service_role');

create policy "Service role reads beta_events"
  on beta_events for select using (auth.role() = 'service_role');

create policy "Public can insert beta_events"
  on beta_events for insert with check (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists beta_testers_status_idx    on beta_testers(status);
create index if not exists beta_testers_created_idx   on beta_testers(created_at desc);
create index if not exists beta_events_tester_idx     on beta_events(tester_id);
create index if not exists beta_events_event_idx      on beta_events(event);
create index if not exists beta_events_created_idx    on beta_events(created_at desc);
