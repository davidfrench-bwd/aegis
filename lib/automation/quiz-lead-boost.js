import { createClient } from '@supabase/supabase-js';
import { fetchMetaAdSetBudget, updateMetaAdSetBudget } from '../meta-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function logExecution({ ruleId, clinicId, adSetId, status, triggered, reason, oldBudget, newBudget, metaResponse }) {
  await supabase.from('rule_executions').insert({
    rule_id: ruleId,
    clinic_id: clinicId,
    ad_set_id: adSetId || null,
    status,
    triggered,
    reason,
    old_budget: oldBudget || null,
    new_budget: newBudget || null,
    meta_response: metaResponse || null
  });
}

export async function evaluateQuizLeadBoost({ clinicId, leadEvent }) {
  try {
    // 1. Load active Apex rule
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', 'quiz-lead-boost')
      .eq('clinic_id', clinicId)
      .eq('is_active', true)
      .single();

    if (ruleError || !rule) {
      await logExecution({
        ruleId: 'quiz-lead-boost',
        clinicId,
        adSetId: leadEvent.ad_set_id,
        status: 'skipped',
        triggered: false,
        reason: 'No active rule found'
      });
      
      return { 
        status: 'skipped', 
        reason: 'No active rule found' 
      };
    }

    // 2. Validate campaign filter
    if (!leadEvent.campaign_name?.toLowerCase().includes('quiz')) {
      await logExecution({
        ruleId: rule.id,
        clinicId,
        adSetId: leadEvent.ad_set_id,
        status: 'skipped',
        triggered: false,
        reason: `Campaign '${leadEvent.campaign_name}' does not match filter`
      });
      
      return { 
        status: 'skipped', 
        reason: `Campaign '${leadEvent.campaign_name}' does not match filter` 
      };
    }

    // 3. Check lead count in last 24 hours
    const { count, error: countError } = await supabase
      .from('lead_events')
      .select('*', { count: 'exact' })
      .eq('clinic_id', clinicId)
      .eq('ad_set_id', leadEvent.ad_set_id)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (countError) throw countError;

    if (count < rule.threshold) {
      await logExecution({
        ruleId: rule.id,
        clinicId,
        adSetId: leadEvent.ad_set_id,
        status: 'skipped',
        triggered: false,
        reason: `Not enough leads (${count}/${rule.threshold})`
      });
      
      return { 
        status: 'skipped', 
        reason: `Not enough leads (${count}/${rule.threshold})` 
      };
    }

    // 4. Check rule lock
    const { data: lockData, error: lockError } = await supabase
      .from('rule_locks')
      .select('*')
      .eq('rule_id', rule.id)
      .eq('ad_set_id', leadEvent.ad_set_id)
      .single();

    if (lockError && lockError.code !== 'PGRST116') throw lockError;

    // Check if locked
    if (lockData && new Date(lockData.locked_until) > new Date()) {
      await logExecution({
        ruleId: rule.id,
        clinicId,
        adSetId: leadEvent.ad_set_id,
        status: 'skipped',
        triggered: false,
        reason: 'Ad set locked from previous execution'
      });
      
      return { 
        status: 'skipped', 
        reason: 'Ad set locked from previous execution' 
      };
    }

    // 5. Fetch current budget
    const currentBudget = await fetchMetaAdSetBudget(leadEvent.ad_set_id);

    // 6. Compute new budget
    const proposedBudget = Math.min(
      currentBudget * (1 + rule.percentage_change / 100),
      rule.max_daily_budget
    );

    // 7. Skip if no meaningful change
    if (proposedBudget <= currentBudget) {
      await logExecution({
        ruleId: rule.id,
        clinicId,
        adSetId: leadEvent.ad_set_id,
        status: 'skipped',
        triggered: false,
        reason: 'No budget increase needed',
        oldBudget: currentBudget,
        newBudget: proposedBudget
      });

      return { 
        status: 'skipped', 
        reason: 'No budget increase needed',
        currentBudget,
        proposedBudget
      };
    }

    // 8. Update Meta budget
    const metaResponse = await updateMetaAdSetBudget(
      leadEvent.ad_set_id, 
      proposedBudget
    );

    // 9. Record execution and lock
    await logExecution({
      ruleId: rule.id,
      clinicId,
      adSetId: leadEvent.ad_set_id,
      status: 'success',
      triggered: true,
      reason: 'Budget increased successfully',
      oldBudget: currentBudget,
      newBudget: proposedBudget,
      metaResponse
    });

    await supabase
      .from('rule_locks')
      .upsert({
        rule_id: rule.id,
        ad_set_id: leadEvent.ad_set_id,
        last_executed_at: new Date().toISOString(),
        locked_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, { onConflict: 'rule_id, ad_set_id' });

    return {
      status: 'success',
      currentBudget,
      proposedBudget,
      reason: 'Budget increased successfully'
    };
  } catch (error) {
    await logExecution({
      ruleId: 'quiz-lead-boost',
      clinicId,
      adSetId: leadEvent.ad_set_id,
      status: 'error',
      triggered: false,
      reason: error.message
    });

    return { 
      status: 'error', 
      reason: error.message 
    };
  }
}

export async function simulateQuizLeadBoost(rule, options = {}) {
  const currentBudget = options.currentBudget || 100;
  const proposedBudget = Math.min(
    currentBudget * (1 + rule.percentage_change / 100),
    rule.max_daily_budget
  );

  return {
    status: 'dry_run',
    currentBudget,
    proposedBudget,
    reason: `Dry run: 1 lead found in last 24h for ad set ${options.adSetId || 'N/A'}. ` +
            `Current budget $${currentBudget.toFixed(2)}. ` +
            `Proposed budget $${proposedBudget.toFixed(2)}. ` +
            `Cap $${rule.max_daily_budget.toFixed(2)}.`
  };
}