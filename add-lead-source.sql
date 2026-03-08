-- Add lead_source column to automation_rules
-- Options: 'meta_api' (query Meta directly) or 'webhook' (use lead_events table)
ALTER TABLE automation_rules 
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'meta_api';

-- Update existing rule to use Meta API
UPDATE automation_rules 
SET lead_source = 'meta_api'
WHERE id = 'quiz-lead-boost';
