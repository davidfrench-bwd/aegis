/**
 * Booking Handler - Calendar slot logic and appointment booking
 *
 * APPOINTMENT-AWARE: Checks for existing appointments before offering booking
 */
import type { AppointmentContext } from "./state-machine.js";
export interface TimeSlot {
    start: string;
    end: string;
    available: boolean;
}
/**
 * Get next available slots (formatted for human reading)
 *
 * CRITICAL: NPE calendars = 1-hour slots with up to 5 bookings per slot
 * Must check: currentBookings < slotCapacity (not just "has event")
 */
export declare function getNextAvailableSlots(calendarId: string, count?: number): Promise<string[]>;
/**
 * Book appointment and return confirmation message
 */
export declare function createAppointment(contactId: string, calendarId: string, startTime: string): Promise<{
    success: boolean;
    message: string;
}>;
/**
 * Parse user intent to book from message text
 * Returns ISO timestamp if booking intent detected, null otherwise
 */
export declare function parseBookingIntent(message: string, availableSlots: string[]): string | null;
/**
 * Generate booking offer message with next available slots
 *
 * APPOINTMENT-AWARE: Should only be called after verifying no existing appointment
 */
export declare function generateBookingOffer(calendarId: string, config: any, appointmentContext?: AppointmentContext): Promise<string>;
//# sourceMappingURL=booking-handler.d.ts.map