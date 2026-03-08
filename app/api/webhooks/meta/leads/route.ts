import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabase/service'
import { evaluateQuizLeadBoost } from '@/app/lib/automation/evaluate-quiz-lead-boost'
import { fetchLeadDetails } from '@/app/lib/meta/graph-api'

/**
 * Meta Webhook for Lead Ads
 * 
 * SETUP REQUIRED:
 * 1. Set META_WEBHOOK_VERIFY_TOKEN in Vercel environment variables
 * 2. Configure webhook in Meta Business Suite:
 *    - Callback URL: https://aegis.davidfrench.io/api/webhooks/meta/leads
 *    - Verify Token: (value of META_WEBHOOK_VERIFY_TOKEN)
 *    - Subscribe to: leadgen
 * 3. Map Location IDs to clinic_id (currently hardcoded to 'apex')
 */

// GET: Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN

  if (!verifyToken) {
    console.error('META_WEBHOOK_VERIFY_TOKEN not set')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  // Verify the webhook
  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Meta webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.warn('Meta webhook verification failed', { mode, token: token?.substring(0, 5) })
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// POST: Receive lead events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Meta sends an array of entries
    if (!body.object || body.object !== 'page') {
      console.warn('Invalid webhook object type:', body.object)
      return NextResponse.json({ error: 'Invalid object type' }, { status: 400 })
    }

    const results = []

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'leadgen') {
          const leadgenData = change.value
          
          // Extract lead information
          const leadId = leadgenData.leadgen_id
          const adId = leadgenData.ad_id
          const formId = leadgenData.form_id
          const createdTime = leadgenData.created_time
          
          // Fetch full lead details from Graph API
          const leadDetails = await fetchLeadDetails(leadId)
          
          // Map to our internal format
          const leadEvent = {
            clinic_id: 'apex', // TODO: Map from page_id or location_id
            external_lead_id: leadId,
            source: 'meta',
            campaign_id: leadDetails?.campaign_id || null,
            campaign_name: leadDetails?.campaign_name || null,
            ad_set_id: leadDetails?.adset_id || null,
            ad_set_name: leadDetails?.adset_name || null,
            payload: {
              ad_id: adId,
              ad_name: leadDetails?.ad_name,
              form_id: formId,
              created_time: createdTime,
              page_id: leadgenData.page_id,
              raw: leadgenData
            }
          }

          const supabase = createServiceClient()
          
          // Insert lead event (dedupe handled by unique constraint)
          const { data: insertedLead, error: insertError } = await supabase
            .from('lead_events')
            .insert(leadEvent)
            .select()
            .single()

          if (insertError) {
            // Check for duplicate
            if (insertError.code === '23505') {
              console.log(`Duplicate lead skipped: ${leadId}`)
              results.push({ leadId, status: 'duplicate' })
              continue
            }
            throw insertError
          }

          console.log(`New lead received: ${leadId}`)

          // Evaluate automation rules
          const evaluation = await evaluateQuizLeadBoost({
            clinicId: 'apex',
            leadEvent: insertedLead
          })

          results.push({
            leadId,
            status: 'processed',
            evaluation: evaluation.status
          })
        }
      }
    }

    return NextResponse.json({
      received: true,
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Always return 200 to Meta to prevent retries
    // Log the error but don't fail the webhook
    return NextResponse.json({
      received: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

