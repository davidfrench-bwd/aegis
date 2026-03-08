/**
 * Meta Graph API - Fetch Ad Sets for a Specific Campaign
 */

interface AdSet {
  id: string
  name: string
  status: string
  daily_budget?: string
}

interface CampaignAdSetsResult {
  campaign_id: string
  campaign_name?: string
  ad_sets: Array<{
    id: string
    name: string
    status: string
    current_budget_usd: number
  }>
  summary: {
    total_monitored: number
    total_budget_usd: number
  }
}

/**
 * Get all ad sets for a specific campaign ID
 */
export async function getCampaignAdSets(
  campaignId: string,
  statusFilter: 'ACTIVE' | 'PAUSED' | null = 'ACTIVE'
): Promise<CampaignAdSetsResult> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN not configured')
  }

  try {
    // Fetch campaign details
    const campaignUrl = `https://graph.facebook.com/v18.0/${campaignId}?fields=id,name&access_token=${accessToken}`
    const campaignResponse = await fetch(campaignUrl)
    
    if (!campaignResponse.ok) {
      const error = await campaignResponse.json()
      throw new Error(`Failed to fetch campaign: ${error.error?.message || 'Unknown error'}`)
    }

    const campaign = await campaignResponse.json()

    // Fetch ad sets for this campaign
    const adSetsUrl = `https://graph.facebook.com/v18.0/${campaignId}/adsets?fields=id,name,status,daily_budget&limit=100&access_token=${accessToken}`
    const adSetsResponse = await fetch(adSetsUrl)
    
    if (!adSetsResponse.ok) {
      const error = await adSetsResponse.json()
      throw new Error(`Failed to fetch ad sets: ${error.error?.message || 'Unknown error'}`)
    }

    const adSetsData = await adSetsResponse.json()
    const allAdSets: AdSet[] = adSetsData.data || []

    // Filter by status if needed
    const filteredAdSets = statusFilter
      ? allAdSets.filter(as => as.status === statusFilter)
      : allAdSets

    // Convert to output format
    const adSetsWithBudget = filteredAdSets.map(as => ({
      id: as.id,
      name: as.name,
      status: as.status,
      current_budget_usd: as.daily_budget 
        ? parseFloat(as.daily_budget) / 100 
        : 0
    }))

    const totalBudget = adSetsWithBudget.reduce((sum, as) => sum + as.current_budget_usd, 0)

    console.log(`Found ${adSetsWithBudget.length} ad sets for campaign ${campaign.name}`)

    return {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      ad_sets: adSetsWithBudget,
      summary: {
        total_monitored: adSetsWithBudget.length,
        total_budget_usd: totalBudget
      }
    }
  } catch (error) {
    console.error('Error fetching campaign ad sets:', error)
    throw error
  }
}
