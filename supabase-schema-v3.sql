-- Run in Supabase SQL Editor
-- Schema v3 — adds profiles, push_subscriptions, notifications, subscriptions

-- Profiles (auto-created on signup via trigger)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  plan text default 'free',   -- 'free' | 'premium' | 'pro' | 'elite'
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Push subscriptions
create table if not exists push_subscriptions (
  user_id uuid references auth.users on delete cascade primary key,
  subscription text not null,
  updated_at timestamptz default now()
);

-- Notifications log
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  title text,
  body text,
  type text,   -- 'flight_delay' | 'safety_alert' | 'booking' | 'system'
  read boolean default false,
  created_at timestamptz default now()
);

-- Subscriptions (Stripe/PayPal webhook data)
create table if not exists subscriptions (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  plan text not null,
  status text not null,   -- 'active' | 'cancelled' | 'past_due'
  amount numeric,
  billing text,           -- 'monthly' | 'annual'
  provider text,          -- 'stripe' | 'paypal'
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- My trips (update to support user_id as uuid)
create table if not exists my_trips (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  type text not null,
  partner_name text not null,
  partner_url text,
  details jsonb,
  status text default 'booked',
  created_at timestamptz default now()
);

create index if not exists my_trips_user_id_idx     on my_trips(user_id);
create index if not exists notifications_user_id_idx on notifications(user_id);
create index if not exists subscriptions_user_id_idx on subscriptions(user_id);

-- RLS policies
alter table profiles           enable row level security;
alter table push_subscriptions enable row level security;
alter table notifications      enable row level security;
alter table subscriptions      enable row level security;
alter table my_trips           enable row level security;

-- Users can only see/edit their own data
create policy "profiles_own"           on profiles           for all using (auth.uid() = id);
create policy "push_subs_own"          on push_subscriptions for all using (auth.uid() = user_id);
create policy "notifications_own"      on notifications      for all using (auth.uid() = user_id);
create policy "subscriptions_own"      on subscriptions      for all using (auth.uid() = user_id);
create policy "my_trips_own"           on my_trips           for all using (auth.uid() = user_id or user_id is null);
