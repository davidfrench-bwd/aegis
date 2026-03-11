#!/usr/bin/env node
/**
 * GHL SMS Consult Agent - Main Listener
 *
 * Modes:
 * - webhook: Listen for GHL webhook events (real-time)
 * - poll: Poll for new messages every N seconds (fallback)
 */
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { loadContactContext, sendSMS, getCalendarSlots } from "./context-loader.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { determineFunnelState } from "./state-machine.js";
import { generateReply, shouldOfferBooking } from "./reply-engine.js";
import { generateBookingOffer, parseBookingIntent, createAppointment } from "./booking-handler.js";
import * as safety from "./safety-filter.js";
import { validateBeforeSend, classifyReplyBehavior } from "./funnel-guard.js";
import { isContactAllowed, getTestModeStatus } from "./test-mode.js";
// Import ghl-data services for polling (compiled JS)
import { getContactsByTag, addTag } from "../ghl-data/dist/services/contacts.js";
import { getRecentInboundMessages } from "../ghl-data/dist/services/conversations.js";
import { getDefaultContext } from "../ghl-data/dist/context.js";
/**
 * Send email notification about SMS interaction
 * Used during initial rollout to monitor all interactions
 */
async function sendEmailNotification(contactPhone, inboundMessage, outboundReply, clinicName) {
    try {
        const { exec } = await import("child_process");
        const { promisify } = await import("util");
        const execAsync = promisify(exec);
        const subject = `SMS Interaction - ${clinicName}`;
        const body = `New SMS Interaction:

Clinic: ${clinicName}
Contact: ${contactPhone}

INBOUND:
${inboundMessage}

OUTBOUND:
${outboundReply}

---
Sent by GHL SMS Agent
`;
        // Use macOS mail command
        await execAsync(`echo "${body.replace(/"/g, '\\"')}" | mail -s "${subject}" david@davidfrench.io`);
        console.log("📧 Email notification sent to david@davidfrench.io");
    }
    catch (error) {
        console.error("⚠️  Failed to send email notification:", error.message);
        // Don't throw - email is optional, don't block SMS flow
    }
}
const CONFIG_PATH = path.join(__dirname, "config.json");
let config;
/**
 * Load config from disk
 */
