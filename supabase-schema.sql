-- Run this in your Supabase SQL Editor

-- Trips table
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  intent jsonb not null,
  itineraries jsonb,
  selected_itinerary_id text,
  booking_id text,
  visa_info jsonb,
  stage text not null default 'input',
  needs_human_review boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Bookings table
create table if not exists bookings (
  id text primary key,
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  booking_data jsonb not null,
  itinerary jsonb not null,
  status text not null default 'confirmed',
  created_at timestamptz default now()
);

-- Ops alerts table
create table if not exists ops_alerts (
  id text primary key,
  trip_id uuid references trips(id) on delete cascade,
  type text not null,
  severity text not null default 'low',
  message text not null,
  auto_resolved boolean default false,
  created_at timestamptz default now()
);

-- RLS policies (enable row-level security)
alter table trips enable row level security;
alter table bookings enable row level security;
alter table ops_alerts enable row level security;

create policy "Users see own trips" on trips
  for all using (auth.uid() = user_id);

create policy "Users see own bookings" on bookings
  for all using (auth.uid() = user_id);

create policy "Users see own alerts" on ops_alerts
  for all using (
    trip_id in (select id from trips where user_id = auth.uid())
  );
