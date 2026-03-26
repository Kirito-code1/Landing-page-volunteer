-- Run this in Supabase SQL Editor.
-- Adds category + required volunteer count + premium priority to events.

alter table public.events
  add column if not exists category text not null default 'other';

alter table public.events
  add column if not exists volunteers_needed integer not null default 10;

alter table public.events
  add column if not exists premium_priority boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_volunteers_needed_check'
  ) then
    alter table public.events
      add constraint events_volunteers_needed_check
      check (volunteers_needed > 0);
  end if;
end $$;

create index if not exists events_premium_priority_created_at_idx
  on public.events(premium_priority desc, created_at desc);
