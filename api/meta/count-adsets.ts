import type { VercelRequest, VercelResponse } from '@vercel/node'

// Map clinic IDs to Meta Ad Account IDs
const CLINIC_AD_ACCOUNTS: Record<string, string> = {
  'apex-pain-solutions': '491637880413090',
  'natural-foundations': '1234567890', // Replace with actual account ID
  'thrive-restoration': '1234567891', // Replace with actual account ID
  'advanced-shockwave': '1234567892', // Replace with actual account ID
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' })
  }

  try {
    const { clinic_id, campaign_id, campaign_name_filter } = req.body

    const accessToken = process.env.META_ACCESS_TOKEN
    if (!accessToken) {
      return res.status(500).json({ error: 'Meta API not configured' })
    }

    const adAccountId = CLINIC_AD_ACCOUNTS[clinic_id]
    if (!adAccountId) {
      return res.status(400).json({ error: 'Unknown clinic' })
    }

    let adSets: any[] = []
    
    if (campaign_id) {
      // Specific campaign ID - get ad sets from that campaign
      const url = `https://graph.facebook.com/v18.0/${campaign_id}/adsets?fields=id,name,status&limit=100&access_token=${accessToken}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const error = await response.json()
        return res.status(500).json({ error: `Meta API error: ${error.error?.message || 'Unknown'}` })
      }
      
      const data = await response.json()
      adSets = data.data || []
      
    } else {
      // Get all campaigns first, then filter by name if needed
      const campaignsUrl = `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns?fields=id,name,status&limit=100&access_token=${accessToken}`
      const campaignsResponse = await fetch(campaignsUrl)
      
      if (!campaignsResponse.ok) {
        const error = await campaignsResponse.json()
        return res.status(500).json({ error: `Meta API error: ${error.error?.message || 'Unknown'}` })
      }
      
      const campaignsData = await campaignsResponse.json()
      let campaigns = campaignsData.data || []
      
      // Filter campaigns by name if filter provided
      if (campaign_name_filter) {
        campaigns = campaigns.filter((c: any) => 
          c.name.toLowerCase().includes(campaign_name_filter.toLowerCase())
        )
      }
      
      // Get ad sets from all matching campaigns
      for (const campaign of campaigns) {
        const adSetsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/adsets?fields=id,name,status&limit=100&access_token=${accessToken}`
        const adSetsResponse = await fetch(adSetsUrl)
        
        if (adSetsResponse.ok) {
          const adSetsData = await adSetsResponse.json()
          adSets = adSets.concat(adSetsData.data || [])
        }
      }
    }
    
    // Filter to only ACTIVE ad sets
    const activeAdSets = adSets.filter(as => as.status === 'ACTIVE')
    
    return res.status(200).json({
      total_ad_sets: adSets.length,
      active_ad_sets: activeAdSets.length,
      ad_sets: activeAdSets.map(as => ({
        id: as.id,
        name: as.name,
        status: as.status
      }))
    })
    
  } catch (error) {
    console.error('Error counting ad sets:', error)
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
