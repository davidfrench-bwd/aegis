-- Monthly clinic metrics, refreshed daily by cron
create table if not exists clinic_metrics (
  id uuid primary key default gen_random_uuid(),
  clinic_id text not null references clinic_settings(clinic_id) on delete cascade,
  month text not null,
  leads int not null default 0,
  phone_consults int not null default 0,
  phone_consult_shows int not null default 0,
  phone_consult_no_shows int not null default 0,
  exams int not null default 0,
  commits int not null default 0,
  self_scheduled int not null default 0,
  ad_spend numeric(10,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique(clinic_id, month)
);

-- RLS
alter table clinic_metrics enable row level security;

create policy "Authenticated users can view metrics"
  on clinic_metrics for select
  to authenticated
  using (true);

create policy "Service role has full access to metrics"
  on clinic_metrics for all
  to service_role
  using (true)
  with check (true);
