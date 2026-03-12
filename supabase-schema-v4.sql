-- Run in Supabase SQL Editor (add to existing schema)

create table if not exists support_tickets (
  id text primary key,
  session_id text,
  user_id uuid references auth.users on delete set null,
  status text default 'open',       -- 'open' | 'in_progress' | 'resolved' | 'closed'
  priority text default 'normal',   -- 'low' | 'normal' | 'high' | 'urgent'
  subject text,
  conversation jsonb default '[]',
  assigned_to text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists support_tickets_status_idx    on support_tickets(status);
create index if not exists support_tickets_user_id_idx   on support_tickets(user_id);
create index if not exists support_tickets_session_id_idx on support_tickets(session_id);

alter table support_tickets enable row level security;

-- Users can read their own tickets; admins handled via service role in API
create policy "support_tickets_own" on support_tickets
  for select using (auth.uid() = user_id or user_id is null);

create policy "support_tickets_insert" on support_tickets
  for insert with check (true);

create policy "support_tickets_update" on support_tickets
  for update using (true);
