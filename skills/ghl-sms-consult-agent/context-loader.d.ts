/**
 * Context Loader - Load contact data from GHL via ghl-data services
 *
 * Uses MCP through ghl-data layer (not direct mcporter calls)
 */
import { type ClinicContext } from "../ghl-data/dist/notion-context.js";
import type { ContactContext } from "./state-machine.js";
export interface AppointmentContext {
    hasConsult: boolean;
    hasExam: boolean;
    nextAppointmentTime: string | null;
    appointmentStatus: "none" | "consult" | "exam";
}
/**
 * Load appointment context for a contact
 * PRIMARY SOURCE OF TRUTH for funnel state
 */
export declare function loadAppointmentContext(contactId: string): Promise<AppointmentContext>;
/**
 * Load full contact context from GHL via ghl-data services
 * UPDATED: Now loads clinic context + appointments BEFORE tags
 */
export declare function loadContactContext(contactId: string, config: any, locationId?: string): Promise<{
    contactContext: ContactContext;
    clinicContext: ClinicContext;
}>;
/**
 * Get calendar availability for booking via ghl-data
 */
export declare function getCalendarSlots(calendarId: string, startDate?: string, endDate?: string): Promise<any>;
/**
 * Book an appointment via ghl-data
 */
export declare function bookAppointment(contactId: string, calendarId: string, startTime: string): Promise<any>;
/**
 * Send SMS reply via ghl-data
 */
export declare function sendSMS(contactId: string, message: string): Promise<any>;
/**
 * Add tag to contact via ghl-data
 */
export declare function addTag(contactId: string, tagList: string[]): Promise<any>;
//# sourceMappingURL=context-loader.d.ts.map