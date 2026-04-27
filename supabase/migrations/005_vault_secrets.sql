-- 005_vault_secrets.sql
-- Phase 3 Fix 7: Move sensitive gym credentials into Supabase Vault.
-- Requires the pgsodium / vault extension (enabled by default on Supabase).

-- Enable vault extension (no-op if already enabled)
create extension if not exists vault with schema vault;

-- Add vault reference columns to gyms table.
-- The plain-text columns (razorpay_key_id, razorpay_secret, waba_token) are
-- kept for backward-compat during migration but will be nulled out after
-- secrets are vaulted. New code reads only the _secret_id columns.
alter table public.gyms
  add column if not exists razorpay_key_id_secret_id  uuid,
  add column if not exists razorpay_secret_secret_id  uuid,
  add column if not exists waba_token_secret_id        uuid;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: vault_upsert_gym_secret
-- Inserts or replaces a vault secret for a gym, returns the secret UUID.
-- Called from the Next.js API route via service-role RPC.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.vault_upsert_gym_secret(
  p_gym_id     uuid,
  p_secret_key text,   -- e.g. 'razorpay_key_id'
  p_value      text
)
returns uuid
language plpgsql
security definer   -- runs as postgres, not the calling role
set search_path = public, vault
as $$
declare
  v_name   text := 'gym_' || p_gym_id || '_' || p_secret_key;
  v_secret_id uuid;
begin
  -- Try to find an existing secret with this name
  select id into v_secret_id
  from vault.secrets
  where name = v_name
  limit 1;

  if v_secret_id is not null then
    -- Update existing secret
    perform vault.update_secret(v_secret_id, p_value);
    return v_secret_id;
  else
    -- Create new secret
    v_secret_id := vault.create_secret(p_value, v_name);
    return v_secret_id;
  end if;
end;
$$;

-- Only the service role may call this function
revoke execute on function public.vault_upsert_gym_secret(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.vault_upsert_gym_secret(uuid, text, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: vault_get_gym_secret
-- Decrypts and returns a gym secret. Service-role only.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.vault_get_gym_secret(
  p_gym_id     uuid,
  p_secret_key text
)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_name   text := 'gym_' || p_gym_id || '_' || p_secret_key;
  v_value  text;
begin
  select decrypted_secret into v_value
  from vault.decrypted_secrets
  where name = v_name
  limit 1;

  return v_value;
end;
$$;

revoke execute on function public.vault_get_gym_secret(uuid, text) from public, anon, authenticated;
grant  execute on function public.vault_get_gym_secret(uuid, text) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Subscriptions table (used by Fix 9 — created here to avoid a 6th migration)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  gym_id                    uuid not null references public.gyms(id) on delete cascade,
  plan_id                   text not null,  -- GymOS tier: 'starter' | 'growth' | 'scale'
  razorpay_subscription_id  text unique,
  status                    text not null default 'created',
  -- 'created' | 'authenticated' | 'active' | 'pending' | 'halted' | 'cancelled' | 'completed' | 'expired'
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
  status          text not null default 'paid', -- 'paid' | 'void'
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
-- Super-admin only (service role bypasses RLS)
create policy "No direct access to DLQ"
  on public.dead_letter_queue for all
  using (false);
