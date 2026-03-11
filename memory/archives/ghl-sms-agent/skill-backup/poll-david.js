#!/usr/bin/env node
/**
 * Simple Polling Script - David's Contact Only
 *
 * Checks for new inbound messages from David (352-470-2825) every 30 seconds
 * Processes via SMS agent logic
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
const DAVID_CONTACT_ID = "StSOs5vO6vlA36oPG2aW";
const POLL_INTERVAL_MS = 30000; // 30 seconds
const STATE_FILE = path.join(__dirname, "poll-state.json");
let pollState = {
    lastCheckedMessageId: null,
    lastCheckedTime: 0,
};
async function loadState() {
    try {
        const data = await fs.readFile(STATE_FILE, "utf-8");
        pollState = JSON.parse(data);
    }
    catch {
        // No state file yet
    }
}
async function saveState() {
    await fs.writeFile(STATE_FILE, JSON.stringify(pollState, null, 2));
}
async function checkForNewMessages() {
    const context = getDefaultContext();
    try {
        console.log(`[${new Date().toLocaleTimeString()}] 🔍 Checking for new messages from David...`);
        // Get conversation metadata (includes last message)
        const convData = await conversations.getConversation(DAVID_CONTACT_ID, context);
        if (!convData) {
            console.log("   No conversation found");
            return;
        }
        // Check if it's new (not yet processed)
        const lastMsgTime = convData.lastMessageDate;
        const messageBody = convData.lastMessageBody;
        if (!lastMsgTime || !messageBody) {
            console.log("   No message data found");
            return;
        }
        const lastMsgTimestamp = new Date(lastMsgTime).getTime();
        if (lastMsgTimestamp <= pollState.lastCheckedTime) {
            console.log("   No new messages since last check");
            return;
        }
        const messageId = `${lastMsgTimestamp}-${DAVID_CONTACT_ID}`;
        console.log(`\n   📬 New inbound message detected!`);
        console.log(`      Message: "${messageBody}"`);
        console.log(`      Time: ${new Date(lastMsgTime).toLocaleString()}`);
        try {
            await processMessage(DAVID_CONTACT_ID, messageBody, messageId, agentConfig);
            // Update state
            pollState.lastCheckedMessageId = messageId;
            pollState.lastCheckedTime = lastMsgTimestamp;
            await saveState();
            console.log(`   ✅ Processed and replied successfully`);
        }
        catch (error) {
            console.error(`   ❌ Processing failed:`, error.message);
        }
    }
    catch (error) {
        console.error(`Polling error:`, error.message);
    }
}
// Global config for processMessage
let agentConfig;
async function main() {
    console.log("🚀 SMS Agent - David Polling Mode");
    console.log(`📞 Contact: David French (352-470-2825)`);
    console.log(`🔄 Interval: ${POLL_INTERVAL_MS / 1000}s`);
    console.log(`🧪 Test mode: ENABLED\n`);
    // Initialize config (needed by processMessage)
    agentConfig = await loadConfig();
    await loadState();
    // Initial check
    await checkForNewMessages();
    // Poll every N seconds
    setInterval(async () => {
        await checkForNewMessages();
    }, POLL_INTERVAL_MS);
    console.log("\n✅ Polling active. Press Ctrl+C to stop.\n");
}
main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=poll-david.js.map