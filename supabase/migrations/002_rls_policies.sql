-- 002_rls_policies.sql
-- RLS policy layer for GymOS multi-tenant isolation.

-- Helper functions for policy checks.
create or replace function public.is_gym_owner(target_gym_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.gyms g
    where g.id = target_gym_id
      and g.owner_id = auth.uid()
  );
$$;

create or replace function public.current_staff_role(target_gym_id uuid)
returns staff_role_enum
language sql
stable
as $$
  select gs.role
  from public.gym_staff gs
  where gs.gym_id = target_gym_id
    and gs.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_gym_staff(target_gym_id uuid)
returns boolean
language sql
stable
as $$
  select public.current_staff_role(target_gym_id) is not null;
$$;

-- Turn on RLS for all tenant-scoped tables.
alter table public.gyms enable row level security;
alter table public.gym_settings enable row level security;
alter table public.gym_staff enable row level security;
alter table public.members enable row level security;
alter table public.transactions enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leads enable row level security;
alter table public.notifications_queue enable row level security;
alter table public.campaigns enable row level security;

-- =========================
-- gyms
-- =========================

-- Owner full access: gym owner can manage their own gym row.
create policy gyms_owner_full_access
on public.gyms
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

-- Staff role-based access: staff can read their own gym row, but cannot mutate it.
create policy gyms_staff_role_access
on public.gyms
for select
to authenticated
using (public.is_gym_staff(id));

-- Service role bypass: backend automation can access all gym rows.
create policy gyms_service_role_bypass
on public.gyms
for all
to service_role
using (true)
with check (true);

-- =========================
-- gym_settings
-- =========================

-- Owner full access: gym owner can read and update all settings for their gym.
create policy gym_settings_owner_full_access
on public.gym_settings
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access: staff can read gym settings needed for operations, no writes.
create policy gym_settings_staff_role_access
on public.gym_settings
for select
to authenticated
using (public.is_gym_staff(gym_id));

-- Service role bypass: backend automation can access all gym settings.
create policy gym_settings_service_role_bypass
on public.gym_settings
for all
to service_role
using (true)
with check (true);

-- =========================
-- gym_staff
-- =========================

-- Owner full access: gym owner can manage staff rows for their gym.
create policy gym_staff_owner_full_access
on public.gym_staff
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access: staff can view staff roster of their own gym.
create policy gym_staff_staff_role_access
on public.gym_staff
for select
to authenticated
using (public.is_gym_staff(gym_id));

-- Service role bypass: backend automation can access all staff rows.
create policy gym_staff_service_role_bypass
on public.gym_staff
for all
to service_role
using (true)
with check (true);

-- =========================
-- members
-- =========================

-- Owner full access: gym owner can fully manage all members in their gym.
create policy members_owner_full_access
on public.members
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access:
-- receptionist can read/write members in own gym,
-- trainer can read members in own gym.
create policy members_staff_role_access
on public.members
for all
to authenticated
using (
  public.current_staff_role(gym_id) in ('receptionist', 'trainer')
)
with check (
  public.current_staff_role(gym_id) = 'receptionist'
);

-- Service role bypass: backend automation can access all member rows.
create policy members_service_role_bypass
on public.members
for all
to service_role
using (true)
with check (true);

-- =========================
-- transactions
-- =========================

-- Owner full access: gym owner can fully access financial transactions for their gym.
create policy transactions_owner_full_access
on public.transactions
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access:
-- receptionist can create/select/update transactions in own gym,
-- trainer has no transaction access.
create policy transactions_staff_role_access
on public.transactions
for all
to authenticated
using (public.current_staff_role(gym_id) = 'receptionist')
with check (public.current_staff_role(gym_id) = 'receptionist');

-- Service role bypass: backend automation can access all transactions.
create policy transactions_service_role_bypass
on public.transactions
for all
to service_role
using (true)
with check (true);

-- =========================
-- attendance_logs
-- =========================

-- Owner full access: gym owner can fully manage attendance logs in their gym.
create policy attendance_logs_owner_full_access
on public.attendance_logs
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access:
-- receptionist and trainer can create/select attendance logs for own gym.
create policy attendance_logs_staff_role_access
on public.attendance_logs
for all
to authenticated
using (public.current_staff_role(gym_id) in ('receptionist', 'trainer'))
with check (public.current_staff_role(gym_id) in ('receptionist', 'trainer'));

-- Service role bypass: backend automation can access all attendance logs.
create policy attendance_logs_service_role_bypass
on public.attendance_logs
for all
to service_role
using (true)
with check (true);

-- =========================
-- leads
-- =========================

-- Owner full access: gym owner can fully manage all leads for their gym.
create policy leads_owner_full_access
on public.leads
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access:
-- receptionist can create/select/update leads in own gym,
-- trainer has no lead access.
create policy leads_staff_role_access
on public.leads
for all
to authenticated
using (public.current_staff_role(gym_id) = 'receptionist')
with check (public.current_staff_role(gym_id) = 'receptionist');

-- Service role bypass: backend automation can access all leads.
create policy leads_service_role_bypass
on public.leads
for all
to service_role
using (true)
with check (true);

-- =========================
-- notifications_queue
-- =========================

-- Owner full access: gym owner can inspect and manage notification queue for their gym.
create policy notifications_queue_owner_full_access
on public.notifications_queue
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access: staff can read queue status in their gym, no queue mutations.
create policy notifications_queue_staff_role_access
on public.notifications_queue
for select
to authenticated
using (public.is_gym_staff(gym_id));

-- Service role bypass: backend automation can process all queue records.
create policy notifications_queue_service_role_bypass
on public.notifications_queue
for all
to service_role
using (true)
with check (true);

-- =========================
-- campaigns
-- =========================

-- Owner full access: gym owner can fully access campaign analytics for their gym.
create policy campaigns_owner_full_access
on public.campaigns
for all
to authenticated
using (public.is_gym_owner(gym_id))
with check (public.is_gym_owner(gym_id));

-- Staff role-based access: staff can view campaign history for their gym, no writes.
create policy campaigns_staff_role_access
on public.campaigns
for select
to authenticated
using (public.is_gym_staff(gym_id));

-- Service role bypass: backend automation can write and read all campaign rows.
create policy campaigns_service_role_bypass
on public.campaigns
for all
to service_role
using (true)
with check (true);
