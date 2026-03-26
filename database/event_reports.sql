-- Run this in Supabase SQL Editor.
-- Adds post-event impact reports for organizers.

create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  organizer_id uuid not null,
  actual_attendees integer not null default 0,
  hours_per_volunteer numeric(6,2) not null default 1,
  outcome_text text,
  outcome_value integer,
  outcome_unit text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_reports_actual_attendees_check'
  ) then
    alter table public.event_reports
      add constraint event_reports_actual_attendees_check
      check (actual_attendees >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_reports_hours_per_volunteer_check'
  ) then
    alter table public.event_reports
      add constraint event_reports_hours_per_volunteer_check
      check (hours_per_volunteer > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_reports_outcome_value_check'
  ) then
    alter table public.event_reports
      add constraint event_reports_outcome_value_check
      check (outcome_value is null or outcome_value >= 0);
  end if;
end $$;

create index if not exists event_reports_organizer_idx
  on public.event_reports(organizer_id, updated_at desc);

create index if not exists event_reports_event_idx
  on public.event_reports(event_id);

create or replace function public.set_event_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_event_reports_updated_at on public.event_reports;
create trigger trigger_event_reports_updated_at
before update on public.event_reports
for each row execute function public.set_event_reports_updated_at();

alter table public.event_reports enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reports'
      and policyname = 'event_reports_select_policy'
  ) then
    create policy event_reports_select_policy
      on public.event_reports
      for select
      using (organizer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reports'
      and policyname = 'event_reports_insert_policy'
  ) then
    create policy event_reports_insert_policy
      on public.event_reports
      for insert
      with check (organizer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reports'
      and policyname = 'event_reports_update_policy'
  ) then
    create policy event_reports_update_policy
      on public.event_reports
      for update
      using (organizer_id = auth.uid())
      with check (organizer_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reports'
      and policyname = 'event_reports_delete_policy'
  ) then
    create policy event_reports_delete_policy
      on public.event_reports
      for delete
      using (organizer_id = auth.uid());
  end if;
end $$;
