#!/bin/bash
set -e

# Path to Supabase CLI
SUPABASE_CLI="npx supabase"

# Function to check Supabase login status
check_supabase_login() {
    if ! $SUPABASE_CLI status | grep -q "Logged in"; then
        echo "❌ Not logged into Supabase. Initiating login..."
        $SUPABASE_CLI login
    fi
}

# Function to list Supabase organizations
list_supabase_orgs() {
    echo "📋 Available Supabase Organizations:"
    $SUPABASE_CLI orgs list
}

# Main setup function
setup_supabase_project() {
    # Check login status
    check_supabase_login

    # List organizations
    list_supabase_orgs

    # Prompt for organization selection
    read -p "Enter the Organization ID you want to use: " ORG_ID

    # Generate unique project name
    PROJECT_NAME="aegis-agent-chat-$(date +%Y%m%d%H%M%S)"

    # Create Supabase project
    echo "🚀 Creating Supabase Project: $PROJECT_NAME"
    SUPABASE_PROJECT=$($SUPABASE_CLI projects create "$PROJECT_NAME" --org-id "$ORG_ID")

    # Extract project reference
    PROJECT_REF=$(echo "$SUPABASE_PROJECT" | grep -oP 'Reference ID: \K[^\s]+')

    # Generate secure passwords
    DB_PASSWORD=$(openssl rand -base64 16)

    # Update database password
    echo "🔐 Setting database password"
    $SUPABASE_CLI projects update-db-password "$PROJECT_REF" --password "$DB_PASSWORD"

    # Generate API keys
    ANON_KEY=$($SUPABASE_CLI projects api-keys get "$PROJECT_REF" --type anon)
    SERVICE_ROLE_KEY=$($SUPABASE_CLI projects api-keys get "$PROJECT_REF" --type service_role)

    # Create .env file
    cat > .env.local << EOL
SUPABASE_URL=https://${PROJECT_REF}.supabase.co
SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Agent Chat Configuration
AGENT_CHAT_ENABLED=true
DEFAULT_ADMIN_EMAIL=aegis@davidfrench.io

# Logging and Monitoring
AGENT_CHAT_LOG_LEVEL=info
AGENT_CHAT_MAX_HISTORY_DAYS=30
EOL

    # Link project
    $SUPABASE_CLI link --project-ref "$PROJECT_REF"

    # Run migrations
    $SUPABASE_CLI db push

    echo "🎉 Supabase Project Setup Complete!"
    echo "Project Reference: $PROJECT_REF"
    echo "Database Password: $DB_PASSWORD"
    echo "Anon Key: $ANON_KEY"
    echo "Service Role Key: $SERVICE_ROLE_KEY"
}

# Run the setup
setup_supabase_project