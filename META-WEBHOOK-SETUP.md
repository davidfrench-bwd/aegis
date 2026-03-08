# Meta Webhook Setup Guide

## Prerequisites
1. Meta Business Suite access
2. Facebook Page connected to Lead Ads
3. Access to Vercel environment variables

## Step 1: Set Environment Variables in Vercel

Go to Vercel Project Settings → Environment Variables and add:

### META_WEBHOOK_VERIFY_TOKEN
- **Value**: Generate a random string (e.g., `openssl rand -hex 32`)
- **Purpose**: Verifies webhook requests are from Meta
- **Example**: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

### META_ACCESS_TOKEN
- **Value**: Your Meta User Access Token with `ads_read` and `ads_management` permissions
- **How to get**:
  1. Go to https://developers.facebook.com/tools/explorer/
  2. Select your app
  3. Click "Generate Access Token"
  4. Grant permissions: `ads_read`, `ads_management`, `leads_retrieval`
  5. Copy the token
- **Important**: This is a USER token, not a Page token

## Step 2: Configure Webhook in Meta Business Suite

1. Go to https://developers.facebook.com/apps/
2. Select your app (or create one)
3. Go to "Webhooks" in the left sidebar
4. Click "Add Subscription" → "Page"
5. Configure:
   - **Callback URL**: `https://aegis.davidfrench.io/api/webhooks/meta/leads`
   - **Verify Token**: (paste the value of META_WEBHOOK_VERIFY_TOKEN)
6. Click "Verify and Save"
7. Subscribe to fields:
   - ✅ `leadgen` (Lead Generation)
8. Save

## Step 3: Subscribe Page to Webhook

1. Still in Webhooks section
2. Under "Page" subscription, click "Add subscriptions"
3. Select your Facebook Page
4. Make sure `leadgen` is checked
5. Save

## Step 4: Test the Webhook

### Manual Test (Verification)
```bash
curl "https://aegis.davidfrench.io/api/webhooks/meta/leads?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=test123"
```

Should return: `test123`

### Test with Real Lead
1. Create a test Lead Ad
2. Submit a test lead through the ad
3. Check Supabase `lead_events` table for the new row
4. Check `rule_executions` table for automation result

## Step 5: Monitor Logs

Check Vercel Function Logs:
1. Go to Vercel Dashboard → Your Project → Logs
2. Filter by `/api/webhooks/meta/leads`
3. Watch for incoming webhook events

## Troubleshooting

### Webhook verification fails
- Check `META_WEBHOOK_VERIFY_TOKEN` matches exactly
- Check URL is correct: `https://aegis.davidfrench.io/api/webhooks/meta/leads`

### Leads not appearing in database
- Check `META_ACCESS_TOKEN` is valid and has correct permissions
- Check Vercel logs for errors
- Verify `leadgen` subscription is active in Meta

### Rules not executing
- Check `automation_rules` table has active rule for clinic 'apex'
- Check campaign name contains "Quiz" (case-insensitive)
- Check ad set is ACTIVE status
- Check `rule_locks` table - might be locked from previous execution

## Security Notes

- Webhook always returns 200 OK to prevent Meta retries
- Duplicate leads are prevented by unique constraint on `(clinic_id, source, external_lead_id)`
- Internal test trigger still requires `INTERNAL_TRIGGER_SECRET`
- All mutations require proper authentication

## Current Limitations

1. **Clinic mapping**: Currently hardcoded to 'apex' - needs page_id → clinic_id mapping
2. **Meta API still simulated**: Budget reads/writes in `meta-api.ts` need to be enabled
3. **Error handling**: Webhook swallows errors to prevent retries - monitor logs carefully

## Next Steps to Go Live

1. Set environment variables in Vercel
2. Configure webhook in Meta Business Suite
3. Test with one ad set
4. Enable live Meta API in `app/lib/automation/meta-api.ts`
5. Monitor for 24 hours
6. Scale to more ad sets/campaigns