async function loadConfig() {
    const data = await fs.readFile(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
}
/**
 * Process a single inbound message
 */
async function processMessage(contactId, messageBody, messageId, configOverride) {
    // Use provided config or fall back to module-level config
    const activeConfig = configOverride || config;
    const ghlContext = getDefaultContext();
    // Safety: Check if already processed
    if (safety.isMessageProcessed(messageId)) {
        console.log(`⏭️  Message already processed: ${messageId}`);
        return;
    }
    console.log(`📩 Processing message from ${contactId}: "${messageBody}"`);
    // Step 0.5: Load contact to get phone number for test mode check
    console.log("📋 Loading contact context...");
    const { contactContext, clinicContext } = await loadContactContext(contactId, activeConfig, activeConfig.locationId);
    // 🧪 TEST MODE CHECK (Phase 1: Only respond to allowed phone)
    const testModeCheck = isContactAllowed(contactContext.phone, activeConfig.testMode);
    if (!testModeCheck.allowed) {
        console.log(`🚫 TEST MODE BLOCK: ${testModeCheck.reason}`);
        safety.markMessageProcessed(messageId);
        return;
    }
    // Safety: Check rate limiting
    const replyCheck = safety.canReply(contactId, activeConfig);
    if (!replyCheck.allowed) {
        console.log(`⏸️  Rate limit: ${replyCheck.reason}`);
        safety.markMessageProcessed(messageId);
        return;
    }
    try {
        // Step 1: Continue with loaded context (already loaded in Step 0.5 for test mode check)
        // Step 2: Determine funnel state
        console.log("🔍 Determining funnel state...");
        const stateResult = determineFunnelState(contactContext, activeConfig);
        console.log(`   State: ${stateResult.state} (${stateResult.reason})`);
        // Step 2.5: Check for booking intent (time selection)
        if (stateResult.state === 'booking') {
            const slots = await getCalendarSlots(activeConfig.calendarId);
            const slotTimes = slots.slots?.map((s) => s.startTime) || [];
            const selectedTime = parseBookingIntent(messageBody, slotTimes);
            if (selectedTime) {
                console.log(`📅 Booking detected: ${selectedTime}`);
                const bookingResult = await createAppointment(contactId, activeConfig.calendarId, selectedTime);
                if (bookingResult.success) {
                    console.log(`✅ Appointment booked successfully`);
                    // Add consult-booked tag
                    await addTag(contactId, 'consult-booked', ghlContext);
                    // Add Aegis tracking tag
                    await addTag(contactId, 'aegis-scheduled', ghlContext);
                    // Send confirmation and exit
                    console.log(`📤 Sending confirmation: "${bookingResult.message}"`);
                    await sendSMS(contactId, bookingResult.message);
                    // Email notification for booking
                    await sendEmailNotification(contactContext.phone, messageBody, bookingResult.message, clinicContext.clinicName || "Unknown Clinic");
                    safety.markMessageProcessed(messageId);
                    safety.recordReply(contactId);
                    await safety.saveState();
                    return;
                }
                else {
                    console.error(`❌ Booking failed: ${bookingResult.message}`);
                    // Fall through to generate error reply
                }
            }
        }
        // Step 3: Generate reply (now clinic-aware)
        console.log("💬 Generating reply...");
        const reply = await generateReply({
            contactContext,
            clinicContext, // NEW: Pass clinic context from Notion
            stateResult,
            latestMessage: messageBody,
            config: activeConfig,
        });
        // Step 4: Check if booking offer needed (with appointment context)
        let finalReply = reply;
        if (shouldOfferBooking({ contactContext, clinicContext, stateResult, latestMessage: messageBody, config: activeConfig })) {
            const bookingOffer = await generateBookingOffer(clinicContext.consultCalendarId, // Use clinic's calendar from Notion
            activeConfig, contactContext.appointmentContext // Pass appointment context to prevent duplicate offers
            );
            finalReply = `${reply}\n\n${bookingOffer}`;
        }
        // Step 4.5: 🛡️ FUNNEL GUARDRAIL (Critical: validate before send)
        const intendedBehavior = classifyReplyBehavior(finalReply);
        const guardrail = await validateBeforeSend(contactId, intendedBehavior, activeConfig);
        if (!guardrail.allowed) {
            console.error(`🚨 BLOCKED by funnel guardrail: ${guardrail.reason}`);
            console.error(`   Intended reply: "${finalReply}"`);
            console.error(`   Aborting send to prevent funnel violation`);
            return; // Don't send, don't mark as processed (can retry with fresh state)
        }
        // Step 5: Send reply (guardrail passed)
        console.log(`📤 Sending: "${finalReply}"`);
        await sendSMS(contactId, finalReply);
        // Step 5.5: Add Aegis tracking tag
        await addTag(contactId, 'aegis-sms', ghlContext);
        // Step 5.6: Send email notification (initial rollout monitoring)
        await sendEmailNotification(contactContext.phone, messageBody, finalReply, clinicContext.clinicName || "Unknown Clinic");
        // Step 6: Record state
        safety.markMessageProcessed(messageId);
        safety.recordReply(contactId);
        await safety.saveState();
        console.log("✅ Message processed successfully");
    }
    catch (error) {
        console.error(`❌ Error processing message:`, error.message);
        // Don't mark as processed so it can be retried
    }
}
/**
 * Polling mode: Check for new messages periodically
 * Uses ghl-data to search for quiz-lead contacts and check for new inbound messages
 */
async function startPolling() {
    console.log("🔄 Starting polling mode...");
    console.log(`   Interval: ${config.polling.intervalSeconds}s`);
    console.log(`   Lookback: ${config.polling.lookbackMinutes} minutes`);
    const ghlContext = getDefaultContext();
    setInterval(async () => {
        console.log("\n🔍 Polling for new messages...");
        try {
            // Get all quiz-lead contacts (our target audience)
            const quizLeads = await getContactsByTag("quiz-lead", ghlContext);
            console.log(`   Found ${quizLeads.length} quiz leads to check`);
            if (quizLeads.length === 0) {
                console.log("   No quiz leads found");
                return;
            }
            // Check each contact for new inbound messages
            const lookbackTime = Date.now() - (config.polling.lookbackMinutes * 60 * 1000);
            for (const contact of quizLeads.slice(0, 10)) { // Limit to 10 per poll to avoid rate limits
                try {
                    const messages = await getRecentInboundMessages(contact.id, 5, ghlContext);
                    // Find unprocessed messages within lookback window
                    for (const msg of messages) {
                        const msgTime = new Date(msg.dateAdded).getTime();
                        if (msgTime > lookbackTime) {
                            const messageId = msg.id;
                            // Check if already processed
                            if (!safety.isMessageProcessed(messageId)) {
                                console.log(`📬 New message from ${contact.phone}: "${msg.body.substring(0, 50)}..."`);
                                // Process the message
                                await processMessage(contact.id, msg.body, messageId);
                            }
                        }
                    }
                }
                catch (error) {
                    console.error(`   Error checking ${contact.id}:`, error.message);
                }
            }
        }
        catch (error) {
            console.error("Polling error:", error.message);
        }
    }, config.polling.intervalSeconds * 1000);
}
/**
 * Webhook mode: Listen for HTTP POST events
 */
async function startWebhook(port = 3457) {
    console.log(`🌐 Starting webhook mode on port ${port}...`);
    const http = await import("http");
    const server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }
        // Health check
        if (req.method === "GET" && req.url === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok", service: "ghl-sms-consult-agent" }));
            return;
        }
        // Webhook endpoint
        if (req.method === "POST" && req.url === "/webhook") {
            let body = "";
            req.on("data", chunk => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                try {
                    const event = JSON.parse(body);
                    // Extract GHL webhook data
                    // Format varies by GHL webhook type; adjust as needed
                    const contactId = event.contactId || event.contact_id;
                    const messageBody = event.message || event.body || event.messageBody;
                    const messageId = event.id || event.messageId || `${Date.now()}-${contactId}`;
                    if (!contactId || !messageBody) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Missing contactId or message" }));
                        return;
                    }
                    // Process message asynchronously
                    processMessage(contactId, messageBody, messageId).catch(err => {
                        console.error("Async processing error:", err);
                    });
                    // Respond immediately
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ status: "processing" }));
                }
                catch (error) {
                    console.error("Webhook error:", error);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: error.message }));
                }
            });
            return;
        }
        // 404
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
    });
    server.listen(port, () => {
        console.log(`✅ Webhook listening on http://localhost:${port}/webhook`);
        console.log(`   Health: http://localhost:${port}/health`);
    });
}
/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);
    const mode = args.find(a => a.startsWith("--mode="))?.split("=")[1] || "poll";
    const port = parseInt(args.find(a => a.startsWith("--port="))?.split("=")[1] || "3457");
    console.log("🚀 GHL SMS Consult Agent Starting...");
    // Load config
    config = await loadConfig();
    console.log(`📍 Location: ${config.locationId}`);
    console.log(`📅 Calendar: ${config.calendarName} (${config.calendarId})`);
    console.log(`🧪 ${getTestModeStatus(config.testMode)}`);
    // Initialize safety filter
    await safety.initialize();
    // Cleanup on exit
    process.on("SIGINT", async () => {
        console.log("\n🛑 Shutting down...");
        await safety.cleanup();
        process.exit(0);
    });
    // Start listener
    if (mode === "webhook") {
        await startWebhook(port);
    }
    else {
        await startPolling();
    }
}
// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(err => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
export { processMessage, loadConfig };
