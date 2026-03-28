create extension if not exists pgcrypto;

create table if not exists public.donation_reports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  location text,
  summary text not null,
  amount_uzs bigint not null check (amount_uzs > 0),
  report_date date not null,
  bullets jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '[]'::jsonb,
  photos jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists donation_reports_date_idx
  on public.donation_reports(report_date desc, created_at desc);

create index if not exists donation_reports_published_idx
  on public.donation_reports(is_published, report_date desc);

create or replace function public.set_donation_reports_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trigger_donation_reports_updated_at on public.donation_reports;
create trigger trigger_donation_reports_updated_at
before update on public.donation_reports
for each row execute function public.set_donation_reports_updated_at();

alter table public.donation_reports enable row level security;

insert into storage.buckets (id, name, public)
values ('donation-report-files', 'donation-report-files', true)
on conflict (id) do nothing;
