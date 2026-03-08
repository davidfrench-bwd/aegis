/**
 * Meta Graph API - Fetch Leads for Ad Sets
 * 
 * Queries Meta directly for lead count (doesn't rely on webhook ingestion)
 */

interface LeadCountResult {
  ad_set_id: string
  lead_count: number
  time_range_start: string
  time_range_end: string
}

/**
 * Get lead count for a specific ad set in a time range
 * Uses Meta's Insights API
 */
export async function getAdSetLeadCount(
  adSetId: string,
  timeRangeHours: number
): Promise<LeadCountResult> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN not configured')
  }

  const now = new Date()
  const startTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000)

  // Format for Meta API (YYYY-MM-DD)
  const dateStart = startTime.toISOString().split('T')[0]
  const dateEnd = now.toISOString().split('T')[0]

  try {
    // Use Insights API to get lead count
    const fields = 'actions'
    const timeRange = `{"since":"${dateStart}","until":"${dateEnd}"}`
    
    const url = `https://graph.facebook.com/v18.0/${adSetId}/insights?fields=${fields}&time_range=${encodeURIComponent(timeRange)}&access_token=${accessToken}`
    
    console.log(`[META] Fetching lead count for ad set ${adSetId} (${dateStart} to ${dateEnd})`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('[META] Insights API error:', error)
      throw new Error(`Failed to fetch insights: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const insights = data.data?.[0]

    // Find 'lead' action in the actions array
    let leadCount = 0
    if (insights?.actions) {
      const leadAction = insights.actions.find((a: any) => a.action_type === 'lead')
      leadCount = leadAction ? parseInt(leadAction.value) : 0
    }

    console.log(`[META] Ad set ${adSetId}: ${leadCount} leads in time range`)

    return {
      ad_set_id: adSetId,
      lead_count: leadCount,
      time_range_start: startTime.toISOString(),
      time_range_end: now.toISOString()
    }
  } catch (error) {
    console.error('[META] Error fetching lead count:', error)
    throw error
  }
}

/**
 * Get lead count for "today" (Meta's definition)
 * Meta considers "today" to be the current calendar day in ad account timezone
 */
export async function getAdSetLeadCountToday(adSetId: string): Promise<number> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN not configured')
  }

  try {
    // Use 'today' preset
    const fields = 'actions'
    const datePreset = 'today'
    
    const url = `https://graph.facebook.com/v18.0/${adSetId}/insights?fields=${fields}&date_preset=${datePreset}&access_token=${accessToken}`
    
    console.log(`[META] Fetching TODAY lead count for ad set ${adSetId}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('[META] Insights API error:', error)
      throw new Error(`Failed to fetch insights: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    const insights = data.data?.[0]

    // Find 'lead' action in the actions array
    let leadCount = 0
    if (insights?.actions) {
      const leadAction = insights.actions.find((a: any) => a.action_type === 'lead')
      leadCount = leadAction ? parseInt(leadAction.value) : 0
    }

    console.log(`[META] Ad set ${adSetId}: ${leadCount} leads TODAY`)

    return leadCount
  } catch (error) {
    console.error('[META] Error fetching today lead count:', error)
    throw error
  }
}
