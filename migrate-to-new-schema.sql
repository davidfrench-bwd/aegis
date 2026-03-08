-- Step 1: Rename old table as backup
ALTER TABLE automation_rules RENAME TO automation_rules_old;

-- Step 2: Create new automation_rules table with correct schema
CREATE TABLE automation_rules (
    id TEXT PRIMARY KEY,
    clinic_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    trigger_type TEXT NOT NULL,
    threshold INTEGER NOT NULL,
    time_window_hours INTEGER NOT NULL,
    scope TEXT NOT NULL,
    action_type TEXT NOT NULL,
    percentage_change NUMERIC NOT NULL,
    max_daily_budget NUMERIC NOT NULL,
    frequency_limit TEXT NOT NULL,
    campaign_name_filter TEXT,
    ad_set_status_filter TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Migrate data from old to new schema
INSERT INTO automation_rules (
    id,
    clinic_id,
    name,
    is_active,
    trigger_type,
    threshold,
    time_window_hours,
    scope,
    action_type,
    percentage_change,
    max_daily_budget,
    frequency_limit,
    campaign_name_filter,
    ad_set_status_filter,
    created_at,
    updated_at
)
SELECT 
    rule_id as id,
    clinic_id,
    rule_name as name,
    enabled as is_active,
    trigger_type,
    trigger_threshold as threshold,
    24 as time_window_hours, -- Converting from '24h' text to integer
    trigger_scope as scope,
    action_type,
    action_percentage as percentage_change,
    max_daily_budget,
    action_frequency as frequency_limit,
    campaign_name_filter,
    ad_set_status_filter,
    created_at,
    updated_at
FROM automation_rules_old;

-- Step 4: Create missing tables if they don't exist yet

-- Check and create lead_events
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    external_lead_id TEXT,
    source TEXT NOT NULL,
    campaign_id TEXT,
    campaign_name TEXT,
    ad_set_id TEXT,
    ad_set_name TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_lead_source UNIQUE (clinic_id, source, external_lead_id)
);

-- Check and create rule_executions
CREATE TABLE IF NOT EXISTS rule_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id TEXT NOT NULL,
    clinic_id TEXT NOT NULL,
    ad_set_id TEXT,
    status TEXT NOT NULL,
    triggered BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    old_budget NUMERIC,
    new_budget NUMERIC,
    meta_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check and create rule_locks
CREATE TABLE IF NOT EXISTS rule_locks (
    rule_id TEXT NOT NULL,
    ad_set_id TEXT NOT NULL,
    last_executed_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (rule_id, ad_set_id)
);

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_events_clinic_ad_set ON lead_events (clinic_id, ad_set_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule ON rule_executions (rule_id, created_at DESC);

-- Step 6: Create update trigger function if not exists
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Step 7: Create triggers
DROP TRIGGER IF EXISTS update_automation_rules_modtime ON automation_rules;
CREATE TRIGGER update_automation_rules_modtime
BEFORE UPDATE ON automation_rules
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

DROP TRIGGER IF EXISTS update_rule_locks_modtime ON rule_locks;
CREATE TRIGGER update_rule_locks_modtime
BEFORE UPDATE ON rule_locks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Step 8: Drop old table (comment this out if you want to keep it as backup)
-- DROP TABLE automation_rules_old;
