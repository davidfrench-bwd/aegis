import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabase/service'
import { evaluateQuizLeadBoost } from '@/app/lib/automation/evaluate-quiz-lead-boost'

/**
 * SECURITY: This route requires INTERNAL_TRIGGER_SECRET
 * Used for testing lead ingestion and rule evaluation
 */

function verifyInternalSecret(authHeader: string | null): boolean {
  const secret = process.env.INTERNAL_TRIGGER_SECRET
  
  if (!secret) {
    console.error('INTERNAL_TRIGGER_SECRET is not set in environment')
    return false
  }
  
  if (!authHeader) {
    return false
  }
  
  const parts = authHeader.split('Bearer ')
  if (parts.length !== 2) {
    return false
  }
  
  return parts[1] === secret
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  if (!verifyInternalSecret(authHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const externalLeadId = body.externalLeadId || `test-${Date.now()}`
    
    const leadEvent = {
      clinic_id: 'apex',
      external_lead_id: externalLeadId,
      source: 'meta',
      campaign_id: body.campaignId || 'test-campaign',
      campaign_name: body.campaignName || 'Test Quiz Campaign',
      ad_set_id: body.adSetId || 'test-ad-set',
      ad_set_name: body.adSetName || 'Test Ad Set',
      payload: body.payload || {}
    }

    const supabase = createServiceClient()
    const { data: insertedLead, error: insertError } = await supabase
      .from('lead_events')
      .insert(leadEvent)
      .select()
      .single()

    if (insertError) {
      // Check for duplicate constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json({
          duplicate: true,
          message: 'Lead event already exists',
          externalLeadId
        })
      }
      throw insertError
    }

    // Evaluate rule
    const evaluationResult = await evaluateQuizLeadBoost({
      clinicId: 'apex',
      leadEvent: insertedLead
    })

    return NextResponse.json({
      lead: insertedLead,
      evaluation: evaluationResult
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}