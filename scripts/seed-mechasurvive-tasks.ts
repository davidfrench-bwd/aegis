import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const initialTasks = [
  { title: '🚨 Request Steam Playtest Access', priority: 'high', week: 'Week 4', status: 'todo', sort_order: 1 },
  { title: 'Implement 2 Arsenal Slots (LB/RB, Q/F)', priority: 'high', week: 'Week 4', status: 'todo', sort_order: 2 },
  { title: 'Build Gate Unlock System', priority: 'high', week: 'Week 4', status: 'todo', sort_order: 3 },
  { title: 'Death Screen + Restart Flow', priority: 'high', week: 'Week 4', status: 'todo', sort_order: 4 },
  { title: 'Remove Drop Pod System', priority: 'medium', week: 'Week 4', status: 'todo', sort_order: 5 },
  { title: 'Start Room 2 Layout (with Level Designer)', priority: 'medium', week: 'Week 4', status: 'todo', sort_order: 6 },
  { title: 'Research Steam Capsule Art (Top Roguelites)', priority: 'low', week: 'Week 4', status: 'todo', sort_order: 7 },
  { title: 'Block Out Room 2-5 Layouts (Rough Sketches)', priority: 'low', week: 'Week 4', status: 'todo', sort_order: 8 },
];

async function seedTasks() {
  console.log('🌱 Seeding MechaSurvive tasks...');

  // Check if tasks already exist
  const { data: existing, error: checkError } = await supabase
    .from('mechasurvive_tasks')
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking existing tasks:', checkError);
    return;
  }

  if (existing && existing.length > 0) {
    console.log('⚠️  Tasks already exist. Skipping seed.');
    return;
  }

  // Insert tasks
  const { data, error } = await supabase
    .from('mechasurvive_tasks')
    .insert(initialTasks);

  if (error) {
    console.error('❌ Error seeding tasks:', error);
    return;
  }

  console.log('✅ Successfully seeded', initialTasks.length, 'tasks!');
}

seedTasks().catch(console.error);
