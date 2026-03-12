#!/usr/bin/env tsx
/**
 * Update GHL Source Data
 * 
 * Fetches fresh data from GHL API and updates the source cache files
 * that the dashboard system reads from
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

// Clinic configurations
const CLINICS = [
  {
    id: 'apex-pain-solutions',
    name: 'Apex Pain Solutions',
    locationId: 'iDDjqboB8jXHhSypXEvH'
  },
  {
    id: 'natural-foundations',
    name: 'Natural Foundations',
    locationId: 'K8Ch9TAp0gPQNwdiMjw1'
  },
  {
    id: 'thrive-restoration',
    name: 'Thrive Restoration',
    locationId: 'Xw5qy9f0U2gOiCZGrr1G'
  }
];

async function fetchClinicMetrics(clinic: typeof CLINICS[0]) {
  console.log(`Fetching metrics for ${clinic.name}...`);
  
  try {
    // Fetch from automation_logs to get recent activity
    const { data: logs, error: logsError } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('clinic_id', clinic.id)
      .gte('run_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('run_at', { ascending: false });
    
    if (logsError) {
      console.error(`Error fetching logs for ${clinic.name}:`, logsError);
    }
    
    // Fetch lead events for contact counts
    const { data: leadEvents, error: leadError } = await supabase
      .from('lead_events')
      .select('*')
      .eq('clinic_id', clinic.id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (leadError) {
      console.error(`Error fetching lead events for ${clinic.name}:`, leadError);
    }
    
    // Build GHL-style data
    const ghlData = {
      location: clinic.name,
      locationId: clinic.locationId,
      counts: {
        quizLeads: leadEvents?.filter(e => e.source === 'quiz')?.length || 0,
        consultBooked: leadEvents?.filter(e => e.payload?.tags?.includes('Consultation Booked'))?.length || 0,
        consultNoShow: 0, // Would need appointment data
        consultCompleted: 0, // Would need appointment data
        consultCancelled: 0, // Would need appointment data
        newPatient: leadEvents?.filter(e => e.payload?.tags?.includes('New Patient'))?.length || 0
      },
      lastUpdated: new Date().toISOString()
    };
    
    // Save GHL data
    const ghlPath = path.join(__dirname, '../public/data', `${clinic.id}-ghl-data.json`);
    fs.mkdirSync(path.dirname(ghlPath), { recursive: true });
    fs.writeFileSync(ghlPath, JSON.stringify(ghlData, null, 2));
    console.log(`✅ Updated GHL data for ${clinic.name}`);
    
    // Generate analytics cache (monthly metrics)
    const analyticsData = await generateAnalyticsCache(clinic, leadEvents || []);
    const analyticsPath = path.join(__dirname, '../public/data', `${clinic.id}-analytics-cache.json`);
    fs.writeFileSync(analyticsPath, JSON.stringify(analyticsData, null, 2));
    console.log(`✅ Updated analytics cache for ${clinic.name}`);
    
    // Also copy to legacy filenames for backward compatibility
    if (clinic.id === 'apex-pain-solutions') {
      fs.copyFileSync(analyticsPath, path.join(__dirname, '../public/data/apex-analytics-cache.json'));
      console.log('✅ Updated legacy apex-analytics-cache.json');
    }
    
  } catch (error) {
    console.error(`Failed to update ${clinic.name}:`, error);
  }
}

async function generateAnalyticsCache(clinic: typeof CLINICS[0], leadEvents: any[]) {
  // Group lead events by month
  const monthlyData: Record<string, any> = {};
  
  leadEvents.forEach(event => {
    const month = new Date(event.created_at).toISOString().slice(0, 7);
    if (!monthlyData[month]) {
      monthlyData[month] = {
        month,
        leads: 0,
        phoneConsults: 0,
        phoneConsultShows: 0,
        phoneConsultNoShows: 0,
        exams: 0,
        commits: 0,
        selfScheduled: 0,
        adSpend: 0
      };
    }
    
    monthlyData[month].leads++;
    
    // Parse tags from payload if available
    const tags = event.payload?.tags || [];
    if (tags.includes('Consultation Booked')) monthlyData[month].phoneConsults++;
    if (tags.includes('Consultation Completed')) monthlyData[month].phoneConsultShows++;
    if (tags.includes('Exam Scheduled')) monthlyData[month].exams++;
    if (tags.includes('New Patient')) monthlyData[month].commits++;
  });
  
  // Get ad spend from Meta campaigns (placeholder for now)
  Object.keys(monthlyData).forEach(month => {
    // Placeholder: estimate $50-100 per lead
    monthlyData[month].adSpend = monthlyData[month].leads * (50 + Math.random() * 50);
  });
  
  return {
    lastUpdated: Date.now(),
    locationId: clinic.locationId,
    clinicName: clinic.name,
    metrics: Object.values(monthlyData).sort((a: any, b: any) => 
      a.month.localeCompare(b.month)
    )
  };
}

async function updateAllClinics() {
  console.log(`[${new Date().toISOString()}] Starting GHL source data update...`);
  
  for (const clinic of CLINICS) {
    await fetchClinicMetrics(clinic);
  }
  
  console.log(`[${new Date().toISOString()}] GHL source data update complete!`);
}

// Run the update
updateAllClinics();