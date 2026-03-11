#!/usr/bin/env tsx
/**
 * Fetch Latest GHL Data for Clinic Dashboards
 * 
 * Fetches contact, lead, and performance data from GoHighLevel
 * Updates local cache files for dashboard analytics
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchGHLData(clinicId: string) {
  console.log(`Fetching GHL data for ${clinicId}`);
  
  // Placeholder for actual GHL API fetch logic
  const { data: contacts, error: contactError } = await supabase
    .from('ghl_contacts')
    .select('*')
    .eq('clinic_id', clinicId)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
  
  if (contactError) {
    console.error(`Error fetching contacts for ${clinicId}:`, contactError);
    return;
  }
  
  // Write to local cache file
  const cacheDir = path.join(__dirname, '../public/dashboard-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  
  const cacheFile = path.join(cacheDir, `${clinicId}-latest.json`);
  fs.writeFileSync(cacheFile, JSON.stringify({
    clinicId,
    contactsCount: contacts?.length || 0,
    lastUpdated: new Date().toISOString()
  }, null, 2));
  
  console.log(`Dashboard cache updated for ${clinicId}`);
}

async function main() {
  // Parse CLI arguments
  const clinicIndex = process.argv.indexOf('--clinic');
  const clinicId = clinicIndex !== -1 ? process.argv[clinicIndex + 1] : null;
  
  if (!clinicId) {
    console.error('No clinic specified. Use --clinic <clinicId>');
    process.exit(1);
  }
  
  try {
    await fetchGHLData(clinicId);
    process.exit(0);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

main();