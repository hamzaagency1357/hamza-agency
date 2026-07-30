-- HAMZA AGENCY PR101 KPI schema guard
-- Runs before the hardening migration so JSON dimensions are never used as a btree primary-key column.

create table if not exists public.product_kpi_daily (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  metric_date date not null,
  metric_key text not null,
  dimensions_hash text not null default md5('{}'::text),
  metric_value numeric not null default 0,
  dimensions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (tenant_id,metric_date,metric_key,dimensions_hash),
  check (dimensions_hash = md5(dimensions::text))
);

alter table public.product_kpi_daily enable row level security;
comment on table public.product_kpi_daily is 'Tenant-scoped daily product metrics keyed by a deterministic JSON dimensions hash.';
