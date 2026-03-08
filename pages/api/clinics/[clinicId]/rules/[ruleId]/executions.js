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
  const limit = parseInt(req.query.limit) || 20;

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('rule_executions')
        .select('*')
        .eq('rule_id', ruleId)
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return res.status(200).json(data);
    } catch (error) {
      console.error('Executions fetch error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}