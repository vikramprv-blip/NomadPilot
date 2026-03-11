-- Run this in your Supabase SQL Editor
-- ADD to existing schema (run only the new parts if you already ran the original)

-- My Trips table
create table if not exists my_trips (
  id text primary key,
  user_id text,
  type text not null,           -- 'flight' | 'hotel' | 'car' | 'train'
  partner_name text not null,
  partner_url text,
  details jsonb,
  status text default 'booked',
  created_at timestamptz default now()
);

-- Index for fast user lookups
create index if not exists my_trips_user_id_idx on my_trips(user_id);

-- RLS
alter table my_trips enable row level security;

-- Allow all for now (tighten when auth is added)
create policy "Allow all my_trips" on my_trips for all using (true);
