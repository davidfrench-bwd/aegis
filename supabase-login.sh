#!/bin/bash
set -e

# Supabase Login and Authentication Script

# Check for existing access token
if supabase status | grep -q "Logged in"; then
    echo "✅ Already logged into Supabase"
    exit 0
fi

# Attempt to login using GitHub
echo "🔐 Initiating Supabase Login"
supabase login --no-browser

# If login fails, provide manual instructions
if [ $? -ne 0 ]; then
    echo "❌ Automatic login failed"
    echo "Please follow these steps:"
    echo "1. Run 'supabase login'"
    echo "2. Open the provided URL in your browser"
    echo "3. Authorize the Supabase CLI"
    exit 1
fi

echo "🎉 Supabase Login Successful!"