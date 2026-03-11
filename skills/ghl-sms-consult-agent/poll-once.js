#!/usr/bin/env node
/**
 * One-Shot SMS Polling for Cron
 * 
 * Runs once, checks for new messages, processes them, then exits.
 * Designed to be called by cron every 60 seconds.
 */

import { processMessage, loadConfig } from "./listener.js";
import { getContactsByTag } from "../ghl-data/dist/services/contacts.js";
import { getRecentInboundMessages } from "../ghl-data/dist/services/conversations.js";
import { getDefaultContext } from "../ghl-data/dist/context.js";
import * as safety from "./safety-filter.js";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LOOKBACK_MINUTES = 5;

async function main() {
  console.log(`[${new Date().toISOString()}] 🔍 Checking for new SMS messages...`);
  
  try {
    // Load config
    const config = await loadConfig();
    console.log(`   Location: ${config.locationId}`);
    
    // Initialize safety filter
    await safety.initialize();
    
    const ghlContext = getDefaultContext();
    
    // Get all quiz-lead contacts
    const quizLeads = await getContactsByTag("quiz-lead", ghlContext);
    console.log(`   Found ${quizLeads.length} quiz leads`);
    
    if (quizLeads.length === 0) {
      console.log("   No quiz leads to check");
      await safety.cleanup();
      process.exit(0);
    }
    
    // Check each contact for new messages
    const lookbackTime = Date.now() - (LOOKBACK_MINUTES * 60 * 1000);
    let processedCount = 0;
    
    for (const contact of quizLeads.slice(0, 20)) { // Limit to 20 per run
      try {
        const messages = await getRecentInboundMessages(contact.id, 5, ghlContext);
        
        // Find unprocessed messages within lookback window
        for (const msg of messages) {
          const msgTime = new Date(msg.dateAdded).getTime();
          if (msgTime > lookbackTime) {
            const messageId = msg.id;
            
            if (!safety.isMessageProcessed(messageId)) {
              console.log(`\n   📬 New message from ${contact.phone}`);
              console.log(`      "${msg.body.substring(0, 60)}${msg.body.length > 60 ? '...' : ''}"`);
              
              // Process the message
              await processMessage(contact.id, msg.body, messageId, config);
              processedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`   ⚠️  Error checking ${contact.id}:`, error.message);
      }
    }
    
    console.log(`\n   ✅ Complete. Processed ${processedCount} new message(s).`);
    
    // Cleanup and exit
    await safety.cleanup();
    process.exit(0);
    
  } catch (error) {
    console.error(`\n   ❌ Fatal error:`, error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
