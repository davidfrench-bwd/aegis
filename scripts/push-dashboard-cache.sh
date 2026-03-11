#!/bin/bash

# Dashboard Cache Update Script
# Purpose: Update clinic analytics cache files daily at 7:00 AM
# Runs: 7:30 AM daily via cron job
# Fetches latest GHL data for each clinic

# Load environment variables
source ~/.openclaw/.env.local

# Clinics to update
CLINICS=("apex-pain-solutions" "natural-foundations" "thrive-restoration")

# Logging
LOG_FILE="/Users/alfredpennyworth/.openclaw/workspace/logs/dashboard-cache-$(date +%Y-%m-%d).log"
mkdir -p "$(dirname "$LOG_FILE")"

# Timestamp
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting dashboard cache update" > "$LOG_FILE"

# Update each clinic's dashboard
for clinic in "${CLINICS[@]}"; do
    echo "Updating dashboard cache for $clinic" | tee -a "$LOG_FILE"
    
    # Use npx to run TypeScript script
    npx tsx ~/.openclaw/workspace/scripts/fetch-ghl-data.ts --clinic "$clinic" 2>&1 | tee -a "$LOG_FILE"
    
    # Check exit status
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "✅ $clinic dashboard cache updated successfully" | tee -a "$LOG_FILE"
    else
        echo "❌ Failed to update $clinic dashboard cache" | tee -a "$LOG_FILE"
    fi
done

# Final log
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dashboard cache update complete" | tee -a "$LOG_FILE"

exit 0