/**
 * Context Loader - Load contact data from GHL via ghl-data services
 *
 * Uses MCP through ghl-data layer (not direct mcporter calls)
 */
import * as contacts from "../ghl-data/dist/services/contacts.js";
import * as conversations from "../ghl-data/dist/services/conversations.js";
import * as appointments from "../ghl-data/dist/services/appointments.js";
import { getDefaultContext, getContextForLocation } from "../ghl-data/dist/context.js";
import { ClinicContextReader } from "./clinic-context-reader.js";
// DEPRECATED: Will be replaced by per-clinic context
const ghlContext = getDefaultContext();
/**
 * Load appointment context for a contact
 * PRIMARY SOURCE OF TRUTH for funnel state
 */
export async function loadAppointmentContext(contactId) {
    try {
        // Check for upcoming appointments
        // Note: GHL API limitation - can't filter by contactId efficiently
        // Would need to fetch all calendar appointments and filter client-side
        // For Phase 1, we'll rely on tag-based detection
        // TODO Phase 2: Implement appointment cache or wait for GHL API improvement
        // const upcomingAppointments = await appointments.getContactAppointments(contactId, ghlContext);
        return {
            hasConsult: false,
            hasExam: false,
            nextAppointmentTime: null,
            appointmentStatus: "none",
        };
    }
    catch (error) {
        console.error("Failed to load appointment context:", error.message);
        return {
            hasConsult: false,
            hasExam: false,
            nextAppointmentTime: null,
            appointmentStatus: "none",
        };
    }
}
/**
 * Load full contact context from GHL via ghl-data services
 * UPDATED: Now loads clinic context + appointments BEFORE tags
 * CRITICAL: Always fetches fresh clinic context from Google Sheets
 */
export async function loadContactContext(contactId, config, locationId) {
    // STEP 1: Load clinic context from Google Sheets (ALWAYS FRESH)
    const effectiveLocationId = locationId || ghlContext.locationId;
    const reader = new ClinicContextReader();
    const clinicContext = await reader.getClinicContext(effectiveLocationId);
    if (!clinicContext) {
        throw new Error(`Clinic context not found in Google Sheets for location ${effectiveLocationId}`);
    }
    // STEP 2: Get GHL context for this clinic
    const clinicGhlContext = await getContextForLocation(effectiveLocationId);
    // STEP 3: Load contact details via ghl-data
    const contact = await contacts.getContact(contactId, clinicGhlContext);
    // STEP 4: Load appointments (PRIMARY source of truth)
    const appointmentContext = await loadAppointmentContext(contactId);
    // STEP 5: Load conversation history via ghl-data
    const messages = await conversations.listMessages(contactId, 20, clinicGhlContext);
    // STEP 6: Extract tags (SECONDARY/fallback)
    const tags = contact.tags || [];
    // Build conversation history
    const conversationHistory = messages.map((msg) => ({
        direction: msg.direction || "unknown",
        body: msg.body || "",
        timestamp: msg.dateAdded || new Date().toISOString(),
    }));
    // hasAppointment derived from appointment context
    const hasAppointment = appointmentContext.hasConsult || appointmentContext.hasExam;
    const contactContext = {
        contactId,
        name: contact.firstName || contact.name,
        phone: contact.phone || "unknown",
        tags,
        hasAppointment,
        appointmentContext, // NEW: Include full appointment context
        conversationHistory,
    };
    return { contactContext, clinicContext };
}
/**
 * Get calendar availability for booking via ghl-data
 */
export async function getCalendarSlots(calendarId, startDate, endDate) {
    try {
        // Default to next 7 days if not specified
        const now = Date.now();
        const weekFromNow = now + (86400000 * 7);
        const start = startDate || String(now);
        const end = endDate || String(weekFromNow);
        const result = await import("../ghl-data/dist/mcp-client.js").then(m => m.ghlMcp.getCalendarAvailability(calendarId, start, end));
        // Flatten the slots from the date-keyed response
        // GHL returns: { "2026-02-16": { "slots": [...] }, "traceId": ... }
        const allSlots = [];
        for (const key of Object.keys(result)) {
            if (key !== 'traceId' && result[key]?.slots) {
                for (const slotTime of result[key].slots) {
                    allSlots.push({
                        startTime: slotTime,
                        available: true
                    });
                }
            }
        }
        return { slots: allSlots };
    }
    catch (error) {
        console.error("Failed to get calendar slots:", error.message);
        return { slots: [] };
    }
}
/**
 * Book an appointment via ghl-data
 */
export async function bookAppointment(contactId, calendarId, startTime) {
    return await appointments.createAppointment({ calendarId, contactId, startTime }, ghlContext);
}
/**
 * Send SMS reply via ghl-data
 */
export async function sendSMS(contactId, message) {
    return await conversations.sendMessage(contactId, message, ghlContext);
}
/**
 * Add tag to contact via ghl-data
 */
export async function addTag(contactId, tagList) {
    for (const tag of tagList) {
        await contacts.addTag(contactId, tag, ghlContext);
    }
}
