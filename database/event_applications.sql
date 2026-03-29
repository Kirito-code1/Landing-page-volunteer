-- Run this in Supabase SQL Editor.
-- Adds volunteer applications for events with moderation statuses + attendance tracking.

create table if not exists public.event_applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organizer_id uuid not null,
  volunteer_id uuid not null,
  volunteer_name text,
  volunteer_email text,
  volunteer_phone text,
  status text not null default 'pending',
  attended boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.event_applications
  add column if not exists attended boolean not null default false;

alter table public.event_applications
  add column if not exists checked_in_at timestamptz;

create unique index if not exists event_applications_unique_volunteer_per_event
  on public.event_applications(event_id, volunteer_id);

create index if not exists event_applications_event_status_idx
  on public.event_applications(event_id, status);

create index if not exists event_applications_organizer_idx
  on public.event_applications(organizer_id, created_at desc);

create index if not exists event_applications_event_attended_idx
  on public.event_applications(event_id, attended);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_applications_status_check'
  ) then
    alter table public.event_applications
      add constraint event_applications_status_check
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

alter table public.event_applications enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_applications'
      and policyname = 'event_applications_select_policy'
  ) then
    create policy event_applications_select_policy
      on public.event_applications
      for select
      using (
        status = 'approved'
        or volunteer_id = auth.uid()
        or organizer_id = auth.uid()
      );
  end if;
end $$;

drop policy if exists event_applications_delete_policy on public.event_applications;
drop policy if exists event_applications_insert_policy on public.event_applications;
drop policy if exists event_applications_update_policy on public.event_applications;

create policy event_applications_update_policy
  on public.event_applications
  for update
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());
