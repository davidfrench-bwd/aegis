-- Seed the quiz-lead-boost rule for Apex
INSERT INTO automation_rules (
  id, clinic_id, name, is_active, trigger_type, threshold,
  time_window_hours, scope, action_type, percentage_change,
  max_daily_budget, frequency_limit, campaign_name_filter,
  ad_set_status_filter
) VALUES (
  'quiz-lead-boost', 
  'apex', 
  'Quiz Lead Boost - Per Ad Set', 
  true,
  'lead_count', 
  1, 
  24, 
  'per_ad_set', 
  'increase_budget', 
  20,
  150, 
  'once_daily', 
  'Quiz', 
  'ACTIVE'
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = EXCLUDED.is_active,
  trigger_type = EXCLUDED.trigger_type,
  threshold = EXCLUDED.threshold,
  time_window_hours = EXCLUDED.time_window_hours,
  scope = EXCLUDED.scope,
  action_type = EXCLUDED.action_type,
  percentage_change = EXCLUDED.percentage_change,
  max_daily_budget = EXCLUDED.max_daily_budget,
  frequency_limit = EXCLUDED.frequency_limit,
  campaign_name_filter = EXCLUDED.campaign_name_filter,
  ad_set_status_filter = EXCLUDED.ad_set_status_filter;
