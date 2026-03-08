-- Create automation_rules table
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

-- Create lead_events table
CREATE TABLE lead_events (
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

-- Create rule_executions table
CREATE TABLE rule_executions (
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

-- Create rule_locks table
CREATE TABLE rule_locks (
    rule_id TEXT NOT NULL,
    ad_set_id TEXT NOT NULL,
    last_executed_at TIMESTAMPTZ,
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (rule_id, ad_set_id)
);

-- Create indexes for performance
CREATE INDEX idx_lead_events_clinic_ad_set ON lead_events (clinic_id, ad_set_id, created_at DESC);
CREATE INDEX idx_rule_executions_rule ON rule_executions (rule_id, created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for automation_rules
CREATE TRIGGER update_automation_rules_modtime
BEFORE UPDATE ON automation_rules
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Trigger for rule_locks
CREATE TRIGGER update_rule_locks_modtime
BEFORE UPDATE ON rule_locks
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();