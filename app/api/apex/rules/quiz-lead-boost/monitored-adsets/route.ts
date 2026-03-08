import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase/server'
import { getRuleMonitoringStatus } from '@/app/lib/meta/campaign-search'

/**
 * GET /api/apex/rules/quiz-lead-boost/monitored-adsets
 * 
 * Returns all ad sets currently being monitored by this rule
 * Shows real-time status from Meta API
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the rule configuration
    const { data: rule, error: ruleError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('id', 'quiz-lead-boost')
      .eq('clinic_id', 'apex')
      .single()

    if (ruleError || !rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    // Get ad account ID from environment
    // TODO: Should come from clinic configuration
    const adAccountId = process.env.META_AD_ACCOUNT_ID || '389246342161524'

    // Fetch monitored ad sets from Meta
    const monitoring = await getRuleMonitoringStatus(
      adAccountId,
      rule.campaign_name_filter || 'Quiz',
      rule.ad_set_status_filter as 'ACTIVE' | null
    )

    return NextResponse.json({
      rule: {
        id: rule.id,
        name: rule.name,
        is_active: rule.is_active,
        campaign_filter: rule.campaign_name_filter,
        status_filter: rule.ad_set_status_filter
      },
      monitoring: {
        ad_sets: monitoring.adSets,
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
