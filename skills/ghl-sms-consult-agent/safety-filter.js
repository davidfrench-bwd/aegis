/**
 * Safety Filter - Prevent double-booking, rate limiting, validation
 */
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATE_FILE = path.join(__dirname, "agent-state.json");
let state = {
    lastReplies: {},
    processedMessages: new Set(),
    bookings: {},
};
/**
 * Load agent state from disk
 */
export async function loadState() {
    try {
        const data = await fs.readFile(STATE_FILE, "utf-8");
        const parsed = JSON.parse(data);
        state.lastReplies = parsed.lastReplies || {};
        state.processedMessages = new Set(parsed.processedMessages || []);
        state.bookings = parsed.bookings || {};
    }
    catch (error) {
        // File doesn't exist or is invalid; use defaults
        console.log("No existing state file, starting fresh");
    }
}
/**
 * Save agent state to disk
 */
export async function saveState() {
    const serializable = {
        lastReplies: state.lastReplies,
        processedMessages: Array.from(state.processedMessages),
        bookings: state.bookings,
    };
    await fs.writeFile(STATE_FILE, JSON.stringify(serializable, null, 2));
}
/**
 * Check if message has already been processed
 */
export function isMessageProcessed(messageId) {
    return state.processedMessages.has(messageId);
}
/**
 * Mark message as processed
 */
export function markMessageProcessed(messageId) {
    state.processedMessages.add(messageId);
    // Clean up old processed messages (keep last 1000)
    if (state.processedMessages.size > 1000) {
        const array = Array.from(state.processedMessages);
        state.processedMessages = new Set(array.slice(-1000));
    }
}
/**
 * Check if contact can receive a reply (rate limiting)
 * Max 1 reply per contact per 5 minutes
 */
export function canReply(contactId, config) {
    const now = Date.now();
    const lastReply = state.lastReplies[contactId];
    if (!lastReply) {
        return { allowed: true };
    }
    const minutesSinceLastReply = (now - lastReply) / 1000 / 60;
    const limit = config.safety?.maxRepliesPerContactPer5Min || 1;
    const windowMinutes = 5;
    if (minutesSinceLastReply < windowMinutes) {
        return {
            allowed: false,
            reason: `Already replied ${minutesSinceLastReply.toFixed(1)} minutes ago (limit: ${limit} per ${windowMinutes} min)`,
        };
    }
    return { allowed: true };
}
/**
 * Record that a reply was sent
 */
export function recordReply(contactId) {
    state.lastReplies[contactId] = Date.now();
    // Clean up old reply timestamps (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, timestamp] of Object.entries(state.lastReplies)) {
        if (timestamp < oneHourAgo) {
            delete state.lastReplies[id];
        }
    }
}
/**
 * Check if contact already has a booking recorded
 */
export function hasExistingBooking(contactId) {
    return !!state.bookings[contactId];
}
/**
 * Record a new booking
 */
export function recordBooking(contactId, appointmentId) {
    state.bookings[contactId] = appointmentId;
}
/**
 * Validate that booking is safe (no double-booking)
 */
export function validateBooking(contactId, hasAppointment) {
    if (hasAppointment) {
        return {
            safe: false,
            reason: "Contact already has an appointment in GHL",
        };
    }
    if (hasExistingBooking(contactId)) {
        return {
            safe: false,
            reason: "Contact already has a booking recorded by agent",
        };
    }
    return { safe: true };
}
/**
 * Initialize safety filter (load state)
 */
export async function initialize() {
    await loadState();
}
/**
 * Cleanup: save state before exit
 */
export async function cleanup() {
    await saveState();
}
