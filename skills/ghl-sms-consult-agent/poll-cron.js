#!/usr/bin/env node
/**
 * Cron-Compatible SMS Polling Script
 *
 * Single-execution polling for GHL SMS messages.
 * Designed to be called repeatedly by cron (e.g., every 60s).
 *
 * For each new inbound message:
 * 1. Fetch fresh clinic context from Google Sheet
 * 2. Load contact data via MCP (tags, appointments)
 * 3. Determine funnel state
 * 4. Reply using clinic-specific settings
 */
import * as conversations from "../ghl-data/dist/services/conversations.js";
import { getDefaultContext } from "../ghl-data/dist/context.js";
import { processMessage, loadConfig } from "./listener.js";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCATION_ID = process.env.GHL_LOCATION_ID || "JIISRrxbmMANItOyBU7E";
const STATE_FILE = path.join(__dirname, `poll-state-${LOCATION_ID}.json`);
let pollState = {
    lastCheckedTime: 0,
    lastProcessedMessages: {},
};
async function loadState() {
    try {
        const data = await fs.readFile(STATE_FILE, "utf-8");
        pollState = JSON.parse(data);
    }
    catch {
        // No state file yet - first run
    }
}
async function saveState() {
    await fs.writeFile(STATE_FILE, JSON.stringify(pollState, null, 2));
}
async function checkForNewMessages() {
    const context = getDefaultContext();
    try {
        console.log(`[${new Date().toISOString()}] 🔍 Checking location ${LOCATION_ID} for new SMS...`);
        // Get all conversations for this location
        // Note: This may need pagination for high-volume locations
        const convList = await conversations.searchConversations({ locationId: LOCATION_ID }, context);
        if (!convList || convList.length === 0) {
            console.log("   No conversations found");
            return;
        }
        let newMessagesFound = 0;
        for (const conv of convList) {
            const contactId = conv.contactId;
            const lastMsgTime = conv.lastMessageDate;
            const lastMsgBody = conv.lastMessageBody;
            const lastMsgType = conv.lastMessageType; // "TYPE_SMS" etc.
            if (!lastMsgTime || !lastMsgBody || !contactId) {
                continue;
            }
            const lastMsgTimestamp = new Date(lastMsgTime).getTime();
            // Check if this is inbound (not outbound from us)
            // GHL uses direction field - check if inbound
            if (conv.lastMessageDirection !== "inbound") {
                continue;
            }
            // Check if we've already processed this message
            const lastProcessed = pollState.lastProcessedMessages[contactId] || 0;
            if (lastMsgTimestamp <= lastProcessed) {
                continue; // Already processed
            }
            // New inbound message!
            newMessagesFound++;
            console.log(`\n   📬 New inbound SMS from contact ${contactId}`);
            console.log(`      Message: "${lastMsgBody}"`);
            console.log(`      Time: ${new Date(lastMsgTime).toLocaleString()}`);
            try {
                const messageId = `${lastMsgTimestamp}-${contactId}`;
                // CRITICAL: processMessage will fetch fresh clinic context from Google Sheets
                await processMessage(contactId, lastMsgBody, messageId, agentConfig);
                // Update state for this contact
                pollState.lastProcessedMessages[contactId] = lastMsgTimestamp;
                console.log(`   ✅ Processed and replied successfully`);
            }
            catch (error) {
                console.error(`   ❌ Processing failed for contact ${contactId}:`, error.message);
                // Don't update state on failure - will retry next poll
            }
        }
        if (newMessagesFound === 0) {
            console.log("   No new inbound messages");
        }
        else {
            console.log(`\n📊 Summary: Processed ${newMessagesFound} new message(s)`);
        }
        // Update last checked time
        pollState.lastCheckedTime = Date.now();
        await saveState();
    }
    catch (error) {
        console.error(`❌ Polling error:`, error.message);
        throw error;
    }
}
// Global config for processMessage
let agentConfig;
async function main() {
    console.log("🚀 GHL SMS Polling (Cron Mode)");
    console.log(`📍 Location: ${LOCATION_ID}`);
    console.log(`⏰ Started: ${new Date().toLocaleString()}\n`);
    try {
        // Initialize config (needed by processMessage)
        agentConfig = await loadConfig();
        await loadState();
        await checkForNewMessages();
        console.log("\n✅ Poll complete. Exiting.\n");
        process.exit(0);
    }
    catch (err) {
        console.error("\n❌ Fatal error:", err.message);
        process.exit(1);
    }
}
main();
