#!/usr/bin/env tsx
/**
 * NPE Ad Automation - Full Daily Run
 * 
 * Purpose: Complete sweep of all clinics and automation rules
 * Cost: ~$2-3 per run (~$60-90/mo daily)
 * 
 * Process:
 * 1. Load all active automation rules from Supabase
 * 2. For each clinic:
 *    - Fetch Meta Ads data (campaigns, ad sets, performance)
 *    - Evaluate each rule against current metrics
 *    - Execute actions (budget adjustments)
 *    - Log all results to rule_executions
 * 3. Report summary
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface AutomationRule {
  id: string;
  clinic_id: string;
  name: string;
  trigger_type: string;
  threshold: number;
  time_window_hours: number;
  action_type: string;
  percentage_change: number;
  max_daily_budget: number;
}

interface ExecutionResult {
  rule_id: string;
  clinic_id: string;
  triggered: boolean;
  reason: string;
  old_budget?: number;
  new_budget?: number;
}

async function loadActiveRules(): Promise<AutomationRule[]> {
  const { data: rules, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('is_active', true);
  
  if (error) {
    console.error('Error loading rules:', error);
    return [];
  }
  
  return rules || [];
}

async function evaluateRule(rule: AutomationRule): Promise<ExecutionResult> {
  // For now, this is a placeholder that logs the evaluation
  // In production, this would:
  // 1. Fetch real Meta Ads data
  // 2. Check lead counts and performance metrics
  // 3. Determine if rule threshold is met
  // 4. Execute budget changes via Meta API
  
  const result: ExecutionResult = {
    rule_id: rule.id,
    clinic_id: rule.clinic_id,
    triggered: false,
    reason: 'Rule evaluated - no action needed (placeholder implementation)'
  };
  
  // Placeholder: simulate checking lead threshold
  // In real implementation, would check actual lead_events table
  const recentLeadCount = 0; // Would query lead_events here
  
  if (recentLeadCount >= rule.threshold) {
    result.triggered = true;
    result.reason = `Threshold met: ${recentLeadCount} leads >= ${rule.threshold}`;
    result.old_budget = 100; // Placeholder
    result.new_budget = 100 * (1 + rule.percentage_change / 100); // Placeholder
  }
  
  return result;
}

async function logExecution(result: ExecutionResult) {
  await supabase
    .from('rule_executions')
    .insert({
      rule_id: result.rule_id,
      clinic_id: result.clinic_id,
      status: 'success',
      triggered: result.triggered,
      reason: result.reason,
      old_budget: result.old_budget,
      new_budget: result.new_budget
    });
}

async function main() {
  console.log('🤖 Starting NPE Automation Full Run');
  console.log('Time:', new Date().toLocaleString());
  console.log('');
  
  try {
    const rules = await loadActiveRules();
    console.log(`📋 Found ${rules.length} active rules`);
    
    const results: ExecutionResult[] = [];
    
    for (const rule of rules) {
      console.log(`\n🔄 Evaluating: ${rule.clinic_id} - ${rule.name}`);
      
      const result = await evaluateRule(rule);
      await logExecution(result);
      results.push(result);
      
      if (result.triggered) {
        console.log(`  ✅ TRIGGERED: ${result.reason}`);
        if (result.old_budget && result.new_budget) {
          console.log(`  💰 Budget: $${result.old_budget} → $${result.new_budget}`);
        }
      } else {
        console.log(`  ○ ${result.reason}`);
      }
    }
    
    const triggeredCount = results.filter(r => r.triggered).length;
    console.log(`\n📊 Summary:`);
    console.log(`  Total rules evaluated: ${results.length}`);
    console.log(`  Rules triggered: ${triggeredCount}`);
    console.log(`  No action needed: ${results.length - triggeredCount}`);
    console.log('\n✅ Automation run complete');
    
  } catch (error) {
    console.error('❌ Error during automation run:', error);
    process.exit(1);
  }
}

main();
