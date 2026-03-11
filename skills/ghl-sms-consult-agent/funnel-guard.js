/**
 * Funnel Guardrail - Validate state before every send
 *
 * Critical: Prevents sending wrong message type after tag changes
 * (e.g., GHL automation adds exam-booked mid-conversation)
 */
import { loadContactContext } from "./context-loader.js";
import { determineFunnelState, FunnelState } from "./state-machine.js";
/**
 * Pre-send validation: Reload tags, re-check state, validate behavior
 *
 * This is the LAST check before any SMS is sent.
 * Catches mid-conversation tag changes from GHL automations.
 */
export async function validateBeforeSend(contactId, intendedBehavior, config) {
    try {
        // Fresh reload from GHL (don't trust cached state)
        console.log("🛡️  Funnel guardrail: reloading contact state...");
        const { contactContext: freshContext, clinicContext } = await loadContactContext(contactId, config);
        // Re-run state machine with fresh tags
        const freshState = determineFunnelState(freshContext, config);
        console.log(`   Fresh state: ${freshState.state} (${freshState.reason})`);
        // Validate behavior matches current state
        const validation = validateBehavior(freshState.state, intendedBehavior);
        if (!validation.allowed) {
            console.warn(`⚠️  Funnel guardrail BLOCKED: ${validation.reason}`);
            return {
                allowed: false,
                reason: validation.reason,
                freshState,
            };
        }
        console.log("✅ Funnel guardrail: allowed");
        return {
            allowed: true,
            freshState,
        };
    }
    catch (error) {
        // On error, fail safe: block the send
        console.error("❌ Funnel guardrail error:", error.message);
        return {
            allowed: false,
            reason: `Guardrail check failed: ${error.message}`,
        };
    }
}
/**
 * Validate that intended behavior matches funnel state
 */
function validateBehavior(state, behavior) {
    // Define allowed behaviors per state
    const rules = {
        [FunnelState.CTC]: ["support"],
        [FunnelState.EXAM_BOOKED]: ["logistics", "support"],
        [FunnelState.CONSULT_BOOKED]: ["confirm", "logistics", "support"],
        [FunnelState.BOOKING]: ["booking", "support"],
    };
    const allowed = rules[state];
    if (!allowed.includes(behavior)) {
        return {
            allowed: false,
            reason: `Behavior "${behavior}" not allowed in state "${state}" (allowed: ${allowed.join(", ")})`,
        };
    }
    return { allowed: true };
}
/**
 * Classify intended behavior from reply content
 * (Used to detect what the AI is about to do)
 */
export function classifyReplyBehavior(replyText) {
    const lower = replyText.toLowerCase();
    // Booking language
    if (lower.includes("schedule") ||
        lower.includes("book") ||
        lower.includes("available") ||
        lower.includes("appointment") ||
        lower.includes("consult") ||
        lower.includes("call you")) {
        return "booking";
    }
    // Confirmation language
    if (lower.includes("you're scheduled") ||
        lower.includes("confirmed") ||
        lower.includes("your appointment")) {
        return "confirm";
    }
    // Logistics language
    if (lower.includes("reschedule") ||
        lower.includes("change your time") ||
        lower.includes("when is")) {
        return "logistics";
    }
    // Default: support
    return "support";
}
