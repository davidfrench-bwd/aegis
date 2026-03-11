/**
 * Safety Filter - Prevent double-booking, rate limiting, validation
 */
/**
 * Load agent state from disk
 */
export declare function loadState(): Promise<void>;
/**
 * Save agent state to disk
 */
export declare function saveState(): Promise<void>;
/**
 * Check if message has already been processed
 */
export declare function isMessageProcessed(messageId: string): boolean;
/**
 * Mark message as processed
 */
export declare function markMessageProcessed(messageId: string): void;
/**
 * Check if contact can receive a reply (rate limiting)
 * Max 1 reply per contact per 5 minutes
 */
export declare function canReply(contactId: string, config: any): {
    allowed: boolean;
    reason?: string;
};
/**
 * Record that a reply was sent
 */
export declare function recordReply(contactId: string): void;
/**
 * Check if contact already has a booking recorded
 */
export declare function hasExistingBooking(contactId: string): boolean;
/**
 * Record a new booking
 */
export declare function recordBooking(contactId: string, appointmentId: string): void;
/**
 * Validate that booking is safe (no double-booking)
 */
export declare function validateBooking(contactId: string, hasAppointment: boolean): {
    safe: boolean;
    reason?: string;
};
/**
 * Initialize safety filter (load state)
 */
export declare function initialize(): Promise<void>;
/**
 * Cleanup: save state before exit
 */
export declare function cleanup(): Promise<void>;
//# sourceMappingURL=safety-filter.d.ts.map