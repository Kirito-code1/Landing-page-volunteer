create extension if not exists pgcrypto;

create table if not exists public.manual_payment_requests (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('donation', 'premium')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  amount_uzs bigint not null check (amount_uzs > 0),
  user_id uuid references auth.users(id) on delete set null,
  payer_name text,
  payer_email text,
  contact_phone text,
  transfer_reference text,
  note text,
  review_note text,
  reviewed_by_email text,
  reviewed_at timestamptz,
  premium_activated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.manual_payment_requests
  add column if not exists attachment_url text,
  add column if not exists attachment_name text,
  add column if not exists attachment_path text;

create index if not exists manual_payment_requests_status_idx on public.manual_payment_requests(status);
create index if not exists manual_payment_requests_kind_idx on public.manual_payment_requests(kind);
create index if not exists manual_payment_requests_user_id_idx on public.manual_payment_requests(user_id);

alter table public.manual_payment_requests enable row level security;

insert into storage.buckets (id, name, public)
values ('manual-payment-files', 'manual-payment-files', true)
on conflict (id) do nothing;
