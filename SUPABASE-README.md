# Supabase Project Setup Guide

## Prerequisites
- Supabase CLI installed
- GitHub account for authentication
- Node.js and npm

## Setup Workflow

### 1. Login to Supabase
```bash
bash supabase-login.sh
```

### 2. Create Supabase Project
```bash
bash supabase-setup.sh
```

### 3. Initialize Project
```bash
supabase init
```

### 4. Run Migrations
```bash
supabase db push
```

### 5. Deploy Functions
```bash
supabase functions deploy
```

## Environment Configuration
- `.env.local` is generated automatically
- Contains:
  - Supabase URL
  - Anon and Service Role Keys
  - Database Connection String

## Security Notes
- Never commit `.env.local`
- Rotate credentials regularly
- Use service role key only for backend operations

## Troubleshooting
- Ensure you have the latest Supabase CLI
- Check network connectivity
- Verify GitHub authentication

## Recommended Workflow
1. Login
2. Setup Project
3. Configure Environment
4. Run Migrations
5. Deploy Functions