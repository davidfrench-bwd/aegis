/**
 * Reply Engine - Generate contextual replies based on funnel state
 * UPDATED: Now accepts and uses ClinicContext from Notion
 */
import type { ContactContext } from "./state-machine.js";
import type { StateResult } from "./state-machine.js";
import type { ClinicContext } from "../ghl-data/dist/notion-context.js";
interface ReplyContext {
    contactContext: ContactContext;
    clinicContext: ClinicContext;
    stateResult: StateResult;
    latestMessage: string;
    config: any;
}
/**
 * Generate contextual reply based on funnel state
 */
export declare function generateReply(context: ReplyContext): Promise<string>;
/**
 * Check if reply should include booking offer
 *
 * NPE Psychology: Offer booking when:
 * - Explicit intent (keywords)
 * - 2+ engaged replies (emotional pain, questions)
 * - NOT just reactive chatbot behavior
 */
export declare function shouldOfferBooking(context: ReplyContext): boolean;
export {};
//# sourceMappingURL=reply-engine.d.ts.map