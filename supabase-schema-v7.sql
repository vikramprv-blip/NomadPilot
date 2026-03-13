-- ── Vault items table ─────────────────────────────────────────────────────────
-- All sensitive_data is AES-256 encrypted client-side BEFORE hitting this table
-- The server never sees plaintext passport numbers or card numbers

create table if not exists vault_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  item_type     text not null,           -- 'passport' | 'id_card' | 'credit_card' | 'document' | 'insurance' | 'driving_license'
  label         text not null,           -- user-facing name e.g. "My Danish Passport"
  sensitive_data text not null,          -- AES-256 encrypted JSON string (client-side encrypted)
  iv            text not null,           -- AES initialization vector (needed for decryption)
  salt          text not null,           -- PBKDF2 salt for key derivation
  metadata      jsonb default '{}',      -- non-sensitive: expiry_date, issuing_country, last4 (card), emoji
  expires_at    date,                    -- expiry date (non-sensitive, for reminders)
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── 2FA settings per user ─────────────────────────────────────────────────────
create table if not exists vault_2fa (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null unique,
  totp_secret   text,                    -- encrypted TOTP secret
  totp_enabled  boolean default false,
  backup_codes  text[],                  -- hashed backup codes (10 codes)
  last_verified timestamptz,
  setup_at      timestamptz,
  created_at    timestamptz default now()
);

-- ── Vault access log ──────────────────────────────────────────────────────────
create table if not exists vault_access_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null,
  action     text not null,             -- 'unlock' | 'view_item' | 'add_item' | 'delete_item' | 'export' | 'failed_2fa'
  item_id    uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

-- ── RLS policies ──────────────────────────────────────────────────────────────
alter table vault_items       enable row level security;
alter table vault_2fa         enable row level security;
alter table vault_access_log  enable row level security;

-- Users can only access their own vault
create policy "Users manage own vault items"
  on vault_items for all using (auth.uid() = user_id);

create policy "Users manage own 2FA"
  on vault_2fa for all using (auth.uid() = user_id);

create policy "Users read own access log"
  on vault_access_log for select using (auth.uid() = user_id);

create policy "Users insert own access log"
  on vault_access_log for insert with check (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists vault_items_user_idx on vault_items(user_id);
create index if not exists vault_items_type_idx on vault_items(item_type);
create index if not exists vault_log_user_idx   on vault_access_log(user_id);
create index if not exists vault_log_created_idx on vault_access_log(created_at desc);

-- ── Auto-update updated_at ─────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger vault_items_updated_at
  before update on vault_items
  for each row execute function update_updated_at();
