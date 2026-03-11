/**
 * Booking Handler - Calendar slot logic and appointment booking
 *
 * APPOINTMENT-AWARE: Checks for existing appointments before offering booking
 */
import { getCalendarSlots, bookAppointment } from "./context-loader.js";
/**
 * Get next available slots (formatted for human reading)
 *
 * CRITICAL: NPE calendars = 1-hour slots with up to 5 bookings per slot
 * Must check: currentBookings < slotCapacity (not just "has event")
 */
export async function getNextAvailableSlots(calendarId, count = 3) {
    try {
        const slotsData = await getCalendarSlots(calendarId);
        // GHL returns slots in various formats; parse accordingly
        const slots = slotsData.slots || [];
        return slots
            .filter((slot) => {
            // IMPORTANT: Check capacity, not just availability boolean
            if (slot.available === false)
                return false;
            // If slot has capacity info, check it
            if (slot.currentBookings !== undefined && slot.maxCapacity !== undefined) {
                return slot.currentBookings < slot.maxCapacity;
            }
            // If slot has count info (alternative GHL format)
            if (slot.bookingCount !== undefined && slot.capacity !== undefined) {
                return slot.bookingCount < slot.capacity;
            }
            // Fallback: trust the available flag
            return slot.available !== false;
        })
            .slice(0, count)
            .map((slot) => formatSlotForSMS(slot.startTime || slot.start));
    }
    catch (error) {
        console.error('Failed to get calendar slots:', error);
        return [];
    }
}
/**
 * Format ISO timestamp as human-friendly SMS text
 * Example: "Tomorrow at 2:00 PM" or "Mon Feb 14 at 10:00 AM"
 */
function formatSlotForSMS(isoTimestamp) {
    const date = new Date(isoTimestamp);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
    // Check if today
    if (date.toDateString() === now.toDateString()) {
        return `Today at ${timeStr}`;
    }
    // Check if tomorrow
    if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow at ${timeStr}`;
    }
    // Otherwise: "Mon Feb 14 at 10:00 AM"
    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
    return `${dateStr} at ${timeStr}`;
}
/**
 * Book appointment and return confirmation message
 */
export async function createAppointment(contactId, calendarId, startTime) {
    try {
        const result = await bookAppointment(contactId, calendarId, startTime);
        const timeFormatted = formatSlotForSMS(startTime);
        return {
            success: true,
            message: `Great! I've booked your phone consultation for ${timeFormatted}. You'll receive a confirmation shortly.`,
        };
    }
    catch (error) {
        console.error('Booking failed:', error);
        return {
            success: false,
            message: "I'm having trouble booking that time. Let me have someone call you to schedule.",
        };
    }
}
/**
 * Parse user intent to book from message text
 * Returns ISO timestamp if booking intent detected, null otherwise
 */
export function parseBookingIntent(message, availableSlots) {
    const lowerMessage = message.toLowerCase();
    // Check for confirmation words + time
    const confirmationWords = ['yes', 'ok', 'sure', 'sounds good', 'perfect', 'great', 'let\'s do', 'book', 'schedule'];
    const hasConfirmation = confirmationWords.some(word => lowerMessage.includes(word));
    if (!hasConfirmation) {
        return null;
    }
    // Extract time patterns from message
    // Patterns: "3:30", "3pm", "3:00 pm", "330", "3:30pm"
    const timePatterns = [
        /(\d{1,2}):(\d{2})\s*(am|pm)?/i, // 3:30pm, 3:30 PM, 3:30
        /(\d{1,2})\s*(am|pm)/i, // 3pm, 3 PM
        /(\d{3,4})/, // 330, 1530 (military-ish)
    ];
    for (const pattern of timePatterns) {
        const match = message.match(pattern);
        if (match) {
            // Try to match against available slots
            const timeStr = match[0].toLowerCase().replace(/\s+/g, '');
            for (const slot of availableSlots) {
                const slotDate = new Date(slot);
                const slotTime = slotDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }).toLowerCase().replace(/\s+/g, '');
                // Fuzzy match
                if (slotTime.includes(timeStr) || timeStr.includes(slotTime.replace(':00', ''))) {
                    return slot;
                }
            }
        }
    }
    return null;
}
/**
 * Generate booking offer message with next available slots
 *
 * APPOINTMENT-AWARE: Should only be called after verifying no existing appointment
 */
export async function generateBookingOffer(calendarId, config, appointmentContext) {
    // SAFETY CHECK: Do not offer booking if appointment already exists
    if (appointmentContext?.hasConsult) {
        console.error("⚠️  Booking offer blocked - consult appointment already exists");
        return "You already have a consultation scheduled! Let me know if you need to reschedule.";
    }
    if (appointmentContext?.hasExam) {
        console.error("⚠️  Booking offer blocked - exam appointment already exists");
        return "You already have an exam scheduled! Your consultation is complete. Let me know if you have questions.";
    }
    const slots = await getNextAvailableSlots(calendarId, 3);
    if (slots.length === 0) {
        return "I'd love to help you schedule a consultation. Let me have someone reach out to find a time that works for you.";
    }
    const slotList = slots.join(', ');
    return `I can help you schedule a phone consultation. I have availability: ${slotList}. Which works best for you?`;
}
