# MechaSurvive Real-time Kanban Deployment

## Step 1: Run SQL Migration in Supabase

1. Go to https://supabase.com/dashboard/project/fbmsmqukiogxeclmgvim/sql/new
2. Copy and paste this SQL:

```sql
-- MechaSurvive Kanban Tasks Table
CREATE TABLE IF NOT EXISTS mechasurvive_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
    week TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo', 'inprogress', 'done')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE mechasurvive_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users can do everything
CREATE POLICY "Admin full access to mechasurvive_tasks"
    ON mechasurvive_tasks
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Add index for faster queries
CREATE INDEX idx_mechasurvive_tasks_status ON mechasurvive_tasks(status);
CREATE INDEX idx_mechasurvive_tasks_sort_order ON mechasurvive_tasks(status, sort_order);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_mechasurvive_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mechasurvive_tasks_updated_at
    BEFORE UPDATE ON mechasurvive_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_mechasurvive_tasks_updated_at();
```

3. Click "Run" to execute

## Step 2: Deploy to Vercel

The new kanban file is ready at: `public/mechasurvive-kanban-v2.html`

To deploy:
```bash
cd /Users/alfredpennyworth/.openclaw/workspace
git add public/mechasurvive-kanban-v2.html
git commit -m "Add real-time MechaSurvive kanban with Supabase sync"
git push
```

Vercel will auto-deploy.

## Step 3: Test the New Kanban

1. Visit: https://aegis.davidmasters.net/mechasurvive-kanban-v2.html
2. Open the same page on two different computers/browsers
3. Drag a card on one device
4. Watch it instantly update on the other device! ⚡

## Step 4: Replace Old Kanban (Optional)

Once tested and working:
```bash
cd /Users/alfredpennyworth/.openclaw/workspace
mv public/mechasurvive-kanban.html public/mechasurvive-kanban-old.html
mv public/mechasurvive-kanban-v2.html public/mechasurvive-kanban.html
git add public/mechasurvive-kanban*.html
git commit -m "Replace kanban with real-time version"
git push
```

## Features

✅ Real-time sync across all devices
✅ Drag and drop between columns
✅ Add new tasks
✅ Delete tasks
✅ Visual sync indicator
✅ Persists in Supabase database
✅ No more localStorage - works everywhere!

## Troubleshooting

**If real-time doesn't work:**
1. Check browser console for errors
2. Verify you're logged in as admin
3. Check Supabase dashboard for the table
4. Verify RLS policies are active

**Database URL:** https://fbmsmqukiogxeclmgvim.supabase.co
**Project:** fbmsmqukiogxeclmgvim
