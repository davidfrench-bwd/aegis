import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

// Map clinic IDs to Meta Ad Account IDs
const CLINIC_AD_ACCOUNTS: Record<string, string> = {
  'apex-pain-solutions': '491637880413090',
  'natural-foundations': '1234567890', // Replace with actual account ID
  'thrive-restoration': '1234567891', // Replace with actual account ID
  'advanced-shockwave': '1234567892', // Replace with actual account ID
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { clinic_id, campaign_id, campaign_name_filter } = body

    const accessToken = process.env.META_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json({ error: 'Meta API not configured' }, { status: 500 })
    }

    const adAccountId = CLINIC_AD_ACCOUNTS[clinic_id]
    if (!adAccountId) {
      return NextResponse.json({ error: 'Unknown clinic' }, { status: 400 })
    }

    let adSets: any[] = []
    
    if (campaign_id) {
      // Specific campaign ID - get ad sets from that campaign
      const url = `https://graph.facebook.com/v18.0/${campaign_id}/adsets?fields=id,name,status&limit=100&access_token=${accessToken}`
      const response = await fetch(url)
      
      if (!response.ok) {
        const error = await response.json()
        return NextResponse.json({ error: `Meta API error: ${error.error?.message || 'Unknown'}` }, { status: 500 })
      }
      
      const data = await response.json()
      adSets = data.data || []
      
    } else {
      // Get all campaigns first, then filter by name if needed
      const campaignsUrl = `https://graph.facebook.com/v18.0/act_${adAccountId}/campaigns?fields=id,name,status&limit=100&access_token=${accessToken}`
      const campaignsResponse = await fetch(campaignsUrl)
      
      if (!campaignsResponse.ok) {
        const error = await campaignsResponse.json()
        return NextResponse.json({ error: `Meta API error: ${error.error?.message || 'Unknown'}` }, { status: 500 })
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
    
    return NextResponse.json({
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
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}