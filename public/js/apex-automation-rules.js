document.addEventListener('DOMContentLoaded', () => {
  const CLINIC_ID = 'apex';
  const RULE_ID = 'quiz-lead-boost';

  // Direct Supabase access since this is a static site
  const supabase = window.supabaseClient;

  async function loadExistingRule() {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', RULE_ID)
        .eq('clinic_id', CLINIC_ID)
        .single();

      if (error) throw error;

      // Populate form fields with correct IDs
      if (document.getElementById('toggle-quiz-lead-boost')) {
        document.getElementById('toggle-quiz-lead-boost').checked = data.is_active;
      }
      if (document.getElementById('trigger-type')) {
        document.getElementById('trigger-type').value = data.trigger_type;
      }
      if (document.getElementById('trigger-threshold')) {
        document.getElementById('trigger-threshold').value = data.threshold;
      }
      if (document.getElementById('action-percentage')) {
        document.getElementById('action-percentage').value = data.percentage_change;
      }
      if (document.getElementById('action-max-budget')) {
        document.getElementById('action-max-budget').value = data.max_daily_budget;
      }
      if (document.getElementById('filter-campaign')) {
        document.getElementById('filter-campaign').value = data.campaign_name_filter || '';
      }
      if (document.getElementById('filter-status')) {
        document.getElementById('filter-status').value = data.ad_set_status_filter || 'ACTIVE';
      }
    } catch (error) {
      console.error('Failed to load from Supabase:', error);
      alert('Failed to load configuration from database. Using defaults.');
    }
  }

  window.saveRule = async function() {
    try {
      const ruleData = {
        is_active: document.getElementById('toggle-quiz-lead-boost')?.checked || true,
        trigger_type: document.getElementById('trigger-type')?.value || 'lead_count',
        threshold: parseInt(document.getElementById('trigger-threshold')?.value || '1'),
        time_window_hours: 24,
        scope: 'per_ad_set',
        action_type: 'increase_budget',
        percentage_change: parseFloat(document.getElementById('action-percentage')?.value || '20'),
        max_daily_budget: parseFloat(document.getElementById('action-max-budget')?.value || '150'),
        frequency_limit: 'once_daily',
        campaign_name_filter: document.getElementById('filter-campaign')?.value || 'Quiz',
        ad_set_status_filter: document.getElementById('filter-status')?.value || 'ACTIVE'
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .update(ruleData)
        .eq('id', RULE_ID)
        .eq('clinic_id', CLINIC_ID)
        .select();

      if (error) throw error;

      alert('✅ Rule saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('❌ Failed to save rule:\n\n' + error.message);
    }
  };

  window.testRule = function() {
    alert('🧪 Test feature coming soon!\n\nFor now, use the internal test trigger endpoint.');
  };

  window.viewLogs = function() {
    window.open('/apex-automation-logs.html', '_blank');
  };

  window.addNewRule = function() {
    alert('➕ Add New Rule feature coming soon!');
  };

  // Toggle rule enabled/disabled
  const toggleElement = document.getElementById('toggle-quiz-lead-boost');
  if (toggleElement) {
    toggleElement.addEventListener('change', function(e) {
      const card = document.getElementById('rule-quiz-lead-boost');
      if (card) {
        if (e.target.checked) {
          card.classList.remove('disabled');
        } else {
          card.classList.add('disabled');
        }
      }
    });
  }

  // Load config on page load
  loadExistingRule();
});