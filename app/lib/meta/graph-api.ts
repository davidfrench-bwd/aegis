/**
 * Meta Graph API helpers
 * 
 * REQUIRED ENV VAR:
 * - META_ACCESS_TOKEN: User access token with ads_read permission
 */

interface LeadDetails {
  id: string
  created_time: string
  ad_id?: string
  ad_name?: string
  adset_id?: string
  adset_name?: string
  campaign_id?: string
  campaign_name?: string
}

/**
 * Fetch full lead details from Meta Graph API
 */
export async function fetchLeadDetails(leadId: string): Promise<LeadDetails | null> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    console.error('META_ACCESS_TOKEN not configured')
    return null
  }

  try {
    const fields = [
      'id',
      'created_time',
      'ad_id',
      'ad_name',
      'adset_id',
      'adset_name',
      'campaign_id',
      'campaign_name'
    ].join(',')

    const url = `https://graph.facebook.com/v18.0/${leadId}?fields=${fields}&access_token=${accessToken}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Graph API error:', error)
      return null
    }

    const data = await response.json()
    return data as LeadDetails
  } catch (error) {
    console.error('Failed to fetch lead details:', error)
    return null
  }
}

/**
 * Fetch ad set details (for getting current budget)
 */
export async function fetchAdSetDetails(adSetId: string): Promise<{
  id: string
  name: string
  daily_budget?: string
  status: string
} | null> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    console.error('META_ACCESS_TOKEN not configured')
    return null
  }

  try {
    const fields = 'id,name,daily_budget,status'
    const url = `https://graph.facebook.com/v18.0/${adSetId}?fields=${fields}&access_token=${accessToken}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Graph API error fetching ad set:', error)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch ad set details:', error)
    return null
  }
}

/**
 * Update ad set daily budget
 */
export async function updateAdSetBudget(adSetId: string, newBudgetCents: number): Promise<{
  success: boolean
  error?: string
}> {
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!accessToken) {
    console.error('META_ACCESS_TOKEN not configured')
    return { success: false, error: 'META_ACCESS_TOKEN not configured' }
  }

  try {
    const url = `https://graph.facebook.com/v18.0/${adSetId}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        daily_budget: newBudgetCents.toString(),
        access_token: accessToken
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Graph API error updating budget:', error)
      return { success: false, error: error.error?.message || 'Update failed' }
    }

    const result = await response.json()
    return { success: result.success === true }
  } catch (error) {
    console.error('Failed to update ad set budget:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}