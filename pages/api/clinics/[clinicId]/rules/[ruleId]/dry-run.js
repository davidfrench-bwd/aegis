import { createClient } from '@supabase/supabase-js';
import { simulateQuizLeadBoost } from '../../../../../lib/automation/quiz-lead-boost';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * SECURITY WARNING:
 * This route is intentionally unauthenticated for internal admin tool use.
 * 
 * DEPLOYMENT REQUIREMENTS:
 * - This endpoint must ONLY be deployed behind external access protection:
 *   - Vercel authentication
 *   - Password protection (htpasswd, etc.)
 *   - VPN or internal network only
 *   - IP allowlist
 * 
 * DO NOT expose this endpoint to public internet without authentication.
 */
export default async function handler(req, res) {
  const { clinicId, ruleId } = req.query;

  if (req.method === 'POST') {
    try {
      const { data: rule, error: ruleError } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', ruleId)
        .eq('clinic_id', clinicId)
        .single();

      if (ruleError) throw ruleError;

      const dryRunResult = await simulateQuizLeadBoost(rule, {
        adSetId: req.body.adSetId || null,
        campaignName: req.body.campaignName || 'Quiz Campaign'
      });

      await supabase
        .from('rule_executions')
        .insert({
          rule_id: ruleId,
          clinic_id: clinicId,
          status: 'dry_run',
          triggered: false,
          reason: dryRunResult.reason,
          old_budget: dryRunResult.currentBudget,
          new_budget: dryRunResult.proposedBudget
        });

      return res.status(200).json(dryRunResult);
    } catch (error) {
      console.error('Dry run error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}