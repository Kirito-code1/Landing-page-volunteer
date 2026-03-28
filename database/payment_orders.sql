create extension if not exists pgcrypto;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  merchant_order_id text not null unique,
  provider_order_id text,
  kind text not null check (kind in ('donation', 'premium')),
  provider text not null default 'uzum_checkout',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  provider_status text,
  amount_tiyin bigint not null check (amount_tiyin > 0),
  currency_code text not null default 'UZS',
  payer_email text,
  payer_name text,
  user_id uuid references auth.users(id) on delete set null,
  payment_details text,
  redirect_url text,
  premium_activated_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  provider_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists payment_orders_user_id_idx on public.payment_orders(user_id);
create index if not exists payment_orders_status_idx on public.payment_orders(status);
create index if not exists payment_orders_kind_idx on public.payment_orders(kind);

alter table public.payment_orders enable row level security;
