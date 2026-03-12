#!/usr/bin/env tsx
/**
 * Fetch ALL months of Apex GHL Data
 * Updates the entire analytics cache with real data from GHL
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const APEX_API_KEY = process.env.GHL_APEX_API_KEY!;
const APEX_LOCATION_ID = 'o9ApBFHMmBmZQYAeTByK';

interface Contact {
  id: string;
  dateAdded: string;
  tags: string[];
}

interface GHLResponse {
  contacts: Contact[];
  meta: {
    total: number;
    nextPageUrl?: string;
    startAfterId?: string;
    startAfter?: number;
  };
}

async function fetchAllContacts(startDate: Date, endDate: Date): Promise<Contact[]> {
  const contacts: Contact[] = [];
  let hasMore = true;
  let startAfterId: string | undefined;
  let startAfter: number | undefined;
  
  console.log(`Fetching all contacts from ${startDate.toISOString()} to ${endDate.toISOString()}`);
  
  while (hasMore) {
    const url = new URL('https://rest.gohighlevel.com/v1/contacts/');
    url.searchParams.append('locationId', APEX_LOCATION_ID);
    url.searchParams.append('limit', '100');
    
    if (startAfterId && startAfter) {
      url.searchParams.append('startAfterId', startAfterId);
      url.searchParams.append('startAfter', String(startAfter));
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${APEX_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as GHLResponse;
    
    // Filter contacts by date range
    const filteredContacts = data.contacts.filter(contact => {
      const dateAdded = new Date(contact.dateAdded);
      return dateAdded >= startDate && dateAdded <= endDate;
    });
    
    contacts.push(...filteredContacts);
    
    // Check if we've gone past our date range
    const lastContact = data.contacts[data.contacts.length - 1];
    if (lastContact && new Date(lastContact.dateAdded) < startDate) {
      hasMore = false;
    } else if (data.meta.nextPageUrl && data.meta.startAfterId) {
      startAfterId = data.meta.startAfterId;
      startAfter = data.meta.startAfter;
      console.log(`  Fetched ${data.contacts.length} contacts, total so far: ${contacts.length}`);
    } else {
      hasMore = false;
    }
  }
  
  return contacts;
}

async function calculateMonthMetrics(contacts: Contact[], year: number, month: number) {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  
  // Filter contacts for this month
  const monthContacts = contacts.filter(contact => {
    const dateAdded = new Date(contact.dateAdded);
    return dateAdded >= monthStart && dateAdded <= monthEnd;
  });
  
  // Count by tags
  const metrics = {
    month: `${year}-${String(month).padStart(2, '0')}`,
    leads: monthContacts.filter(c => c.tags?.includes('quiz-lead')).length,
    phoneConsults: monthContacts.filter(c => c.tags?.includes('consult-booked')).length,
    phoneConsultShows: monthContacts.filter(c => c.tags?.includes('consult-completed')).length,
    phoneConsultNoShows: monthContacts.filter(c => c.tags?.includes('consult-no-show')).length,
    exams: monthContacts.filter(c => c.tags?.includes('exam-booked')).length,
    commits: monthContacts.filter(c => c.tags?.includes('pre-paid') || c.tags?.includes('new-patient')).length,
    selfScheduled: monthContacts.filter(c => c.tags?.includes('consult-self-scheduled')).length,
    adSpend: 0 // Would need Meta API - keeping existing values for now
  };
  
  console.log(`  ${metrics.month}: ${metrics.leads} leads, ${metrics.phoneConsults} consults, ${metrics.exams} exams, ${metrics.commits} commits`);
  
  return metrics;
}

async function main() {
  console.log('=== Fetching ALL Apex GHL Data ===\n');
  
  // Define date range - last 15 months to match existing data
  const endDate = new Date();
  const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth() - 3, 1); // 15 months ago
  
  console.log(`Fetching contacts from ${startDate.toDateString()} to ${endDate.toDateString()}\n`);
  
  // Fetch ALL contacts in date range
  const allContacts = await fetchAllContacts(startDate, endDate);
  console.log(`\nTotal contacts fetched: ${allContacts.length}\n`);
  
  // Load existing analytics data to preserve ad spend
  const analyticsPath = path.join(__dirname, '../public/data/apex-analytics-cache.json');
  const existingData = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
  
  // Calculate metrics for each month
  console.log('Calculating monthly metrics:\n');
  const newMetrics = [];
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
    const metrics = await calculateMonthMetrics(allContacts, date.getFullYear(), date.getMonth() + 1);
    
    // Preserve ad spend from existing data
    const existingMonth = existingData.metrics.find((m: any) => m.month === metrics.month);
    if (existingMonth?.adSpend) {
      metrics.adSpend = existingMonth.adSpend;
    }
    
    newMetrics.push(metrics);
  }
  
  // Update analytics data
  existingData.metrics = newMetrics;
  existingData.lastUpdated = Date.now();
  
  // Save updated data
  fs.writeFileSync(analyticsPath, JSON.stringify(existingData, null, 2));
  
  // Also update legacy file
  const legacyPath = path.join(__dirname, '../public/data/apex-analytics-cache.json');
  fs.writeFileSync(legacyPath, JSON.stringify(existingData, null, 2));
  
  console.log('\n✅ Updated all months with real GHL data!');
  console.log(`✅ Preserved existing ad spend data`);
  
  // Show summary
  const totalLeads = newMetrics.reduce((sum, m) => sum + m.leads, 0);
  const totalCommits = newMetrics.reduce((sum, m) => sum + m.commits, 0);
  console.log(`\n📊 15-Month Summary:`);
  console.log(`   Total Leads: ${totalLeads}`);
  console.log(`   Total Commits: ${totalCommits}`);
  console.log(`   Overall Conversion: ${((totalCommits / totalLeads) * 100).toFixed(1)}%`);
}

main().catch(console.error);