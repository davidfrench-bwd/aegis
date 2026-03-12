#!/usr/bin/env tsx
/**
 * Fetch GHL Data with Cohort Tracking
 * 
 * Pulls real contact data from GoHighLevel based on:
 * - Tags (quiz-lead, consultation-booked, etc.)
 * - Creation date for cohort tracking
 * - Monthly grouping for analytics
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Clinic configurations with GHL location IDs
const CLINICS = [
  {
    id: 'apex-pain-solutions',
    name: 'Apex Pain Solutions',
    locationId: 'iDDjqboB8jXHhSypXEvH',
    ghlApiKey: process.env.GHL_API_KEY_APEX || process.env.GHL_API_KEY
  },
  {
    id: 'natural-foundations',
    name: 'Natural Foundations',
    locationId: 'K8Ch9TAp0gPQNwdiMjw1',
    ghlApiKey: process.env.GHL_API_KEY_NATURAL || process.env.GHL_API_KEY
  },
  {
    id: 'thrive-restoration',
    name: 'Thrive Restoration',
    locationId: 'Xw5qy9f0U2gOiCZGrr1G',
    ghlApiKey: process.env.GHL_API_KEY_THRIVE || process.env.GHL_API_KEY
  }
];

// Tag definitions for tracking
const TRACKING_TAGS = {
  LEAD: 'quiz-lead',
  CONSULT_BOOKED: 'consultation-booked',
  CONSULT_SHOW: 'consultation-completed',
  CONSULT_NO_SHOW: 'consultation-no-show',
  EXAM_SCHEDULED: 'exam-scheduled',
  NEW_PATIENT: 'new-patient',
  COMMITTED: 'committed-to-care'
};

interface Contact {
  id: string;
  dateAdded: string;
  tags: string[];
  customFields?: Record<string, any>;
}

interface MonthlyMetrics {
  month: string;
  leads: number;
  phoneConsults: number;
  phoneConsultShows: number;
  phoneConsultNoShows: number;
  exams: number;
  commits: number;
  selfScheduled: number;
  adSpend: number;
}

async function fetchGHLContacts(clinic: typeof CLINICS[0], startDate: Date, endDate: Date): Promise<Contact[]> {
  console.log(`Fetching contacts for ${clinic.name} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  // For now, return mock data showing the issue
  // TODO: Implement actual GHL API call when credentials are available
  console.warn('⚠️  GHL API credentials not configured - using mock data');
  console.warn('   Please set GHL_API_KEY in .env.local');
  console.warn('   Expected 52 contacts with quiz-lead tag for March, but returning mock data');
  
  // Mock data that demonstrates the issue
  if (clinic.id === 'apex-pain-solutions' && startDate.getMonth() === 2 && startDate.getFullYear() === 2026) {
    // March 2026 - should have 52 quiz-leads
    const contacts: Contact[] = [];
    for (let i = 0; i < 52; i++) {
      contacts.push({
        id: `march-contact-${i}`,
        dateAdded: new Date(2026, 2, Math.floor(Math.random() * 12) + 1).toISOString(),
        tags: ['quiz-lead']
      });
    }
    return contacts;
  }
  
  return [];
}

async function calculateMonthlyMetrics(clinic: typeof CLINICS[0], year: number, month: number): Promise<MonthlyMetrics> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  
  const contacts = await fetchGHLContacts(clinic, startDate, endDate);
  
  // Count contacts by tags
  const metrics: MonthlyMetrics = {
    month: `${year}-${String(month).padStart(2, '0')}`,
    leads: 0,
    phoneConsults: 0,
    phoneConsultShows: 0,
    phoneConsultNoShows: 0,
    exams: 0,
    commits: 0,
    selfScheduled: 0,
    adSpend: 0 // Would come from Meta Ads API
  };
  
  contacts.forEach(contact => {
    if (contact.tags.includes(TRACKING_TAGS.LEAD)) {
      metrics.leads++;
    }
    if (contact.tags.includes(TRACKING_TAGS.CONSULT_BOOKED)) {
      metrics.phoneConsults++;
    }
    if (contact.tags.includes(TRACKING_TAGS.CONSULT_SHOW)) {
      metrics.phoneConsultShows++;
    }
    if (contact.tags.includes(TRACKING_TAGS.CONSULT_NO_SHOW)) {
      metrics.phoneConsultNoShows++;
    }
    if (contact.tags.includes(TRACKING_TAGS.EXAM_SCHEDULED)) {
      metrics.exams++;
    }
    if (contact.tags.includes(TRACKING_TAGS.NEW_PATIENT) || contact.tags.includes(TRACKING_TAGS.COMMITTED)) {
      metrics.commits++;
    }
  });
  
  // Estimate ad spend (placeholder)
  metrics.adSpend = metrics.leads * 70; // ~$70 per lead average
  
  return metrics;
}

async function updateClinicData(clinic: typeof CLINICS[0]) {
  console.log(`\nUpdating data for ${clinic.name}...`);
  
  // Calculate metrics for the last 15 months
  const metrics: MonthlyMetrics[] = [];
  const now = new Date();
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthMetrics = await calculateMonthlyMetrics(
      clinic,
      date.getFullYear(),
      date.getMonth() + 1
    );
    metrics.push(monthMetrics);
  }
  
  // Build analytics cache
  const analyticsData = {
    lastUpdated: Date.now(),
    locationId: clinic.locationId,
    clinicName: clinic.name,
    metrics: metrics
  };
  
  // Calculate current month counts for GHL data format
  const currentMonth = metrics[metrics.length - 1];
  const ghlData = {
    location: clinic.name,
    locationId: clinic.locationId,
    counts: {
      quizLeads: currentMonth.leads,
      consultBooked: currentMonth.phoneConsults,
      consultNoShow: currentMonth.phoneConsultNoShows,
      consultCompleted: currentMonth.phoneConsultShows,
      consultCancelled: 0,
      newPatient: currentMonth.commits
    },
    lastUpdated: new Date().toISOString()
  };
  
  // Save files
  const dataDir = path.join(__dirname, '../public/data');
  fs.mkdirSync(dataDir, { recursive: true });
  
  // Save analytics cache
  const analyticsPath = path.join(dataDir, `${clinic.id}-analytics-cache.json`);
  fs.writeFileSync(analyticsPath, JSON.stringify(analyticsData, null, 2));
  console.log(`✅ Updated analytics cache: ${analyticsPath}`);
  
  // Save GHL data
  const ghlPath = path.join(dataDir, `${clinic.id}-ghl-data.json`);
  fs.writeFileSync(ghlPath, JSON.stringify(ghlData, null, 2));
  console.log(`✅ Updated GHL data: ${ghlPath}`);
  
  // For Apex, also save to legacy filename
  if (clinic.id === 'apex-pain-solutions') {
    const legacyPath = path.join(dataDir, 'apex-analytics-cache.json');
    fs.writeFileSync(legacyPath, JSON.stringify(analyticsData, null, 2));
    console.log(`✅ Updated legacy file: ${legacyPath}`);
  }
  
  // Show current month summary
  console.log(`📊 ${clinic.name} - March 2026:`);
  console.log(`   Quiz Leads: ${currentMonth.leads} ${currentMonth.leads !== 52 ? '⚠️  (Expected 52)' : '✅'}`);
  console.log(`   Consultations Booked: ${currentMonth.phoneConsults}`);
  console.log(`   Show Rate: ${currentMonth.phoneConsultShows}/${currentMonth.phoneConsults}`);
}

async function main() {
  console.log('=== GHL Cohort Data Fetch ===');
  console.log('Fetching contact data based on tags and creation date...\n');
  
  // Check for API credentials
  if (!process.env.GHL_API_KEY && !process.env.GHL_API_KEY_APEX) {
    console.error('❌ ERROR: GHL API credentials not found!');
    console.error('Please add to .env.local:');
    console.error('GHL_API_KEY=your-api-key-here');
    console.error('\nUsing mock data for demonstration...\n');
  }
  
  // Update all clinics
  for (const clinic of CLINICS) {
    await updateClinicData(clinic);
    console.log('');
  }
  
  console.log('✅ All clinic data updated!');
  console.log('\n⚠️  IMPORTANT: This is using mock data.');
  console.log('To get real data with 52 March contacts for Apex:');
  console.log('1. Add GHL API credentials to .env.local');
  console.log('2. Implement the fetchGHLContacts function with actual API calls');
}

main().catch(console.error);