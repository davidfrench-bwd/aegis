import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCampaignAdSets } from '@/app/lib/meta/campaign-adsets'
import { getAdSetLeadMetrics } from '@/app/lib/meta/fetch-leads'

/**
 * GET /api/apex/rules/quiz-lead-boost/monitored-adsets
 * 
 * Returns all ad sets currently being monitored by this rule
 * Shows real-time status from Meta API
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the rule configuration
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', 'quiz-lead-boost')
      .eq('clinic_id', 'apex-pain-solutions')
      .single()

    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Check if campaign_id is set
    if (!rule.campaign_id) {
      return NextResponse.json({ 
        error: 'Campaign ID not set. Please configure the campaign ID in the rule settings.' 
      }, { status: 400 })
    }

    // Fetch monitored ad sets from Meta
    const monitoring = await getCampaignAdSets(
      rule.campaign_id,
      rule.ad_set_status_filter as 'ACTIVE' | null
    )

    // Enrich with lead metrics
    const adSetsWithLeads = await Promise.all(
      monitoring.ad_sets.map(async (adSet) => {
        try {
          const metrics = await getAdSetLeadMetrics(adSet.id)
          return {
            ...adSet,
            lead_count_today: metrics.leads_today,
            lead_count_lifetime: metrics.leads_lifetime,
            date_range_start: metrics.date_range_start,
            date_range_end: metrics.date_range_end
          }
        } catch (error) {
          console.error(`Failed to get lead metrics for ${adSet.id}:`, error)
          return {
            ...adSet,
            lead_count_today: 0,
            lead_count_lifetime: 0
          }
        }
      })
    )

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name,
        is_active: rule.is_active,
        campaign_id: rule.campaign_id,
        status_filter: rule.ad_set_status_filter
      },
      monitoring: {
        campaign_name: monitoring.campaign_name,
        ad_sets: adSetsWithLeads,
        summary: monitoring.summary
      }
    })
  } catch (error) {
    console.error('Error fetching monitored ad sets:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
