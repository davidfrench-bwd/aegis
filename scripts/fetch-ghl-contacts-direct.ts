#!/usr/bin/env tsx
/**
 * Direct GHL API Integration for Contact Fetching
 * 
 * Fetches contacts based on tags with proper cohort tracking
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateAdded: string;
  tags: string[];
  customFields?: any[];
}

interface GHLApiResponse {
  contacts: GHLContact[];
  total: number;
}

class GHLClient {
  private apiKey: string;
  private baseUrl = 'https://services.leadconnectorhq.com';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async getContactsByTag(locationId: string, tag: string, startDate?: Date, endDate?: Date): Promise<GHLContact[]> {
    const url = new URL(`${this.baseUrl}/contacts/`);
    url.searchParams.append('locationId', locationId);
    url.searchParams.append('query', tag);
    url.searchParams.append('limit', '100');
    
    if (startDate) {
      url.searchParams.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      url.searchParams.append('endDate', endDate.toISOString());
    }
    
    console.log(`Fetching contacts from GHL: ${url.toString()}`);
    
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Version': '2021-07-28'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GHL API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as GHLApiResponse;
      
      // Filter by tag since the query might be partial match
      return data.contacts.filter(contact => 
        contact.tags.some(t => t.toLowerCase() === tag.toLowerCase())
      );
    } catch (error) {
      console.error('Error fetching GHL contacts:', error);
      throw error;
    }
  }
}

async function fetchClinicCohortData(clinicId: string, locationId: string, apiKey: string) {
  const client = new GHLClient(apiKey);
  
  // Define the tags we track
  const tags = [
    'quiz-lead',
    'consultation-booked',
    'consultation-completed',
    'consultation-no-show',
    'exam-scheduled',
    'new-patient'
  ];
  
  // Fetch current month data
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  console.log(`\nFetching data for ${clinicId} (${monthStart.toDateString()} - ${monthEnd.toDateString()})`);
  
  const monthlyData: Record<string, number> = {};
  
  for (const tag of tags) {
    try {
      const contacts = await client.getContactsByTag(locationId, tag, monthStart, monthEnd);
      monthlyData[tag] = contacts.length;
      console.log(`  ${tag}: ${contacts.length} contacts`);
    } catch (error) {
      console.error(`  Error fetching ${tag}:`, error);
      monthlyData[tag] = 0;
    }
  }
  
  return monthlyData;
}

async function main() {
  const apiKey = process.env.GHL_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GHL_API_KEY not found in .env.local');
    console.error('\nTo fix this:');
    console.error('1. Get your GHL API key from GoHighLevel settings');
    console.error('2. Add to .env.local:');
    console.error('   GHL_API_KEY=your-api-key-here');
    console.error('\nFor now, showing what the data structure would look like:');
    
    // Show expected data structure
    const exampleData = {
      'apex-pain-solutions': {
        'quiz-lead': 52,  // <-- This is what you're expecting for March
        'consultation-booked': 15,
        'consultation-completed': 10,
        'consultation-no-show': 5,
        'exam-scheduled': 8,
        'new-patient': 4
      }
    };
    
    console.log('\nExpected data structure:');
    console.log(JSON.stringify(exampleData, null, 2));
    
    return;
  }
  
  // Fetch data for each clinic
  const clinics = [
    { id: 'apex-pain-solutions', locationId: 'iDDjqboB8jXHhSypXEvH' },
    { id: 'natural-foundations', locationId: 'K8Ch9TAp0gPQNwdiMjw1' },
    { id: 'thrive-restoration', locationId: 'Xw5qy9f0U2gOiCZGrr1G' }
  ];
  
  for (const clinic of clinics) {
    const data = await fetchClinicCohortData(clinic.id, clinic.locationId, apiKey);
    
    // Save the raw data
    const outputPath = path.join(__dirname, `../public/data/${clinic.id}-cohort-data.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
      clinicId: clinic.id,
      locationId: clinic.locationId,
      month: new Date().toISOString().slice(0, 7),
      tags: data,
      lastUpdated: new Date().toISOString()
    }, null, 2));
    
    console.log(`\n✅ Saved cohort data to ${outputPath}`);
  }
}

main().catch(console.error);