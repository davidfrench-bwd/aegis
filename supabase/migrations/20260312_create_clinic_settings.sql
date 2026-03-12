-- Clinic settings: stores API keys and config for each clinic
create table if not exists clinic_settings (
  id uuid primary key default gen_random_uuid(),
  clinic_id text unique not null,
  clinic_name text not null,
  ghl_api_key text,
  ghl_location_id text,
  meta_ad_account_id text,
  meta_access_token text,
  tag_mapping jsonb not null default '{
    "leads": "quiz-lead",
    "phoneConsults": "consult-booked",
    "phoneConsultShows": "consult-completed",
    "phoneConsultNoShows": "consult-no-show",
    "exams": "exam-booked",
    "commits": "pre-paid",
    "selfScheduled": "consult-self-scheduled"
  }'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function update_clinic_settings_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clinic_settings_updated
  before update on clinic_settings
  for each row
  execute function update_clinic_settings_timestamp();

-- RLS: only authenticated users can read, only service role can write secrets
alter table clinic_settings enable row level security;

create policy "Authenticated users can view clinic settings"
  on clinic_settings for select
  to authenticated
  using (true);

create policy "Service role has full access"
  on clinic_settings for all
  to service_role
  using (true)
  with check (true);
