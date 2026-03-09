import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createServiceClient } from '@/app/lib/supabase/service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const anyStatus = searchParams.get('any_status') === 'true'

    const serviceClient = createServiceClient()
    
    let query = serviceClient
      .from('rule_executions')
      .select('*')
      .eq('rule_id', 'quiz-lead-boost')
      .eq('clinic_id', 'apex-pain-solutions')
    
    // Only filter by triggered if we're not fetching any status
    if (!anyStatus) {
      query = query.eq('triggered', true)  // Only show triggered executions (budget increases)
    }
    
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}