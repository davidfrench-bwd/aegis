#!/usr/bin/env node
/**
 * GHL SMS Consult Agent - Main Listener
 *
 * Modes:
 * - webhook: Listen for GHL webhook events (real-time)
 * - poll: Poll for new messages every N seconds (fallback)
 */
interface Config {
    locationId: string;
    calendarId: string;
    calendarName: string;
    testMode: {
        enabled: boolean;
        allowedPhone: string;
        note?: string;
    };
    tags: Record<string, string>;
    polling: {
        intervalSeconds: number;
        lookbackMinutes: number;
    };
    safety: {
        maxRepliesPerContactPer5Min: number;
        requireTagsBeforeBooking: boolean;
    };
    reply: {
        tone: string;
        businessName: string;
        appointmentType: string;
    };
}
/**
 * Load config from disk
 */
declare function loadConfig(): Promise<Config>;
/**
 * Process a single inbound message
 */
declare function processMessage(contactId: string, messageBody: string, messageId: string, configOverride?: Config): Promise<void>;
export { processMessage, loadConfig };
//# sourceMappingURL=listener.d.ts.map