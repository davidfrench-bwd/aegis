#!/usr/bin/env tsx
/**
 * Restore Apex historical data from backup
 */

import * as fs from 'fs';
import * as path from 'path';

// Read the backup data
const backupPath = path.join(__dirname, '../data/apex-analytics-cache.json');
const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

// Update with current timestamp but keep historical metrics
const restoredData = {
  ...backupData,
  lastUpdated: Date.now(),
  locationId: 'iDDjqboB8jXHhSypXEvH' // Use the correct location ID
};

// Save to both locations
const publicPath = path.join(__dirname, '../public/data/apex-analytics-cache.json');
const painSolutionsPath = path.join(__dirname, '../public/data/apex-pain-solutions-analytics-cache.json');

fs.writeFileSync(publicPath, JSON.stringify(restoredData, null, 2));
fs.writeFileSync(painSolutionsPath, JSON.stringify(restoredData, null, 2));

console.log('✅ Restored Apex historical data');
console.log(`Total months: ${restoredData.metrics.length}`);
console.log(`Total leads: ${restoredData.metrics.reduce((sum, m) => sum + m.leads, 0)}`);