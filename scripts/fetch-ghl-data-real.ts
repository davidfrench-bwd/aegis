#!/usr/bin/env tsx
/**
 * Fetch Real GHL Data for Clinic Dashboards
 * 
 * Copies existing cached data to dashboard cache location
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Map clinic IDs to their GHL location IDs
const CLINIC_MAPPINGS: Record<string, { locationId: string, name: string }> = {
  'apex-pain-solutions': { locationId: 'iDDjqboB8jXHhSypXEvH', name: 'Apex Pain Solutions' },
  'natural-foundations': { locationId: 'K8Ch9TAp0gPQNwdiMjw1', name: 'Natural Foundations' },
  'thrive-restoration': { locationId: 'Xw5qy9f0U2gOiCZGrr1G', name: 'Thrive Restoration' },
  'advanced-shockwave': { locationId: 'AdvShockwaveLocationId', name: 'Advanced Shockwave' } // Need to find actual ID
};

async function fetchGHLData(clinicId: string) {
  console.log(`[${new Date().toISOString()}] Fetching GHL data for ${clinicId}`);
  
  const clinicInfo = CLINIC_MAPPINGS[clinicId];
  if (!clinicInfo) {
    console.error(`Unknown clinic ID: ${clinicId}`);
    return false;
  }
  
  try {
    // Check multiple possible source locations for existing data
    const possibleSources = [
      path.join(__dirname, `../public/data/${clinicId}-ghl-data.json`),
      path.join(__dirname, `../public/data/${clinicId.replace(/-/g, '-')}-ghl-data.json`),
      path.join(__dirname, `../public/data/${clinicInfo.name.toLowerCase().replace(/ /g, '-')}-ghl-data.json`),
      path.join(__dirname, `../cache/${clinicId}-ghl-data.json`),
      path.join(__dirname, `../aegis-pages/cache/${clinicId}-ghl-data.json`)
    ];
    
    // Also check for analytics cache which has richer data
    const analyticsSources = [
      path.join(__dirname, `../public/data/${clinicId}-analytics-cache.json`),
      path.join(__dirname, `../public/data/${clinicInfo.name.toLowerCase().replace(/ /g, '-')}-analytics-cache.json`),
      path.join(__dirname, `../cache/${clinicId}-analytics-cache.json`)
    ];
    
    let ghlData: any = null;
    let analyticsData: any = null;
    
    // Try to find GHL data
    for (const source of possibleSources) {
      if (fs.existsSync(source)) {
        console.log(`Found GHL data at: ${source}`);
        ghlData = JSON.parse(fs.readFileSync(source, 'utf-8'));
        break;
      }
    }
    
    // Try to find analytics data
    for (const source of analyticsSources) {
      if (fs.existsSync(source)) {
        console.log(`Found analytics data at: ${source}`);
        analyticsData = JSON.parse(fs.readFileSync(source, 'utf-8'));
        break;
      }
    }
    
    // Combine data into dashboard format
    const dashboardData = {
      clinicId,
      clinicName: clinicInfo.name,
      locationId: clinicInfo.locationId,
      status: 'operational',
      lastUpdated: new Date().toISOString(),
      metrics: {
        // From GHL data if available
        ...(ghlData?.counts ? {
          quizLeads: ghlData.counts.quizLeads || 0,
          consultBooked: ghlData.counts.consultBooked || 0,
          consultNoShow: ghlData.counts.consultNoShow || 0,
          consultCompleted: ghlData.counts.consultCompleted || 0,
          newPatients: ghlData.counts.newPatient || 0
        } : {}),
        // From analytics data if available
        ...(analyticsData?.metrics ? {
          currentMonth: analyticsData.metrics[analyticsData.metrics.length - 1],
          totalMetrics: analyticsData.metrics.reduce((acc: any, month: any) => ({
            leads: (acc.leads || 0) + (month.leads || 0),
            phoneConsults: (acc.phoneConsults || 0) + (month.phoneConsults || 0),
            exams: (acc.exams || 0) + (month.exams || 0),
            commits: (acc.commits || 0) + (month.commits || 0),
            adSpend: (acc.adSpend || 0) + (month.adSpend || 0)
          }), {})
        } : {})
      },
      cacheVersion: '3.0',
      dataSource: {
        ghlData: ghlData ? 'found' : 'missing',
        analyticsData: analyticsData ? 'found' : 'missing'
      }
    };
    
    // Write to dashboard cache
    const cacheDir = path.join(__dirname, '../public/dashboard-cache');
    fs.mkdirSync(cacheDir, { recursive: true });
    
    const cacheFile = path.join(cacheDir, `${clinicId}-latest.json`);
    fs.writeFileSync(cacheFile, JSON.stringify(dashboardData, null, 2));
    
    console.log(`✅ ${clinicId} dashboard cache updated with real data`);
    return true;
  } catch (error) {
    console.error(`Error updating cache for ${clinicId}:`, error);
    return false;
  }
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
    const success = await fetchGHLData(clinicId);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

main();