import { createClient } from '@supabase/supabase-js';
import { verifyInternalSecret } from '../../../lib/auth';
import { evaluateQuizLeadBoost } from '../../../lib/automation/quiz-lead-boost';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const isAuthorized = verifyInternalSecret(req.headers.authorization);
  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'POST') {
    try {
      const externalLeadId = req.body.externalLeadId || `test-${Date.now()}`;
      
      const leadEvent = {
        clinic_id: 'apex',
        external_lead_id: externalLeadId,
        source: 'meta',
        campaign_id: req.body.campaignId || 'test-campaign',
        campaign_name: req.body.campaignName || 'Test Quiz Campaign',
        ad_set_id: req.body.adSetId || 'test-ad-set',
        ad_set_name: req.body.adSetName || 'Test Ad Set',
        payload: req.body.payload || {}
      };

      const { data: insertedLead, error: insertError } = await supabase
        .from('lead_events')
        .insert(leadEvent)
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(200).json({
            duplicate: true,
            message: 'Lead event already exists',
            externalLeadId
          });
        }
        throw insertError;
      }

      const evaluationResult = await evaluateQuizLeadBoost({
        clinicId: 'apex',
        leadEvent: insertedLead
      });

      return res.status(200).json({
        lead: insertedLead,
        evaluation: evaluationResult
      });
    } catch (error) {
      console.error('Test trigger error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}