/**
 * Funnel Guardrail - Validate state before every send
 *
 * Critical: Prevents sending wrong message type after tag changes
 * (e.g., GHL automation adds exam-booked mid-conversation)
 */
import type { StateResult } from "./state-machine.js";
export interface GuardrailResult {
    allowed: boolean;
    reason?: string;
    freshState?: StateResult;
}
/**
 * Pre-send validation: Reload tags, re-check state, validate behavior
 *
 * This is the LAST check before any SMS is sent.
 * Catches mid-conversation tag changes from GHL automations.
 */
export declare function validateBeforeSend(contactId: string, intendedBehavior: "booking" | "support" | "logistics" | "confirm", config: any): Promise<GuardrailResult>;
/**
 * Classify intended behavior from reply content
 * (Used to detect what the AI is about to do)
 */
export declare function classifyReplyBehavior(replyText: string): "booking" | "support" | "logistics" | "confirm";
//# sourceMappingURL=funnel-guard.d.ts.map