import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createServiceClient } from '@/app/lib/supabase/service'
import { simulateQuizLeadBoost } from '@/app/lib/automation/evaluate-quiz-lead-boost'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const serviceClient = createServiceClient()
    const { data: rule, error: ruleError } = await serviceClient
      .from('automation_rules')
      .select('*')
      .eq('id', 'quiz-lead-boost')
      .eq('clinic_id', 'apex')
      .single()

    if (ruleError) throw ruleError

    const dryRunResult = await simulateQuizLeadBoost({
      rule,
      adSetId: body.adSetId || null,
      currentBudget: body.currentBudget
    })

    // Log dry run execution
    await serviceClient
      .from('rule_executions')
      .insert({
        rule_id: 'quiz-lead-boost',
        clinic_id: 'apex',
        status: 'dry_run',
        triggered: false,
        reason: dryRunResult.reason,
        old_budget: dryRunResult.currentBudget,
        new_budget: dryRunResult.proposedBudget
      })

    return NextResponse.json(dryRunResult)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}