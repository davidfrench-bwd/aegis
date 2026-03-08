import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabase/service'
import { getCampaignAdSets } from '@/app/lib/meta/campaign-adsets'
import { fetchMetaAdSetBudget, updateMetaAdSetBudget } from '@/app/lib/automation/meta-api'

/**
 * Cron job endpoint - evaluates all active rules periodically
 * 
 * Configure in Vercel:
 * - vercel.json → "crons" section
 * - Or call via external cron (requires CRON_SECRET)
 * 
 * This scans all monitored ad sets and applies rules based on recent lead count
 */

export const dynamic = 'force-dynamic'

interface RuleEvaluationSummary {
  rule_id: string
  ad_sets_checked: number
  budgets_increased: number
  total_budget_change: number
  errors: number
}

async function logExecution(params: {
  ruleId: string
  clinicId: string
  adSetId?: string
  status: string
  triggered: boolean
  reason: string
  oldBudget?: number
  newBudget?: number
  metaResponse?: any
}) {
  const supabase = createServiceClient()
  
  await supabase.from('rule_executions').insert({
    rule_id: params.ruleId,
    clinic_id: params.clinicId,
    ad_set_id: params.adSetId || null,
    status: params.status,
    triggered: params.triggered,
    reason: params.reason,
    old_budget: params.oldBudget || null,
    new_budget: params.newBudget || null,
    meta_response: params.metaResponse || null
  })
}

async function checkRuleLock(ruleId: string, adSetId: string): Promise<boolean> {
  const supabase = createServiceClient()
  
  const { data: lock } = await supabase
    .from('rule_locks')
    .select('*')
    .eq('rule_id', ruleId)
    .eq('ad_set_id', adSetId)
    .single()

  if (!lock) return false // No lock exists

  const now = new Date()
  const lockedUntil = new Date(lock.locked_until)
  
  return now < lockedUntil // Still locked if current time is before lock expiry
}

async function setRuleLock(ruleId: string, adSetId: string, lockDurationHours: number) {
  const supabase = createServiceClient()
  
  const now = new Date()
  const lockedUntil = new Date(now.getTime() + lockDurationHours * 60 * 60 * 1000)

  await supabase
    .from('rule_locks')
    .upsert({
      rule_id: ruleId,
      ad_set_id: adSetId,
      last_executed_at: now.toISOString(),
      locked_until: lockedUntil.toISOString()
    }, { onConflict: 'rule_id,ad_set_id' })
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional - remove if using Vercel Cron)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServiceClient()

    // 1. Get all active rules
    const { data: rules, error: rulesError } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError) throw rulesError
    if (!rules || rules.length === 0) {
      return NextResponse.json({ message: 'No active rules to evaluate' })
    }

    const results: RuleEvaluationSummary[] = []

    // 2. For each rule, evaluate all monitored ad sets
    for (const rule of rules) {
      let adSetsChecked = 0
      let budgetsIncreased = 0
      let totalBudgetChange = 0
      let errors = 0

      console.log(`[CRON] Evaluating rule: ${rule.name} (${rule.id})`)

      if (!rule.campaign_id) {
        console.warn(`[CRON] Rule ${rule.id} has no campaign_id, skipping`)
        continue
      }

      // Get all ad sets for this campaign
      const monitoring = await getCampaignAdSets(
        rule.campaign_id,
        rule.ad_set_status_filter as 'ACTIVE' | null
      )

      for (const adSet of monitoring.ad_sets) {
        adSetsChecked++

        try {
          // Check if locked
          const isLocked = await checkRuleLock(rule.id, adSet.id)
          if (isLocked) {
            console.log(`[CRON] Ad set ${adSet.id} is locked, skipping`)
            await logExecution({
              ruleId: rule.id,
              clinicId: rule.clinic_id,
              adSetId: adSet.id,
              status: 'skipped',
              triggered: false,
              reason: 'Locked (frequency limit active)'
            })
            continue
          }

          // Count leads in the time window
          const timeWindowStart = new Date(
            Date.now() - rule.time_window_hours * 60 * 60 * 1000
          ).toISOString()

          const { count: leadCount } = await supabase
            .from('lead_events')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', rule.clinic_id)
            .eq('ad_set_id', adSet.id)
            .gte('created_at', timeWindowStart)

          const leadsReceived = leadCount || 0

          console.log(`[CRON] Ad set ${adSet.name}: ${leadsReceived} leads in last ${rule.time_window_hours}h (threshold: ${rule.threshold})`)

          // Check if threshold met
          if (leadsReceived < rule.threshold) {
            await logExecution({
              ruleId: rule.id,
              clinicId: rule.clinic_id,
              adSetId: adSet.id,
              status: 'skipped',
              triggered: false,
              reason: `Only ${leadsReceived} leads (need ${rule.threshold})`
            })
            continue
          }

          // Get current budget
          const currentBudget = await fetchMetaAdSetBudget(adSet.id)
          const increaseAmount = currentBudget * (rule.percentage_change / 100)
          const newBudget = Math.min(
            currentBudget + increaseAmount,
            rule.max_daily_budget
          )

          // Check if already at max
          if (currentBudget >= rule.max_daily_budget) {
            await logExecution({
              ruleId: rule.id,
              clinicId: rule.clinic_id,
              adSetId: adSet.id,
              status: 'skipped',
              triggered: false,
              reason: `Already at max budget ($${rule.max_daily_budget})`,
              oldBudget: currentBudget
            })
            continue
          }

          // Update budget
          console.log(`[CRON] Increasing budget: ${adSet.name} $${currentBudget} → $${newBudget}`)

          const updateResult = await updateMetaAdSetBudget(adSet.id, newBudget)

          if (updateResult.success) {
            budgetsIncreased++
            totalBudgetChange += (newBudget - currentBudget)

            await logExecution({
              ruleId: rule.id,
              clinicId: rule.clinic_id,
              adSetId: adSet.id,
              status: 'success',
              triggered: true,
              reason: `${leadsReceived} leads in ${rule.time_window_hours}h → increased ${rule.percentage_change}%`,
              oldBudget: currentBudget,
              newBudget: newBudget,
              metaResponse: updateResult
            })

            // Set lock
            await setRuleLock(rule.id, adSet.id, 24) // 24-hour lock
          } else {
            errors++
            await logExecution({
              ruleId: rule.id,
              clinicId: rule.clinic_id,
              adSetId: adSet.id,
              status: 'error',
              triggered: false,
              reason: `Failed to update budget: ${updateResult.message}`,
              oldBudget: currentBudget
            })
          }

        } catch (error) {
          errors++
          console.error(`[CRON] Error processing ad set ${adSet.id}:`, error)
          await logExecution({
            ruleId: rule.id,
            clinicId: rule.clinic_id,
            adSetId: adSet.id,
            status: 'error',
            triggered: false,
            reason: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      results.push({
        rule_id: rule.id,
        ad_sets_checked: adSetsChecked,
        budgets_increased: budgetsIncreased,
        total_budget_change: totalBudgetChange,
        errors
      })
    }

    return NextResponse.json({
      success: true,
      evaluated_at: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('[CRON] Rule evaluation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
