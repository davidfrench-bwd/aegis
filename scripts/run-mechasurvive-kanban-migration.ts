import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  console.log('🚀 Running MechaSurvive Kanban migration...');

  const migrationPath = path.join(__dirname, '../supabase-migrations/add-mechasurvive-kanban.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
    console.log(statement.substring(0, 100) + '...');

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        console.error('❌ Error:', error.message);
        // Continue anyway - some errors might be expected (like "already exists")
      } else {
        console.log('✅ Success');
      }
    } catch (err: any) {
      console.error('❌ Exception:', err.message);
    }
  }

  console.log('\n✅ Migration complete!');
}

runMigration().catch(console.error);
