# NPE Automation System - Complete Guide

**Last Updated:** March 10, 2026  
**Status:** Live in Production (3 clinics)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Dashboards & Tools](#dashboards--tools)
5. [Automation Rules](#automation-rules)
6. [Cron Jobs](#cron-jobs)
7. [Costs & Budget](#costs--budget)
8. [Troubleshooting](#troubleshooting)
9. [Adding New Clinics](#adding-new-clinics)
10. [Daily Operations](#daily-operations)

---

## Overview

### What Is This?

An automated system that monitors Facebook ad performance for 4 neuropathy clinics and automatically adjusts budgets based on lead generation performance.

### The Problem It Solves

Before automation:
- Manually checking ad performance daily
- Manually increasing budgets on winning ad sets
- Missing opportunities to scale winners quickly
- Spending money on underperforming ads

After automation:
- Checks every 3 hours for new leads
- Automatically increases budgets when leads come in
- Saves 2+ hours per day of manual work
- Scales winners within 3 hours instead of 24 hours

### Current Status

**Live Clinics:**
- ✅ Apex Pain Solutions (1 rule active)
- ✅ Natural Foundations (1 rule active, 1 paused)
- ✅ Thrive Restoration Clinic (1 rule active)
- ⏸️ Advanced Shockwave Pain Relief (pending configuration)

**Total Ad Sets Monitored:** 84  
**Check Frequency:** Every 3 hours + daily at 9 AM  
**Monthly Cost:** $72-282 (well under $1,000 budget)

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    NPE AUTOMATION SYSTEM                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ 3-Hour  │        │  Daily  │        │  Daily  │
   │  Lead   │        │   Full  │        │ Health  │
   │ Checker │        │   Run   │        │  Check  │
   └────┬────┘        └────┬────┘        └────┬────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │   SUPABASE     │
                    │   (Database)   │
                    └───────┬────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │ Control │        │ Manage  │        │ Clinic  │
   │  Panel  │        │  Rules  │        │Analytics│
   └─────────┘        └─────────┘        └─────────┘
```

### Data Flow

1. **Lead Generation** → Facebook Ads capture leads
2. **Detection** → 3-hour checker queries Meta API for new leads
3. **Evaluation** → Checks rules against lead counts
4. **Action** → Increases budgets if rules trigger
5. **Logging** → Records all actions to Supabase
6. **Display** → Control Panel shows live status

---

## How It Works

### The 3-Hour Lead Checker

**What:** Lightweight script that runs every 3 hours  
**Where:** `scripts/lightweight-lead-check.ts`  
**When:** 12 AM, 3 AM, 6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM (EST)  
**Cost:** ~$0.05 per check (~$12/mo)

**Process:**
1. Fetch lead counts from Meta API (last 3 hours)
2. Compare to previous check state
3. Identify NEW leads not seen before
4. Mark new leads in `processed_leads` table
5. If new leads found → trigger full automation
6. If no new leads → skip automation (save tokens)

**Why 3 Hours?**
- Fast enough to catch leads quickly (vs 24h with daily-only)
- Cheap enough to stay under budget (vs hourly at $156-486/mo)
- Sweet spot: $72-282/mo total cost

### The Daily Full Automation

**What:** Complete sweep of all clinics and rules  
**Where:** `skills/npe-ad-automation/run-automation-supabase.ts`  
**When:** 9:00 AM daily (EST)  
**Cost:** ~$2-3 per run (~$60-90/mo)

**Process:**
1. Load all active rules from Supabase
2. For each clinic:
   - Fetch Meta Ads data (campaigns, ad sets, leads)
   - Evaluate each rule against current performance
   - Execute actions (budget increases/decreases)
   - Log results to `automation_logs`
3. Update `automation_state` with latest data
4. Report summary to console

**Why Daily Too?**
- Backup in case 3-hour checker misses something
- Full sweep ensures nothing slips through cracks
- More thorough analysis than lightweight checker

---

## Dashboards & Tools

### 1. Control Panel
**URL:** https://aegis.davidfrench.io/control-panel.html

**What You See:**
- **System Health** - All services running OK?
- **Token Costs** - Daily/weekly/monthly spend vs budget
- **Active Automations** - 3 clinics, 4 rules, live status
- **Recent Activity** - Latest automation runs with timestamps

**Updates:** Real-time (auto-refreshes every 30 seconds)

**Use For:**
- Quick health check ("is everything running?")
- Seeing recent budget changes
- Monitoring token costs

---

### 2. Manage Rules
**URL:** https://aegis.davidfrench.io/manage-rules.html

**What You See:**
- All automation rules grouped by clinic
- Toggle switches to enable/disable rules
- Edit buttons to change thresholds/percentages
- Delete buttons to remove rules
- Last run timestamps
- Rule descriptions with check frequency

**Actions You Can Take:**
- **Toggle Rule On/Off** - Left switch (green = active)
- **Edit Rule** - Change threshold, percentage, max budget
- **Delete Rule** - Remove permanently (can't undo)

**Updates:** Real-time (pulls from Supabase)

**Use For:**
- Turning rules on/off quickly
- Adjusting rule parameters
- Seeing when rules last ran

---

### 3. Clinic Analytics Dashboards
**URLs:**
- https://aegis.davidfrench.io/apex-analytics.html
- https://aegis.davidfrench.io/natural-foundations-analytics.html
- https://aegis.davidfrench.io/thrive-restoration-analytics.html
- https://aegis.davidfrench.io/advanced-shockwave-analytics.html

**What You See:**
- Last 12 months summary (revenue, ROAS, ad spend)
- Monthly breakdown cards
- Volume metrics (leads, consults, exams, commits)
- Conversion rates at each funnel step
- Revenue calculations

**Updates:** Every 6 hours (via cache)

**Use For:**
- Deep dive into clinic performance
- Reviewing conversion funnels
- Monthly trend analysis

---

## Automation Rules

### Current Rules (Live)

#### Apex Pain Solutions
**Rule:** Quiz Lead Boost - Per Ad Set  
**Trigger:** 1+ quiz leads in 24 hours  
**Action:** Increase budget by 20%  
**Max Budget:** $20/day per ad set  
**Status:** ✅ Active  
**Ad Sets Monitored:** 36  
**Check Frequency:** Every 3 hours + daily at 9 AM

---

#### Natural Foundations
**Rule 1:** Quiz Lead Boost - Per Ad Set  
**Trigger:** 2+ quiz leads in 24 hours  
**Action:** Increase budget by 15%  
**Max Budget:** $100/day per ad set  
**Status:** ✅ Active  
**Ad Sets Monitored:** 15  
**Check Frequency:** Every 3 hours + daily at 9 AM

**Rule 2:** High CPL Auto-Pause  
**Trigger:** CPL > $60 for 3 days  
**Action:** Pause ad set  
**Status:** ⏸️ Paused (CPL tracking not yet implemented)

---

#### Thrive Restoration Clinic
**Rule:** Quiz Lead Boost - Per Ad Set  
**Trigger:** 2+ quiz leads in 24 hours  
**Action:** Increase budget by 10%  
**Max Budget:** $50/day per ad set  
**Status:** ✅ Active  
**Ad Sets Monitored:** 33  
**Check Frequency:** Every 3 hours + daily at 9 AM

---

### How Rules Are Stored

**Database:** Supabase table `automation_rules`

**Schema:**
```sql
CREATE TABLE automation_rules (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  dry_run BOOLEAN DEFAULT FALSE,
  trigger_type TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  time_window_hours INTEGER,
  scope TEXT,
  action_type TEXT NOT NULL,
  percentage_change INTEGER,
  max_daily_budget INTEGER,
  frequency_limit TEXT,
  campaign_name_filter TEXT,
  ad_set_status_filter TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields:**
- `is_active` - TRUE = rule runs, FALSE = rule skipped
- `dry_run` - TRUE = log only (no real changes), FALSE = execute
- `trigger_type` - What to check (lead_count, cpl_threshold, etc.)
- `threshold` - Value that triggers the rule
- `action_type` - What to do (increase_budget, decrease_budget, pause_ad_set)
- `percentage_change` - How much to change budget (%)
- `max_daily_budget` - Don't exceed this amount (in cents)

---

## Cron Jobs

### Active Jobs

#### 1. NPE Lightweight Lead Check
**ID:** `8d42088c-4e3e-4a5a-8c25-c268aa5d36b9`  
**Schedule:** `0 */3 * * *` (every 3 hours)  
**Command:** `npx tsx ~/.openclaw/workspace/scripts/lightweight-lead-check.ts`  
**Next Run:** Every 3 hours (12 AM, 3 AM, 6 AM, 9 AM, 12 PM, 3 PM, 6 PM, 9 PM)  
**Purpose:** Quick check for new leads, trigger full automation if found  
**Cost:** ~$12/mo

#### 2. Daily Clinic Data Fetch
**ID:** `85e84bd2-763e-4343-874b-dc570e1397fb`  
**Schedule:** `0 7 * * *` (7:00 AM daily)  
**Command:** `bash ~/.openclaw/workspace/scripts/push-dashboard-cache.sh`  
**Purpose:** Update clinic analytics cache files  
**Cost:** ~$0.40/day (~$12/mo)

#### 3. Daily Health Check
**ID:** `2359d1c9-644c-4b69-ad50-7f0c342e860f`  
**Schedule:** `0 8 * * *` (8:00 AM daily)  
**Command:** Agent message to run health check  
**Purpose:** Post system status to Discord #📅-daily-update  
**Cost:** ~$0.10/day (~$3/mo)

#### 4. NPE Automation Daily
**ID:** `3f9db7cf-45c8-4166-81ce-9b9e124f4091`  
**Schedule:** `0 9 * * *` (9:00 AM daily)  
**Command:** `npx tsx ~/.openclaw/workspace/skills/npe-ad-automation/run-automation-supabase.ts`  
**Purpose:** Full automation sweep of all clinics  
**Cost:** ~$2-3/day (~$60-90/mo)

#### 5. Apex GHL Refresh
**ID:** `88a940e9-0d14-4242-ab79-44f1bd50d177`  
**Schedule:** `30 7 * * *` (7:30 AM daily)  
**Command:** Fetches GHL data for Apex  
**Purpose:** Update clinic analytics with GHL contact data  
**Cost:** ~$0.20/day (~$6/mo)

---

### Managing Cron Jobs

**List all jobs:**
```bash
openclaw cron list
```

**View specific job:**
```bash
openclaw cron list | grep "lightweight"
```

**Disable a job:**
```bash
openclaw cron disable <job-id>
```

**Enable a job:**
```bash
openclaw cron enable <job-id>
```

**Run immediately (test):**
```bash
openclaw cron run <job-id>
```

**Delete a job:**
```bash
openclaw cron rm <job-id>
```

---

## Costs & Budget

### Monthly Budget: $1,000

### Current Spend Breakdown

| Component | Frequency | Cost/Run | Monthly Cost |
|-----------|-----------|----------|--------------|
| **3-Hour Lead Checker** | 8x/day | $0.05 | $12 |
| **Full Automation (triggered)** | ~1-3x/day | $2-3 | $60-270 |
| **Daily Health Check** | 1x/day | $0.10 | $3 |
| **GHL Data Fetch** | 1x/day | $0.20 | $6 |
| **Dashboard Cache** | 1x/day | $0.40 | $12 |
| **Interactive Use** | Variable | - | $550-700 |
| **TOTAL** | - | - | **$643-1,003** |

### Optimization Strategies

**Done:**
- ✅ 3-hour checks instead of hourly (saves $84-204/mo)
- ✅ Haiku for all heartbeats (saves ~$100/mo)
- ✅ Only trigger full automation when new leads found
- ✅ Track processed leads to avoid duplicate actions

**If We Hit Budget:**
- Reduce interactive sessions (use Haiku more)
- Reduce 3-hour checks to every 6 hours (saves $6/mo)
- Disable daily automation (rely only on 3-hour checker)

---

## Troubleshooting

### "Rule not triggering even though I see leads"

**Check:**
1. Is rule active? (Manage Rules → switch should be green)
2. Is rule in dry run mode? (Look for orange "DRY RUN" badge)
3. Check last run time - has it run recently?
4. Check Control Panel → Recent Activity for errors
5. Look at `automation_logs` table for details

**Common Causes:**
- Meta API rate limits hit
- Lead threshold not met (e.g., rule needs 2 leads, only 1 came in)
- Campaign name filter doesn't match
- Ad set status filter (only ACTIVE ad sets)

---

### "Meta API Error: User request limit reached"

**What It Means:**
Facebook limits API calls per hour. We hit that limit.

**What Happens:**
- Automation logs the error
- Continues with other clinics
- Next run (3 hours or 9 AM) will retry

**How to Fix:**
- Nothing needed - it's temporary
- Reduce number of clinics if happens frequently
- Add exponential backoff (future improvement)

**Prevention:**
- 3-hour checks help (fewer API calls than hourly)
- Only query active ad sets (reduces load)

---

### "Dashboard shows 'Loading...' forever"

**Check:**
1. Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
2. Open browser console (F12) - any errors?
3. Check Supabase RLS policies (anon read access enabled?)
4. Verify cache files exist in `aegis-dashboard/public/data/`

**Fix:**
- Usually just Vercel cache - wait 1-2 minutes
- Clear browser cache
- Check if cache cron ran (7:30 AM daily)

---

### "Control Panel shows no recent activity"

**Possible Reasons:**
1. No automation has run yet today
2. No rules triggered (no new leads)
3. Automation logs not being written to Supabase

**Check:**
```bash
cd ~/.openclaw/workspace
export SUPABASE_SERVICE_ROLE_KEY="your-key"
npx tsx scripts/audit-supabase.ts
```

Look for recent entries in "AUTOMATION LOGS" section.

**Fix:**
- Wait for next automation run
- Check cron jobs are running: `openclaw cron list`
- Verify automation engine is logging (check code)

---

## Adding New Clinics

### Prerequisites

- Meta Ad Account ID
- GHL Location ID (if using GHL integration)
- Campaign naming convention (e.g., "Quiz Funnel")
- Budget limits per ad set

### Steps

1. **Create automation rule(s) in Supabase:**

```bash
cd ~/.openclaw/workspace
npx tsx scripts/add-new-clinic-rules.ts
```

Or manually insert:
```sql
INSERT INTO automation_rules (
  id, clinic_id, name, is_active,
  trigger_type, threshold, time_window_hours,
  scope, action_type, percentage_change,
  max_daily_budget, frequency_limit,
  campaign_name_filter, ad_set_status_filter,
  description
) VALUES (
  'new-clinic-lead-boost',
  'new-clinic-name',
  'Quiz Lead Boost - Per Ad Set',
  TRUE,
  'lead_count',
  1,
  24,
  'ad_set',
  'increase_budget',
  20,
  2000,
  'every_hour',
  'Quiz',
  'ACTIVE',
  'Increases budget by 20% when 1+ leads in 24h. ⏰ Checked every 3 hours + daily at 9 AM.'
);
```

2. **Add clinic details to `supabase-client-simple.ts`:**

```typescript
const clinicDetails: Record<string, any> = {
  // ... existing clinics ...
  'new-clinic-name': {
    name: 'New Clinic Name',
    metaAdAccountId: 'act_123456789',
    metaPageId: '987654321',
  }
};
```

3. **Add to clinic name mapping in `run-automation-supabase.ts`:**

```typescript
const clinicNameToId: Record<string, string> = {
  // ... existing mappings ...
  'New Clinic Name': 'new-clinic-name',
};
```

4. **Test in dry run mode:**

```bash
cd ~/.openclaw/workspace/skills/npe-ad-automation
npx tsx run-automation-supabase.ts --dry-run --clinic=new-clinic-name
```

5. **Monitor for 24-48 hours:**
- Check Control Panel for activity
- Review automation logs
- Verify budgets are changing correctly

6. **Create analytics dashboard (optional):**
- Copy existing dashboard HTML
- Update clinic ID references
- Add to clinic directory

---

## Daily Operations

### Morning Routine (8:00 AM - 9:30 AM)

1. **Check Discord #📅-daily-update**
   - Daily health check posted at 8 AM
   - Review: cron jobs, automation status, token costs

2. **Check Control Panel**
   - https://aegis.davidfrench.io/control-panel.html
   - Look for errors in Recent Activity
   - Verify token costs are under budget

3. **Review Automation Results**
   - Did any rules trigger?
   - Which ad sets got budget increases?
   - Any Meta API errors?

### When to Take Action

**Budget Increase Happened:**
- ✅ Normal - automation is working
- Review which ad sets scaled
- Check if CPL is good (if bad, manually pause)

**No Activity for 24+ Hours:**
- ⚠️ Check cron jobs are running
- Verify rules are active (not paused)
- Check Meta API errors

**Token Costs Trending High:**
- 🚨 If >$33/day average, investigate
- Reduce interactive sessions
- Check for runaway automation

**Meta API Rate Limits:**
- ⏸️ Usually temporary, wait for next run
- If persistent, reduce check frequency

### Weekly Review

**Monday Morning:**
1. Review last week's automation performance
2. Check which clinics/rules performed best
3. Adjust thresholds if needed
4. Review token costs vs budget

**Questions to Ask:**
- Are we scaling winners fast enough?
- Are thresholds too high/low?
- Any rules that never trigger?
- Token spend trending OK?

---

## Database Schema Reference

### Tables

**automation_rules** - Rule definitions  
**automation_logs** - Execution history  
**automation_state** - Current state per clinic  
**automation_check_state** - Last check timestamps  
**processed_leads** - Prevent duplicate actions  
**clinic_data** - Cached clinic metrics  
**token_costs** - Daily token spend tracking  
**cron_job_runs** - Cron execution history

### Key Relationships

```
automation_rules (clinic_id)
  └── automation_logs (rule_id)
  └── automation_state (clinic_id)
  
automation_check_state (clinic_id)
  └── processed_leads (clinic_id, ad_set_id)
  
clinic_data (clinic_id) - standalone analytics cache
```

---

## File Locations

### Scripts
- `scripts/lightweight-lead-check.ts` - 3-hour checker
- `scripts/audit-supabase.ts` - Database audit tool
- `scripts/update-rule-descriptions.ts` - Bulk update descriptions
- `scripts/fetch-clinic-data-daily.ts` - Daily data collection
- `scripts/daily-health-check.ts` - Morning health report

### Automation Engine
- `skills/npe-ad-automation/run-automation-supabase.ts` - Main runner
- `skills/npe-ad-automation/automation-engine.ts` - Core logic
- `skills/npe-ad-automation/supabase-client-simple.ts` - DB client
- `skills/npe-ad-automation/types.ts` - TypeScript types
- `skills/npe-ad-automation/meta-client.ts` - Meta API wrapper

### Dashboards
- `aegis-dashboard/public/control-panel.html` - Control Panel
- `aegis-dashboard/public/manage-rules.html` - Rule Management
- `aegis-dashboard/public/*-analytics.html` - Clinic Dashboards

### Documentation
- `memory/knowledge/projects/npe-full-automation-blueprint.md` - Original plan
- `memory/knowledge/projects/live-dashboards-complete.md` - Dashboard docs
- `memory/knowledge/projects/npe-3-hour-lead-checker.md` - Checker docs
- `memory/2026-03-10.md` - Daily build log

---

## Emergency Procedures

### Stop All Automation (Emergency Kill Switch)

```bash
# Disable all cron jobs
openclaw cron disable 8d42088c-4e3e-4a5a-8c25-c268aa5d36b9  # 3-hour checker
openclaw cron disable 3f9db7cf-45c8-4166-81ce-9b9e124f4091  # Daily automation

# Or disable all rules in database
cd ~/.openclaw/workspace
npx tsx -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://fbmsmqukiogxeclmgvim.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY);
await supabase.from('automation_rules').update({ is_active: false }).neq('id', '');
console.log('All rules disabled');
"
```

### Rollback a Bad Budget Change

Meta Ads Manager → Campaigns → Ad Sets → Edit Budget → Restore previous value

Or via API:
```bash
# (Would need to create rollback script)
```

### Restore from Backup

**Database:**
- Supabase has automatic backups
- Go to Supabase Dashboard → Database → Backups
- Restore to point-in-time

**Code:**
```bash
cd ~/.openclaw/workspace
git log --oneline  # Find commit before issue
git checkout <commit-hash>  # Restore code
```

---

## Future Improvements

### Planned
- [ ] Dry run toggle UI (in progress)
- [ ] Email/Discord alerts when rules trigger
- [ ] Automation performance dashboard
- [ ] CPL tracking for High CPL Auto-Pause rule
- [ ] Advanced Shockwave Pain Relief configuration

### Ideas
- [ ] A/B testing framework for rules
- [ ] ML-based budget optimization
- [ ] Automated creative testing
- [ ] Multi-channel budget allocation
- [ ] Predictive lead scoring

---

## Support & Maintenance

### Who Maintains This?
**Aegis** (AI assistant) built and maintains the system.

### Getting Help
1. Check this documentation first
2. Check Control Panel for errors
3. Run audit script: `npx tsx scripts/audit-supabase.ts`
4. Ask Aegis for help

### Reporting Issues
Include:
- What you were trying to do
- What happened instead
- Screenshot of Control Panel
- Recent automation logs (if available)
- Time/date of issue

---

## Version History

**v1.0** - March 10, 2026
- Initial launch with 3 clinics
- 3-hour lead checker implemented
- Control Panel & Manage Rules live
- Cost: $72-282/mo (under budget)

**v0.5** - March 6-9, 2026
- Week 1: Full visibility system built
- Supabase schema created
- Daily health check added
- Automation logging implemented

---

## Quick Reference

### Essential URLs
- Control Panel: https://aegis.davidfrench.io/control-panel.html
- Manage Rules: https://aegis.davidfrench.io/manage-rules.html
- Supabase: https://fbmsmqukiogxeclmgvim.supabase.co

### Key Commands
```bash
# Check automation status
cd ~/.openclaw/workspace
npx tsx scripts/audit-supabase.ts

# List cron jobs
openclaw cron list

# Test automation (dry run)
cd skills/npe-ad-automation
npx tsx run-automation-supabase.ts --dry-run

# View logs
tail -f skills/npe-ad-automation/logs/*.log
```

### Emergency Contacts
- Meta API Status: https://developers.facebook.com/status
- Supabase Status: https://status.supabase.com

---

**End of Documentation**

This guide is version-controlled at:
`~/.openclaw/workspace/memory/knowledge/projects/NPE-AUTOMATION-COMPLETE-GUIDE.md`

Last reviewed: March 10, 2026 by Aegis
