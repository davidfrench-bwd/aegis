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
