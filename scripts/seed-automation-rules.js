const { createClient } = require('@supabase/supabase-js');

async function seedAutomationRules() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const quizLeadBoostRule = {
    id: 'quiz-lead-boost',
    clinic_id: 'apex',
    name: 'Quiz Lead Boost - Per Ad Set',
    is_active: true,
    trigger_type: 'lead_count',
    threshold: 1,
    time_window_hours: 24,
    scope: 'per_ad_set',
    action_type: 'increase_budget',
    percentage_change: 20,
    max_daily_budget: 150,
    frequency_limit: 'once_daily',
    campaign_name_filter: 'Quiz',
    ad_set_status_filter: 'ACTIVE'
  };

  const { data, error } = await supabase
    .from('automation_rules')
    .upsert(quizLeadBoostRule, { 
      onConflict: 'id', 
      returning: 'minimal' 
    });

  if (error) {
    console.error('Failed to seed automation rule:', error);
    process.exit(1);
  }

  console.log('Successfully seeded Quiz Lead Boost automation rule');
}

seedAutomationRules();