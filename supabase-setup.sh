#!/bin/bash
set -e

# Supabase Project Automated Setup

# Generate a unique project name
PROJECT_NAME="aegis-agent-chat-$(date +%Y%m%d%H%M%S)"

# Prompt for Supabase organization ID
read -p "Enter your Supabase Organization ID: " ORG_ID

# Create Supabase project
echo "🚀 Creating Supabase Project: $PROJECT_NAME in Organization $ORG_ID"
SUPABASE_PROJECT=$(supabase projects create "$PROJECT_NAME" --org-id "$ORG_ID" 2>&1)

# Extract project reference ID
PROJECT_REF=$(echo "$SUPABASE_PROJECT" | grep -oP 'Reference ID: \K[^\s]+' || echo "FAILED_TO_EXTRACT")

# Wait a moment for project to initialize
sleep 30

# Get database passwords
DB_PASSWORD=$(openssl rand -base64 16)

# Update project database password
echo "🔐 Setting database password"
supabase projects update-db-password "$PROJECT_REF" --password "$DB_PASSWORD"

# Generate connection string
CONNECTION_STRING="postgresql://postgres:$DB_PASSWORD@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Create .env file with project details
cat > .env.local << EOL
SUPABASE_URL=https://${PROJECT_REF}.supabase.co
SUPABASE_ANON_KEY=$(supabase projects api-keys get "$PROJECT_REF" --type anon)
SUPABASE_SERVICE_ROLE_KEY=$(supabase projects api-keys get "$PROJECT_REF" --type service_role)
DATABASE_URL="$CONNECTION_STRING"

# Agent Chat Configuration
AGENT_CHAT_ENABLED=true
DEFAULT_ADMIN_EMAIL=aegis@davidfrench.io

# Logging and Monitoring
AGENT_CHAT_LOG_LEVEL=info
AGENT_CHAT_MAX_HISTORY_DAYS=30
EOL

# Link project
supabase link --project-ref "$PROJECT_REF"

# Run migrations
supabase db push

echo "🎉 Supabase Project Setup Complete!"
echo "Project Reference: $PROJECT_REF"
echo "Database Password: $DB_PASSWORD"