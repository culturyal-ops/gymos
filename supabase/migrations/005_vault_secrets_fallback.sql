-- 005_vault_secrets_fallback.sql
-- Phase 3 Fix 7: Secrets management without vault extension (fallback)
-- This version keeps secrets encrypted in a separate table until vault is available

-- Add vault reference columns to gyms table (for future vault migration)
alter table public.gyms
  add column if not exists razorpay_key_id_secret_id  uuid,
  add column if not exists razorpay_secret_secret_id  uuid,
  add column if not exists waba_token_secret_id        uuid;

-- Encrypted secrets table (temporary until vault is available)
create table if not exists public.gym_secrets (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  secret_key text not null, -- 'razorpay_key_id', 'razorpay_secret', 'waba_token'
  encrypted_value text not null, -- Base64 encoded encrypted value
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(gym_id, secret_key)
);

create index if not exists idx_gym_secrets_gym_id on public.gym_secrets(gym_id);

alter table public.gym_secrets enable row level security;
-- Only service role can access secrets
create policy "Service role only access to secrets"
  on public.gym_secrets for all
  using (false); -- No direct access, service role bypasses RLS

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: simple_encrypt/decrypt (basic XOR encryption for demo)
-- In production, use proper encryption or wait for vault
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.simple_encrypt(plaintext text, key_text text default 'gymos-secret-key-2024')
returns text
language plpgsql
as $$
declare
  result text := '';
  i integer;
  char_code integer;
  key_char_code integer;
begin
  for i in 1..length(plaintext) loop
    char_code := ascii(substring(plaintext from i for 1));
    key_char_code := ascii(substring(key_text from ((i - 1) % length(key_text)) + 1 for 1));
    result := result || chr((char_code + key_char_code) % 256);
  end loop;
  return encode(result::bytea, 'base64');
end;
$$;

create or replace function public.simple_decrypt(encrypted_text text, key_text text default 'gymos-secret-key-2024')
returns text
language plpgsql
as $$
declare
  decoded_bytes bytea;
  result text := '';
  i integer;
  char_code integer;
  key_char_code integer;
begin
  decoded_bytes := decode(encrypted_text, 'base64');
  for i in 1..length(decoded_bytes) loop
    char_code := get_byte(decoded_bytes, i - 1);
    key_char_code := ascii(substring(key_text from ((i - 1) % length(key_text)) + 1 for 1));
    result := result || chr((char_code - key_char_code + 256) % 256);
  end loop;
  return result;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: upsert_gym_secret (fallback version)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.upsert_gym_secret(
  p_gym_id     uuid,
  p_secret_key text,
  p_value      text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_secret_id uuid;
  v_encrypted text;
begin
  v_encrypted := public.simple_encrypt(p_value);
  
  insert into public.gym_secrets (gym_id, secret_key, encrypted_value)
  values (p_gym_id, p_secret_key, v_encrypted)
  on conflict (gym_id, secret_key)
  do update set 
    encrypted_value = excluded.encrypted_value,
    updated_at = now()
  returning id into v_secret_id;
  
  return v_secret_id;
end;
$$;

-- Only service role can call this
revoke execute on function public.upsert_gym_secret(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.upsert_gym_secret(uuid, text, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: get_gym_secret (fallback version)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.get_gym_secret(
  p_gym_id     uuid,
  p_secret_key text
)
returns text
language plpgsql
security definer
as $$
declare
  v_encrypted text;
begin
  select encrypted_value into v_encrypted
  from public.gym_secrets
  where gym_id = p_gym_id and secret_key = p_secret_key;
  
  if v_encrypted is null then
    return null;
  end if;
  
  return public.simple_decrypt(v_encrypted);
end;
$$;

revoke execute on function public.get_gym_secret(uuid, text) from public, anon, authenticated;
grant  execute on function public.get_gym_secret(uuid, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Subscriptions table (Fix 9)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  gym_id                    uuid not null references public.gyms(id) on delete cascade,
  plan_id                   text not null,  -- GymOS tier: 'starter' | 'growth' | 'scale'
  razorpay_subscription_id  text unique,
  status                    text not null default 'created',
  current_period_start      timestamp,
  current_period_end        timestamp,
  created_at                timestamp default now(),
  updated_at                timestamp default now()
);

create index if not exists idx_subscriptions_gym_id on public.subscriptions(gym_id);
create index if not exists idx_subscriptions_status  on public.subscriptions(status);

alter table public.subscriptions enable row level security;
create policy "Owners can view their subscription"
  on public.subscriptions for select
  using (gym_id in (select id from public.gyms where owner_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Invoices table (Fix 9)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id              uuid primary key default gen_random_uuid(),
  gym_id          uuid not null references public.gyms(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  amount          decimal(10,2) not null,
  gst_percent     decimal(5,2) not null default 18.00,
  invoice_number  text unique not null,
  razorpay_payment_id text,
  pdf_url         text,
  status          text not null default 'paid',
  created_at      timestamp default now()
);

create index if not exists idx_invoices_gym_id on public.invoices(gym_id);

alter table public.invoices enable row level security;
create policy "Owners can view their invoices"
  on public.invoices for select
  using (gym_id in (select id from public.gyms where owner_id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────────
-- Dead-letter queue (Fix 8)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.dead_letter_queue (
  id           uuid primary key default gen_random_uuid(),
  gym_id       uuid references public.gyms(id) on delete cascade,
  message_json jsonb not null,
  error        text,
  retry_count  int not null default 0,
  created_at   timestamp default now()
);

create index if not exists idx_dlq_gym_id    on public.dead_letter_queue(gym_id);
create index if not exists idx_dlq_created   on public.dead_letter_queue(created_at desc);

alter table public.dead_letter_queue enable row level security;
create policy "No direct access to DLQ"
  on public.dead_letter_queue for all
  using (false);