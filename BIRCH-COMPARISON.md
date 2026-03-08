# Aegis vs Birch Feature Comparison

## ✅ Features We Have (Matching Birch)

### Core Automation
- [x] Real-time webhook ingestion from Meta
- [x] Graph API integration for lead details
- [x] Campaign/Ad Set filtering (name contains "Quiz")
- [x] Per-ad-set budget tracking
- [x] Percentage-based budget increases (20%)
- [x] Maximum budget caps ($150)
- [x] Duplicate lead prevention
- [x] 24-hour frequency locks per ad set
- [x] Execution logging with full audit trail
- [x] Rule on/off toggle

### Infrastructure
- [x] Server-side rule evaluation
- [x] Protected admin UI
- [x] Dry run / test mode
- [x] Manual test trigger endpoint
- [x] Database persistence (Supabase)
- [x] Serverless deployment (Vercel)
- [x] Environment-based configuration

### Safety & Monitoring
- [x] Status filtering (ACTIVE ad sets only)
- [x] Lock mechanism to prevent duplicate actions
- [x] Comprehensive logging
- [x] Error handling with graceful degradation
- [x] Webhook always returns 200 (prevents retries)

## ❌ Features Birch Has That We Don't

### Multi-Clinic Support
- [ ] **Clinic mapping**: Currently hardcoded to 'apex'
  - Birch: Maps Meta page_id → clinic_id dynamically
  - Us: Hardcoded in webhook handler
  - **Fix needed**: Add `clinic_mappings` table or config

### Rule Management
- [ ] **Multiple rules per clinic**: We only have quiz-lead-boost
  - Birch: Can have different rules for different campaigns
  - Us: Single rule hardcoded
  - **Fix needed**: Dynamic rule loading based on campaign/trigger

- [ ] **Rule versioning**: No history of rule changes
  - Birch: Tracks who changed what and when
  - Us: Just `updated_at` timestamp
  - **Fix needed**: Add `rule_history` table

### Advanced Triggers
- [ ] **Time-based triggers**: Birch can trigger on schedule, not just events
  - Us: Only event-driven (lead received)
  - **Fix needed**: Add cron job for periodic evaluation

- [ ] **Composite triggers**: AND/OR conditions
  - Birch: "1 lead in 24h AND budget < $100"
  - Us: Single condition only
  - **Fix needed**: Rule engine with condition trees

### Budget Management
- [ ] **Minimum budget floor**: Birch has min/max
  - Us: Only max_daily_budget
  - **Fix needed**: Add `min_daily_budget` field (already in old schema!)

- [ ] **Budget decrease rules**: Only increases supported
  - Birch: Can decrease if performance drops
  - Us: Only `increase_budget` action
  - **Fix needed**: Add `decrease_budget` action type

- [ ] **Absolute amount changes**: Only percentage supported
  - Birch: Can do "+$20" or "+20%"
  - Us: Only percentage
  - **Fix needed**: Add `action_amount` field (already in old schema!)

### Notifications
- [ ] **Alerts on rule execution**: No notifications yet
  - Birch: Sends Discord/Slack/Email when rules fire
  - Us: Silent execution
  - **Fix needed**: Add notification channels

- [ ] **Error alerts**: Silent failures
  - Birch: Alerts on API errors, failures
  - Us: Just logs
  - **Fix needed**: Add error notification system

### Analytics
- [ ] **Dashboard metrics**: No visual analytics yet
  - Birch: Charts of budget changes, lead volume, ROI
  - Us: Just execution logs
  - **Fix needed**: Add analytics page

- [ ] **Performance tracking**: No cost-per-lead calculation
  - Birch: Tracks spend vs leads
  - Us: Just raw events
  - **Fix needed**: Add cost/performance metrics

### Testing & Safety
- [ ] **Staging environment**: No test mode toggle
  - Birch: Can run in test mode without touching real budgets
  - Us: Either simulated or live (no hybrid)
  - **Fix needed**: Add `test_mode` flag per clinic

- [ ] **Budget change preview**: Dry run doesn't show all affected ad sets
  - Birch: Shows all ad sets that would be affected
  - Us: Shows evaluation result but not forecast
  - **Fix needed**: Add forecast endpoint

## 🎯 Priority Fixes to Match Birch

### P0 (Must Have for Production)
1. ✅ Enable live Meta API (done above)
2. **Add error notifications** - Need to know when things break
3. **Add test_mode flag** - Safety for initial deployment

### P1 (Should Have Soon)
4. **Multi-clinic mapping** - Will need this when scaling beyond Apex
5. **Budget decrease rules** - Need to manage underperforming ad sets
6. **Minimum budget floor** - Prevent going too low

### P2 (Nice to Have)
7. **Rule versioning** - Audit trail for changes
8. **Analytics dashboard** - Visual feedback on performance
9. **Multiple rules per clinic** - More complex automation

### P3 (Future)
10. **Time-based triggers** - Scheduled evaluations
11. **Composite conditions** - Advanced logic
12. **Absolute amount changes** - More flexibility

## Current State Summary

**We now have functional parity with Birch for the core use case:**
- ✅ Real-time lead ingestion
- ✅ Automatic budget increases
- ✅ Safety locks and caps
- ✅ Full audit trail

**What's missing is mostly:**
- Multi-clinic scaling
- Advanced rule types
- Monitoring/alerting
- Analytics

**Ready to test on one ad set?** Yes! The core loop is complete and live.
