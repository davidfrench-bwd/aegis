/**
 * State Machine - Determine funnel state from contact tags + appointments
 */
export var FunnelState;
(function (FunnelState) {
    FunnelState["CTC"] = "ctc";
    FunnelState["EXAM_BOOKED"] = "exam-booked";
    FunnelState["CONSULT_BOOKED"] = "consult-booked";
    FunnelState["BOOKING"] = "booking";
})(FunnelState || (FunnelState = {}));
/**
 * Determine funnel state - APPOINTMENT-AWARE VERSION
 *
 * NEW Priority order (appointments first, tags second):
 * 1. CTC tag → CTC Mode (support only, never book)
 * 2. Appointment exists on EXAM calendar → Exam Booked Mode
 * 3. Appointment exists on CONSULT calendar → Consult Booked Mode
 * 4. Quiz Lead tag (and no appointments) → Booking Mode
 * 5. Default → Passive/Handoff
 *
 * Tags are now FALLBACK when appointment data is unavailable.
 */
export function determineFunnelState(context, config) {
    const { tags, appointmentContext } = context;
    const tagConfig = config.tags;
    // Log state resolution for debugging
    console.error("STATE_RESOLVED:", JSON.stringify({
        contactId: context.contactId,
        tags,
        appointmentStatus: appointmentContext?.appointmentStatus || "unknown",
        hasConsult: appointmentContext?.hasConsult || false,
        hasExam: appointmentContext?.hasExam || false,
    }));
    // Priority 1: CTC (converted patient - support only, never book)
    if (tags.includes(tagConfig.ctc)) {
        return {
            state: FunnelState.CTC,
            reason: "Contact has CTC tag (converted patient)",
            allowBooking: false,
            allowReschedule: false,
        };
    }
    // Priority 2: EXAM APPOINTMENT EXISTS (primary source of truth)
    if (appointmentContext?.hasExam) {
        return {
            state: FunnelState.EXAM_BOOKED,
            reason: "Appointment exists on exam calendar",
            allowBooking: false,
            allowReschedule: true,
        };
    }
    // Priority 2b: Exam tag (fallback when appointment data unavailable)
    if (tags.includes(tagConfig.examBooked)) {
        return {
            state: FunnelState.EXAM_BOOKED,
            reason: "Contact has exam-booked tag (appointment not verified)",
            allowBooking: false,
            allowReschedule: true,
        };
    }
    // Priority 3: CONSULT APPOINTMENT EXISTS (primary source of truth)
    if (appointmentContext?.hasConsult) {
        return {
            state: FunnelState.CONSULT_BOOKED,
            reason: "Appointment exists on consult calendar",
            allowBooking: false, // Prevent duplicate bookings
            allowReschedule: true,
        };
    }
    // Priority 3b: Consult tag (fallback when appointment data unavailable)
    if (tags.includes(tagConfig.consultBooked)) {
        return {
            state: FunnelState.CONSULT_BOOKED,
            reason: "Contact has consult-booked tag (appointment not verified)",
            allowBooking: false, // Still prevent double-booking
            allowReschedule: true,
        };
    }
    // Priority 4: LEAD_NEEDS_CONSULT (quiz lead with no appointments)
    if (tags.includes(tagConfig.quizLead)) {
        return {
            state: FunnelState.BOOKING,
            reason: "Quiz lead with no active appointments - needs booking",
            allowBooking: true,
            allowReschedule: false,
        };
    }
    // Priority 5: PASSIVE (no clear funnel signal - handoff to human)
    return {
        state: FunnelState.BOOKING,
        reason: "Default state (no blocking tags or appointments) - passive mode",
        allowBooking: false, // Don't proactively offer if not quiz-lead
        allowReschedule: false,
    };
}
/**
 * Validate if a booking action is allowed
 */
export function canBook(stateResult) {
    return stateResult.allowBooking;
}
/**
 * Validate if a reschedule action is allowed
 */
export function canReschedule(stateResult) {
    return stateResult.allowReschedule;
}
