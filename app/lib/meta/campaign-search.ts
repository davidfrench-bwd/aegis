/**
 * Meta Graph API - Campaign and Ad Set Search
 * 
 * Finds all campaigns/ad sets matching automation rule criteria
 */

interface Campaign {
  id: string
  name: string
  status: string
}

interface AdSet {
  id: string
  name: string
  status: string
  daily_budget?: string
  campaign_id: string
  campaign_name?: string
}

interface CampaignSearchResult {
  campaigns: Campaign[]
  adSets: AdSet[]
  totalAdSets: number
  activeAdSets: number
}

/**
 * Search for campaigns by name pattern and get their active ad sets
 */
export async function searchCampaignsByName(
  adAccountId: string,
  namePattern: string,
  statusFilter: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | null = 'ACTIVE'
): Promise<CampaignSearchResult> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    throw new Error('META_ACCESS_TOKEN not configured')
  }

  try {
    // Step 1: Fetch all campaigns from the ad account
    const campaignsUrl = `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns?fields=id,name,status&limit=100&access_token=${accessToken}`
    
    const campaignsResponse = await fetch(campaignsUrl)
    if (!campaignsResponse.ok) {
      const error = await campaignsResponse.json()
      throw new Error(`Failed to fetch campaigns: ${error.error?.message || 'Unknown error'}`)
    }

    const campaignsData = await campaignsResponse.json()
    const allCampaigns: Campaign[] = campaignsData.data || []

    // Step 2: Filter campaigns by name pattern (case-insensitive)
    const pattern = namePattern.toLowerCase()
    const matchingCampaigns = allCampaigns.filter(c => 
      c.name.toLowerCase().includes(pattern) &&
      (!statusFilter || c.status === statusFilter)
    )

    console.log(`Found ${matchingCampaigns.length} campaigns matching "${namePattern}"`)

    // Step 3: For each matching campaign, fetch ad sets
    const allAdSets: AdSet[] = []
    
    for (const campaign of matchingCampaigns) {
      const adSetsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/adsets?fields=id,name,status,daily_budget&limit=100&access_token=${accessToken}`
      
      const adSetsResponse = await fetch(adSetsUrl)
      if (!adSetsResponse.ok) {
        console.warn(`Failed to fetch ad sets for campaign ${campaign.id}`)
        continue
      }

      const adSetsData = await adSetsResponse.json()
      const campaignAdSets = (adSetsData.data || []).map((as: AdSet) => ({
        ...as,
        campaign_id: campaign.id,
        campaign_name: campaign.name
      }))

      allAdSets.push(...campaignAdSets)
    }

    // Step 4: Filter ad sets by status
    const activeAdSets = statusFilter 
      ? allAdSets.filter(as => as.status === statusFilter)
      : allAdSets

    console.log(`Found ${allAdSets.length} total ad sets, ${activeAdSets.length} active`)

    return {
      campaigns: matchingCampaigns,
      adSets: activeAdSets,
      totalAdSets: allAdSets.length,
      activeAdSets: activeAdSets.length
    }
  } catch (error) {
    console.error('Campaign search error:', error)
    throw error
  }
}

/**
 * Get monitoring status for a specific rule
 * Returns all ad sets that would trigger the rule
 */
export async function getRuleMonitoringStatus(
  adAccountId: string,
  campaignNameFilter: string,
  adSetStatusFilter: 'ACTIVE' | 'PAUSED' | null = 'ACTIVE'
): Promise<{
  adSets: Array<{
    id: string
    name: string
    campaign_name: string
    status: string
    current_budget_usd: number
  }>
  summary: {
    total_monitored: number
    total_budget_usd: number
  }
}> {
  const result = await searchCampaignsByName(
    adAccountId,
    campaignNameFilter,
    adSetStatusFilter
  )

  const adSetsWithBudget = result.adSets.map(as => ({
    id: as.id,
    name: as.name,
    campaign_name: as.campaign_name || 'Unknown',
    status: as.status,
    current_budget_usd: as.daily_budget 
      ? parseFloat(as.daily_budget) / 100 
      : 0
  }))

  const totalBudget = adSetsWithBudget.reduce((sum, as) => sum + as.current_budget_usd, 0)

  return {
    adSets: adSetsWithBudget,
    summary: {
      total_monitored: adSetsWithBudget.length,
      total_budget_usd: totalBudget
    }
  }
}