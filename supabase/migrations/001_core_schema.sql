-- 001_core_schema.sql
-- Core multi-tenant schema for GymOS.

-- Enums
create type plan_tier_enum as enum ('starter', 'growth', 'scale');
create type staff_role_enum as enum ('owner', 'receptionist', 'trainer');
create type member_status_enum as enum ('active', 'expiring', 'churned', 'paused');
create type payment_mode_enum as enum ('cash', 'counter_upi', 'razorpay_link', 'razorpay_subscription');
create type lead_source_enum as enum ('whatsapp', 'instagram_ad', 'walkin', 'referral');
create type lead_stage_enum as enum ('new', 'ai_replied', 'followed_up', 'converted', 'cold');
create type notification_type_enum as enum (
  'renewal_reminder',
  'payment_receipt',
  'streak_milestone',
  'lead_followup',
  'supplement_upsell',
  'daily_summary'
);
create type notification_status_enum as enum ('pending', 'processing', 'sent', 'failed');

-- gyms — The Master Tenant Table
create table public.gyms (
  id uuid primary key,
  owner_id uuid references auth.users (id),
  name text,
  slug text unique,
  phone text,
  city text,
  state text,
  razorpay_key_id text,
  razorpay_secret text,
  waba_phone text,
  waba_token text,
  plan_tier plan_tier_enum,
  is_active boolean default true,
  onboarded_at timestamp,
  created_at timestamp default now()
);

-- gym_settings — The AI Brain Context Per Gym
create table public.gym_settings (
  gym_id uuid primary key references public.gyms (id),
  pricing_json jsonb,
  batch_timings text,
  ladies_batch boolean,
  personal_training boolean,
  ai_instructions text,
  auto_reminders boolean default true,
  reminder_days integer default 7,
  supplement_enabled boolean default false,
  updated_at timestamp,
  created_at timestamp default now()
);

-- gym_staff — Role-Based Access Control
create table public.gym_staff (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  user_id uuid references auth.users (id),
  role staff_role_enum,
  name text,
  created_at timestamp default now()
);

-- members — The Core User Base
create table public.members (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  name text,
  phone text,
  email text,
  plan_type text,
  status member_status_enum,
  expiry_date timestamp,
  joined_at timestamp,
  streak_count integer default 0,
  notes text,
  added_by uuid references public.gym_staff (id),
  created_at timestamp default now()
);

-- transactions — The Financial Ledger
create table public.transactions (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  member_id uuid references public.members (id),
  amount decimal(10,2),
  payment_mode payment_mode_enum,
  razorpay_payment_id text,
  plan_purchased text,
  logged_by uuid references public.gym_staff (id),
  auto_logged boolean default false,
  created_at timestamp default now()
);

-- attendance_logs — Real Streak Tracking
create table public.attendance_logs (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  member_id uuid references public.members (id),
  logged_at timestamp,
  logged_by uuid references public.gym_staff (id),
  created_at timestamp default now()
);

-- leads — The Sales Pipeline
create table public.leads (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  name text,
  phone text,
  source lead_source_enum,
  query_text text,
  stage lead_stage_enum,
  ai_reply_sent boolean default false,
  discount_sent boolean default false,
  converted_member uuid references public.members (id),
  last_interaction timestamp,
  created_at timestamp default now()
);

-- notifications_queue — The Fault-Tolerant Message Buffer
create table public.notifications_queue (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  member_id uuid references public.members (id),
  lead_id uuid references public.leads (id),
  type notification_type_enum,
  payload jsonb,
  status notification_status_enum,
  attempts integer default 0,
  scheduled_for timestamp,
  sent_at timestamp,
  error_log text,
  created_at timestamp default now()
);

-- campaigns — Automation ROI Tracking
create table public.campaigns (
  id uuid primary key,
  gym_id uuid references public.gyms (id),
  type text,
  member_id uuid references public.members (id),
  message_preview text,
  sent_at timestamp,
  opened boolean,
  responded boolean,
  converted boolean,
  created_at timestamp default now()
);
