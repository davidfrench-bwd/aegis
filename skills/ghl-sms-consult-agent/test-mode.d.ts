/**
 * Test Mode Filter - Phase 1 Safety Layer
 *
 * CRITICAL: Prevents agent from responding to real leads during testing.
 *
 * When testMode.enabled = true:
 * - ONLY respond to testMode.allowedPhone
 * - Block all other phone numbers
 * - Log blocked attempts
 */
export interface TestModeConfig {
    enabled: boolean;
    allowedPhone: string;
    note?: string;
}
/**
 * Check if contact is allowed in test mode
 *
 * Returns:
 * - { allowed: true } if test mode disabled OR phone matches allowed
 * - { allowed: false, reason } if test mode enabled AND phone doesn't match
 */
export declare function isContactAllowed(contactPhone: string, testModeConfig: TestModeConfig): {
    allowed: boolean;
    reason?: string;
};
/**
 * Get test mode status message (for logging/debugging)
 */
export declare function getTestModeStatus(config: TestModeConfig): string;
//# sourceMappingURL=test-mode.d.ts.map