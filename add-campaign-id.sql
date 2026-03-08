-- Add campaign_id column to automation_rules
ALTER TABLE automation_rules 
ADD COLUMN IF NOT EXISTS campaign_id TEXT;

-- Note: You'll need to set the campaign_id via the UI after running this migration
