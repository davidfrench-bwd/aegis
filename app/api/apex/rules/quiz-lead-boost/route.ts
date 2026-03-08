import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createServiceClient } from '@/app/lib/supabase/service'

/**
 * SECURITY: This route requires Supabase authentication
 * User must be logged in to access/modify rules
 */

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('automation_rules')
      .select('*')
      .eq('id', 'quiz-lead-boost')
      .eq('clinic_id', 'apex')
      .single()

    if (error) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const ruleData = {
      id: 'quiz-lead-boost',
      clinic_id: 'apex',
      name: body.name,
      is_active: body.is_active,
      trigger_type: body.trigger_type,
      threshold: body.threshold,
      time_window_hours: body.time_window_hours,
      scope: body.scope,
      action_type: body.action_type,
      percentage_change: body.percentage_change,
      max_daily_budget: body.max_daily_budget,
      frequency_limit: body.frequency_limit,
      campaign_id: body.campaign_id || null,
      campaign_name_filter: body.campaign_name_filter || null,
      ad_set_status_filter: body.ad_set_status_filter
    }

    const serviceClient = createServiceClient()
    const { data, error } = await serviceClient
      .from('automation_rules')
      .upsert(ruleData, { onConflict: 'id' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}