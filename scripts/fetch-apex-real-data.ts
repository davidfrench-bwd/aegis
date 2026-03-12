#!/usr/bin/env tsx
/**
 * Fetch Real Apex GHL Data
 * Using the subaccount API key to get actual contact counts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const APEX_API_KEY = process.env.GHL_APEX_API_KEY!;
const APEX_LOCATION_ID = 'o9ApBFHMmBmZQYAeTByK'; // From the JWT

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

async function fetchContactsByTag(tag: string, startDate: Date, endDate: Date): Promise<Contact[]> {
  const contacts: Contact[] = [];
  let hasMore = true;
  let startAfterId: string | undefined;
  let startAfter: number | undefined;
  
  while (hasMore) {
    const url = new URL('https://rest.gohighlevel.com/v1/contacts/');
    url.searchParams.append('locationId', APEX_LOCATION_ID);
    url.searchParams.append('limit', '100');
    
    if (startAfterId && startAfter) {
      url.searchParams.append('startAfterId', startAfterId);
      url.searchParams.append('startAfter', String(startAfter));
    }
    
    console.log(`Fetching page... ${contacts.length} contacts so far`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${APEX_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json() as GHLResponse;
    
    // Filter contacts by tag and date
    const filteredContacts = data.contacts.filter(contact => {
      const dateAdded = new Date(contact.dateAdded);
      return contact.tags?.includes(tag) && 
             dateAdded >= startDate && 
             dateAdded <= endDate;
    });
    
    contacts.push(...filteredContacts);
    
    // Check if we have more pages
    if (data.meta.nextPageUrl && data.meta.startAfterId) {
      startAfterId = data.meta.startAfterId;
      startAfter = data.meta.startAfter;
      
      // Stop if we've gone past our end date
      const lastContact = data.contacts[data.contacts.length - 1];
      if (lastContact && new Date(lastContact.dateAdded) < startDate) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  
  return contacts;
}

async function main() {
  console.log('=== Fetching Real Apex GHL Data ===\n');
  
  // March 2026 date range
  const startDate = new Date('2026-03-01');
  const endDate = new Date('2026-03-31T23:59:59');
  
  console.log(`Date range: ${startDate.toDateString()} - ${endDate.toDateString()}\n`);
  
  // Fetch contacts by tag (using actual tags from GHL)
  const tags = [
    'quiz-lead',
    'consult-booked',
    'consult-confirmed',
    'consult-self-scheduled',
    'consult-no-show',
    'consult-completed',
    'exam-booked',
    'pre-paid',
    'new-patient',
    'neuropathy'
  ];
  
  const tagCounts: Record<string, number> = {};
  
  for (const tag of tags) {
    console.log(`\nFetching contacts with tag: ${tag}`);
    try {
      const contacts = await fetchContactsByTag(tag, startDate, endDate);
      tagCounts[tag] = contacts.length;
      console.log(`✅ Found ${contacts.length} contacts with "${tag}" tag`);
    } catch (error) {
      console.error(`❌ Error fetching ${tag}:`, error);
      tagCounts[tag] = 0;
    }
  }
  
  // Save the results
  const outputData = {
    clinicId: 'apex-pain-solutions',
    clinicName: 'Apex Pain Solutions',
    locationId: APEX_LOCATION_ID,
    month: '2026-03',
    tagCounts,
    dateRange: {
      start: startDate.toISOString(),
      end: endDate.toISOString()
    },
    lastUpdated: new Date().toISOString()
  };
  
  const outputPath = path.join(__dirname, '../public/data/apex-march-real-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
  
  console.log('\n=== Summary ===');
  console.log(JSON.stringify(tagCounts, null, 2));
  console.log(`\n✅ Data saved to: ${outputPath}`);
  
  // Update the analytics cache with real data
  const analyticsPath = path.join(__dirname, '../public/data/apex-analytics-cache.json');
  const analyticsData = JSON.parse(fs.readFileSync(analyticsPath, 'utf-8'));
  
  // Update March 2026 data
  const marchIndex = analyticsData.metrics.findIndex((m: any) => m.month === '2026-03');
  if (marchIndex >= 0) {
    analyticsData.metrics[marchIndex] = {
      month: '2026-03',
      leads: tagCounts['quiz-lead'] || 0,
      phoneConsults: tagCounts['consult-booked'] || 0,  // Fixed: consult-booked = phone consults
      phoneConsultShows: tagCounts['consult-completed'] || 0,
      phoneConsultNoShows: tagCounts['consult-no-show'] || 0,
      exams: tagCounts['exam-booked'] || 0,  // Fixed: exam-booked = exams
      commits: tagCounts['pre-paid'] || tagCounts['new-patient'] || 0,  // pre-paid or new-patient = commits
      selfScheduled: tagCounts['consult-self-scheduled'] || 0,  // Fixed: using actual self-scheduled tag
      adSpend: 0 // Would need Meta API
    };
    
    analyticsData.lastUpdated = Date.now();
    fs.writeFileSync(analyticsPath, JSON.stringify(analyticsData, null, 2));
    
    // Also update the legacy file
    const legacyPath = path.join(__dirname, '../public/data/apex-analytics-cache.json');
    fs.writeFileSync(legacyPath, JSON.stringify(analyticsData, null, 2));
    
    console.log('\n✅ Updated analytics cache with real March data');
  }
}

main().catch(console.error);