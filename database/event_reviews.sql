-- Run this in Supabase SQL Editor.
-- Adds post-event reviews and ratings between volunteers and organizers.

create table if not exists public.event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  application_id uuid not null references public.event_applications(id) on delete cascade,
  organizer_id uuid not null,
  volunteer_id uuid not null,
  author_id uuid not null,
  author_role text not null,
  target_id uuid not null,
  target_role text not null,
  rating integer not null,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_reviews_application_author_idx
  on public.event_reviews(application_id, author_id);

create index if not exists event_reviews_target_idx
  on public.event_reviews(target_id, target_role, created_at desc);

create index if not exists event_reviews_event_idx
  on public.event_reviews(event_id, created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_reviews_rating_check'
  ) then
    alter table public.event_reviews
      add constraint event_reviews_rating_check
      check (rating between 1 and 5);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_reviews_author_role_check'
  ) then
    alter table public.event_reviews
      add constraint event_reviews_author_role_check
      check (author_role in ('volunteer', 'organizer'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'event_reviews_target_role_check'
  ) then
    alter table public.event_reviews
      add constraint event_reviews_target_role_check
      check (target_role in ('volunteer', 'organizer'));
  end if;
end $$;

create or replace function public.set_event_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trigger_event_reviews_updated_at on public.event_reviews;
create trigger trigger_event_reviews_updated_at
before update on public.event_reviews
for each row execute function public.set_event_reviews_updated_at();

alter table public.event_reviews enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reviews'
      and policyname = 'event_reviews_select_policy'
  ) then
    create policy event_reviews_select_policy
      on public.event_reviews
      for select
      using (
        target_role = 'organizer'
        or author_id = auth.uid()
        or target_id = auth.uid()
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reviews'
      and policyname = 'event_reviews_insert_policy'
  ) then
    create policy event_reviews_insert_policy
      on public.event_reviews
      for insert
      with check (
        author_id = auth.uid()
        and (
          (
            author_role = 'volunteer'
            and volunteer_id = auth.uid()
            and target_role = 'organizer'
            and target_id = organizer_id
          )
          or (
            author_role = 'organizer'
            and organizer_id = auth.uid()
            and target_role = 'volunteer'
            and target_id = volunteer_id
          )
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reviews'
      and policyname = 'event_reviews_update_policy'
  ) then
    create policy event_reviews_update_policy
      on public.event_reviews
      for update
      using (author_id = auth.uid())
      with check (author_id = auth.uid());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'event_reviews'
      and policyname = 'event_reviews_delete_policy'
  ) then
    create policy event_reviews_delete_policy
      on public.event_reviews
      for delete
      using (author_id = auth.uid());
  end if;
end $$;
