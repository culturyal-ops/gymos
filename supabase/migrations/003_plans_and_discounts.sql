-- 003_plans_and_discounts.sql
-- Normalize pricing from JSONB to proper plans table
-- Add discounts and WhatsApp compliance tables

-- Plans Table: Replace gym_settings.pricing_json
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  name text not null,
  duration_days integer not null,
  price decimal(10,2) not null,
  is_active boolean default true,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(gym_id, name)
);

-- Add plan_id foreign key to members (nullable initially for backward compatibility)
alter table public.members
add column plan_id uuid references public.plans (id) on delete set null;

-- Discounts Table: Coupon codes and promotional rules
create table public.discounts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  code text not null,
  percentage decimal(5,2) not null,
  max_uses integer,
  current_uses integer default 0,
  is_active boolean default true,
  expires_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(gym_id, code)
);

-- WhatsApp Opt-Out Table: Compliance with Meta policies
create table public.whatsapp_opt_outs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  phone_number text not null,
  opted_out_at timestamp default now(),
  reason text,
  created_at timestamp default now(),
  unique(gym_id, phone_number)
);

-- WhatsApp Daily Counts: Rate limiting per gym
create table public.whatsapp_daily_counts (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  date date not null,
  count integer default 0,
  created_at timestamp default now(),
  unique(gym_id, date)
);

-- Payment Link Audit: Track all payment link generations
create table public.payment_link_audit (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  plan_id uuid references public.plans (id) on delete set null,
  type text not null, -- 'plan', 'supplement', 'custom'
  amount decimal(10,2) not null,
  discount_applied decimal(10,2),
  discount_code text,
  created_by_ai boolean default false,
  razorpay_link_id text,
  created_at timestamp default now()
);

-- Add indexes for performance
create index idx_plans_gym_id on public.plans(gym_id);
create index idx_discounts_gym_id on public.discounts(gym_id);
create index idx_whatsapp_opt_outs_gym_id on public.whatsapp_opt_outs(gym_id);
create index idx_whatsapp_daily_counts_gym_id_date on public.whatsapp_daily_counts(gym_id, date);
create index idx_payment_link_audit_gym_id on public.payment_link_audit(gym_id);
create index idx_members_plan_id on public.members(plan_id);

-- RLS Policies for plans
alter table public.plans enable row level security;
create policy "Owners can view their gym's plans"
  on public.plans for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

-- RLS Policies for discounts
alter table public.discounts enable row level security;
create policy "Owners can manage their gym's discounts"
  on public.discounts for all
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

-- RLS Policies for whatsapp_opt_outs
alter table public.whatsapp_opt_outs enable row level security;
create policy "Owners can view their gym's opt-outs"
  on public.whatsapp_opt_outs for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

-- RLS Policies for payment_link_audit
alter table public.payment_link_audit enable row level security;
create policy "Owners can view their gym's payment audit"
  on public.payment_link_audit for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );
