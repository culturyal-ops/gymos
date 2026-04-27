-- 006_observability.sql
-- Phase 3 Fix 8: Error log table and system health view.

-- Error log: captures all server-side errors for the health dashboard
create table if not exists public.error_log (
  id         uuid primary key default gen_random_uuid(),
  gym_id     uuid references public.gyms(id) on delete set null,
  context    text,
  message    text not null,
  stack      text,
  extra      jsonb,
  created_at timestamp default now()
);

create index if not exists idx_error_log_gym_id    on public.error_log(gym_id);
create index if not exists idx_error_log_created   on public.error_log(created_at desc);

alter table public.error_log enable row level security;
-- Only service role can write; no direct owner access
create policy "No direct access to error_log"
  on public.error_log for all
  using (false);

-- ─────────────────────────────────────────────────────────────────────────────
-- Health summary view — used by /admin/health
-- ─────────────────────────────────────────────────────────────────────────────
create or replace view public.health_summary as
select
  -- Pending / failed messages
  (select count(*) from public.inbound_message_queue
   where status in ('pending', 'failed'))                          as queue_pending_count,

  -- Dead letter queue depth
  (select count(*) from public.dead_letter_queue)                  as dlq_count,

  -- AI cache hit rate (last 24 h)
  round(
    100.0 * sum(case when cache_hit then 1 else 0 end)::numeric
           / nullif(count(*), 0),
    1
  )                                                                as cache_hit_rate_pct,

  -- Average AI response time proxy: rows per minute in last hour
  (select count(*) from public.ai_cost_log
   where created_at > now() - interval '1 hour')                  as ai_calls_last_hour,

  -- Recent errors (last hour)
  (select count(*) from public.error_log
   where created_at > now() - interval '1 hour')                  as errors_last_hour

from public.ai_cost_log
where created_at > now() - interval '24 hours';
