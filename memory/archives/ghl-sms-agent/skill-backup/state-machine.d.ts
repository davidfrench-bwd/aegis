/**
 * State Machine - Determine funnel state from contact tags + appointments
 */
export declare enum FunnelState {
    CTC = "ctc",
    EXAM_BOOKED = "exam-booked",
    CONSULT_BOOKED = "consult-booked",
    BOOKING = "booking"
}
export interface AppointmentContext {
    hasConsult: boolean;
    hasExam: boolean;
    nextAppointmentTime: string | null;
    appointmentStatus: "none" | "consult" | "exam";
}
export interface ContactContext {
    contactId: string;
    name?: string;
    phone: string;
    tags: string[];
    hasAppointment: boolean;
    appointmentContext?: AppointmentContext;
    conversationHistory?: Array<{
        direction: string;
        body: string;
        timestamp: string;
    }>;
}
export interface StateResult {
    state: FunnelState;
    reason: string;
    allowBooking: boolean;
    allowReschedule: boolean;
}
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
export declare function determineFunnelState(context: ContactContext, config: any): StateResult;
/**
 * Validate if a booking action is allowed
 */
export declare function canBook(stateResult: StateResult): boolean;
/**
 * Validate if a reschedule action is allowed
 */
export declare function canReschedule(stateResult: StateResult): boolean;
//# sourceMappingURL=state-machine.d.ts.map