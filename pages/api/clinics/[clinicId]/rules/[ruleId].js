import { createClient } from '@supabase/supabase-js';

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

  if (req.method === 'PUT') {
    try {
      const ruleData = {
        id: ruleId,
        clinic_id: clinicId,
        name: req.body.name,
        is_active: req.body.is_active,
        trigger_type: req.body.trigger_type,
        threshold: req.body.threshold,
        time_window_hours: req.body.time_window_hours,
        scope: req.body.scope,
        action_type: req.body.action_type,
        percentage_change: req.body.percentage_change,
        max_daily_budget: req.body.max_daily_budget,
        frequency_limit: req.body.frequency_limit,
        campaign_name_filter: req.body.campaign_name_filter,
        ad_set_status_filter: req.body.ad_set_status_filter
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .upsert(ruleData, { 
          onConflict: 'id',
          returning: 'representation'
        });

      if (error) throw error;

      return res.status(200).json(data[0]);
    } catch (error) {
      console.error('Rule save error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('id', ruleId)
        .eq('clinic_id', clinicId)
        .single();

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      console.error('Rule fetch error:', error);
      return res.status(404).json({ error: 'Rule not found' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}