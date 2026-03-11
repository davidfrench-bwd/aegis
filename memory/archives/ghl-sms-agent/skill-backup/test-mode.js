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
/**
 * Normalize phone number for comparison
 * Removes +1, spaces, dashes, parentheses
 */
function normalizePhone(phone) {
    return phone
        .replace(/^\+1/, '')
        .replace(/[\s\-()]/g, '')
        .trim();
}
/**
 * Check if contact is allowed in test mode
 *
 * Returns:
 * - { allowed: true } if test mode disabled OR phone matches allowed
 * - { allowed: false, reason } if test mode enabled AND phone doesn't match
 */
export function isContactAllowed(contactPhone, testModeConfig) {
    // Test mode disabled → allow all
    if (!testModeConfig.enabled) {
        return { allowed: true };
    }
    // Test mode enabled → check phone
    const normalizedContact = normalizePhone(contactPhone);
    const normalizedAllowed = normalizePhone(testModeConfig.allowedPhone);
    if (normalizedContact === normalizedAllowed) {
        console.log(`✅ Test mode: Contact allowed (${contactPhone})`);
        return { allowed: true };
    }
    // Block: not the allowed test number
    const reason = `Test mode enabled: Only ${testModeConfig.allowedPhone} allowed. Blocked: ${contactPhone}`;
    console.log(`🚫 ${reason}`);
    return {
        allowed: false,
        reason,
    };
}
/**
 * Get test mode status message (for logging/debugging)
 */
export function getTestModeStatus(config) {
    if (!config.enabled) {
        return "Test mode: DISABLED (responding to all contacts)";
    }
    return `Test mode: ENABLED (only responding to ${config.allowedPhone})`;
}
