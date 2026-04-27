-- 004_phase2_ai_cache_and_queues.sql
-- Phase 2: AI cost optimization, n8n queue support, and offline reception

-- Response Cache Table: Store cacheable AI responses
create table public.response_cache (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  intent_key text not null, -- 'batch_timings', 'pricing_query', 'membership_status', etc.
  query_hash text not null, -- SHA256 hash of sanitized query for deduplication
  response_json jsonb not null,
  expires_at timestamp not null,
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(gym_id, intent_key, query_hash)
);

-- AI Cost Log: Track cache hits vs misses for analytics
create table public.ai_cost_log (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  intent_key text not null,
  cache_hit boolean not null,
  tokens_used integer,
  cost_usd decimal(10,4),
  created_at timestamp default now()
);

-- Inbound Message Queue: Decouple webhook from processing
create table public.inbound_message_queue (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  phone_number text not null,
  message_text text not null,
  status text default 'pending', -- 'pending', 'processing', 'completed', 'failed'
  attempts integer default 0,
  max_attempts integer default 3,
  error_log text,
  processed_at timestamp,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Gym Processing Slots: Concurrency limiting per gym
create table public.gym_processing_slots (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  active_slots integer default 0,
  max_slots integer default 10,
  updated_at timestamp default now(),
  unique(gym_id)
);

-- Offline Attendance Queue: Local attendance logs waiting to sync
create table public.offline_attendance_queue (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  offline_id text not null, -- UUID from client-side IndexedDB
  logged_at timestamp not null,
  synced boolean default false,
  synced_at timestamp,
  created_at timestamp default now(),
  unique(gym_id, offline_id)
);

-- Offline Payment Queue: Local cash payments waiting to sync
create table public.offline_payment_queue (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  member_id uuid references public.members (id) on delete set null,
  offline_id text not null, -- UUID from client-side IndexedDB
  amount decimal(10,2) not null,
  payment_mode text not null, -- 'cash', 'counter_upi'
  logged_at timestamp not null,
  synced boolean default false,
  synced_at timestamp,
  created_at timestamp default now(),
  unique(gym_id, offline_id)
);

-- Gym Intent Keywords: Configurable keyword→intent mappings (future use)
create table public.gym_intent_keywords (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  intent_key text not null,
  keywords text[] not null, -- Array of keywords for this intent
  created_at timestamp default now(),
  updated_at timestamp default now(),
  unique(gym_id, intent_key)
);

-- Add indexes for performance
create index idx_response_cache_gym_id on public.response_cache(gym_id);
create index idx_response_cache_expires_at on public.response_cache(expires_at);
create index idx_ai_cost_log_gym_id on public.ai_cost_log(gym_id);
create index idx_inbound_message_queue_gym_id on public.inbound_message_queue(gym_id);
create index idx_inbound_message_queue_status on public.inbound_message_queue(status);
create index idx_gym_processing_slots_gym_id on public.gym_processing_slots(gym_id);
create index idx_offline_attendance_queue_gym_id on public.offline_attendance_queue(gym_id);
create index idx_offline_attendance_queue_synced on public.offline_attendance_queue(synced);
create index idx_offline_payment_queue_gym_id on public.offline_payment_queue(gym_id);
create index idx_offline_payment_queue_synced on public.offline_payment_queue(synced);

-- RLS Policies for response_cache
alter table public.response_cache enable row level security;
create policy "Owners can view their gym's cache"
  on public.response_cache for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

-- RLS Policies for ai_cost_log
alter table public.ai_cost_log enable row level security;
create policy "Owners can view their gym's AI cost log"
  on public.ai_cost_log for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

-- RLS Policies for inbound_message_queue
alter table public.inbound_message_queue enable row level security;
create policy "Service role can manage message queue"
  on public.inbound_message_queue for all
  using (true); -- Service role only

-- RLS Policies for offline queues
alter table public.offline_attendance_queue enable row level security;
create policy "Owners can view their gym's offline attendance"
  on public.offline_attendance_queue for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

alter table public.offline_payment_queue enable row level security;
create policy "Owners can view their gym's offline payments"
  on public.offline_payment_queue for select
  using (
    gym_id in (
      select id from public.gyms where owner_id = auth.uid()
    )
  );

-- Function to clean up expired cache entries (run via cron)
create or replace function public.cleanup_expired_cache()
returns void as $$
begin
  delete from public.response_cache
  where expires_at < now();
end;
$$ language plpgsql;

-- Function to initialize gym processing slots
create or replace function public.init_gym_processing_slots()
returns trigger as $$
begin
  insert into public.gym_processing_slots (gym_id, active_slots, max_slots)
  values (new.id, 0, 10)
  on conflict (gym_id) do nothing;
  return new;
end;
$$ language plpgsql;

-- Trigger to initialize processing slots when gym is created
create trigger init_processing_slots_on_gym_create
after insert on public.gyms
for each row
execute function public.init_gym_processing_slots();
