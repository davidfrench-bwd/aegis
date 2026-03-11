/**
 * Reply Engine - Generate contextual replies based on funnel state
 * UPDATED: Now accepts and uses ClinicContext from Notion
 */
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);
/**
 * Generate AI reply using OpenRouter via OpenClaw
 */
async function generateAIReply(prompt, clinicContext, config) {
    // Use OpenClaw's built-in AI via a simple approach
    // For now, use hardcoded model; later can make configurable
    const systemPrompt = buildSystemPrompt(clinicContext, config);
    try {
        // Call OpenRouter directly (OpenClaw pattern)
        const apiKey = process.env.OPENROUTER_API_KEY ||
            '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';
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://openclaw.ai',
                'X-Title': 'GHL SMS Consult Agent'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3.5-sonnet',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 300
            })
        });
        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
    catch (error) {
        console.error('AI generation error:', error);
        return "Thanks for your message! I'll have someone follow up with you shortly.";
    }
}
/**
 * Build system prompt based on clinic context from Notion
 */
function buildSystemPrompt(clinicContext, config) {
    // Use clinic context from Notion, fallback to config
    const businessName = clinicContext.clinicName || config.reply?.businessName || "the clinic";
    const tone = clinicContext.tone || config.reply?.tone || "empathetic";
    const appointmentType = clinicContext.offerName || config.reply?.appointmentType || "Phone Consult";
    const notes = clinicContext.notes || "";
    // Tone-specific instructions
    const toneGuidance = {
        empathetic: "Be warm, understanding, and supportive. Show you care about their pain/concern.",
        direct: "Be clear, efficient, and action-oriented. Get to the point quickly.",
        clinical: "Be professional, factual, and clinical. Use medical terminology appropriately."
    }[tone] || "Be professional and helpful.";
    return `You are an AI SMS assistant for ${businessName}.

YOUR ROLE:
- Respond to leads via text message
- Help qualified leads book ${appointmentType}
- Be ${tone}

TONE GUIDANCE:
${toneGuidance}

${notes ? `CLINIC-SPECIFIC NOTES:\n${notes}\n` : ''}
RULES:
- Keep replies SHORT (1-2 sentences max, SMS-friendly)
- Never use markdown or formatting
- Be conversational and natural
- Ask clarifying questions when needed
- Move toward booking when appropriate
- Don't be pushy, but be direct

IMPORTANT:
- This is SMS, not email. Keep it brief.
- Use plain text only (no links, no formatting)
- Sound human, not robotic`;
}
/**
 * Generate contextual reply based on funnel state
 */
export async function generateReply(context) {
    const { contactContext, clinicContext, stateResult, latestMessage, config } = context;
    const conversationSummary = contactContext.conversationHistory
        ?.slice(-5)
        .map(m => `${m.direction === 'inbound' ? 'Lead' : 'Us'}: ${m.body}`)
        .join('\n') || '';
    const name = contactContext.name || 'there';
    // Build mode-specific prompt
    let modeInstructions = '';
    switch (stateResult.state) {
        case 'ctc':
            modeInstructions = `MODE: CTC (Converted Patient - Support Only)
- This person is already a patient
- Provide helpful support
- Do NOT try to sell or book appointments
- Answer questions warmly`;
            break;
        case 'exam-booked':
            modeInstructions = `MODE: Exam Booked (Logistics Only)
- They have an exam scheduled
- Provide scheduling/logistics help
- Can help reschedule if needed
- Do NOT try to book phone consults`;
            break;
        case 'consult-booked':
            const appointmentSource = contactContext.appointmentContext?.hasConsult
                ? "(VERIFIED: Real appointment exists)"
                : "(Tag-based, not verified)";
            modeInstructions = `MODE: Consult Booked ${appointmentSource}
- They already have a phone consultation scheduled
- Confirm their appointment
- Answer questions about what to expect
- Can help reschedule if needed
- Do NOT ask them to book again
- CRITICAL: Never offer duplicate booking`;
            break;
        case 'booking':
            modeInstructions = `MODE: Booking (Goal: Book Phone Consult)
- This lead does NOT have a consultation booked yet
- Your goal: help them schedule a ${clinicContext.offerName}
- Ask clarifying questions if needed
- Transition naturally toward booking
- CRITICAL: DO NOT offer specific times yourself - the booking system will add those automatically
- If they ask about times/availability, acknowledge their question warmly but DO NOT make up times
- Be helpful, not pushy`;
            break;
    }
    const prompt = `${modeInstructions}

CONTACT INFO:
Name: ${name}
Tags: ${contactContext.tags.join(', ') || 'None'}

RECENT CONVERSATION:
${conversationSummary}

LATEST MESSAGE FROM LEAD:
"${latestMessage}"

Generate an appropriate SMS reply (1-2 sentences, plain text only).`;
    return await generateAIReply(prompt, clinicContext, config);
}
/**
 * Check if reply should include booking offer
 *
 * NPE Psychology: Offer booking when:
 * - Explicit intent (keywords)
 * - 2+ engaged replies (emotional pain, questions)
 * - NOT just reactive chatbot behavior
 */
export function shouldOfferBooking(context) {
    if (context.stateResult.state !== 'booking' || !context.stateResult.allowBooking) {
        return false;
    }
    const message = context.latestMessage.toLowerCase();
    const conversationHistory = context.contactContext.conversationHistory || [];
    // Count inbound (lead) messages
    const leadMessageCount = conversationHistory.filter(m => m.direction === 'inbound').length;
    // 1. Explicit booking keywords
    const bookingKeywords = [
        'schedule', 'book', 'appointment', 'when can', 'call me',
        'next step', 'how do i', 'sign up', 'get started',
        'available', 'times', 'openings', 'slots', 'what time'
    ];
    if (bookingKeywords.some(kw => message.includes(kw))) {
        return true;
    }
    // 2. Emotional pain signals
    const painSignals = [
        'pain', 'hurt', 'can\'t', 'tired', 'frustrated', 'desperate',
        'help', 'relief', 'suffering', 'worse', 'not sure'
    ];
    const hasPainSignal = painSignals.some(signal => message.includes(signal));
    // 3. NPE Rule: 2+ engaged replies → guide to consult
    if (leadMessageCount >= 2 && hasPainSignal) {
        return true;
    }
    // 4. Multiple questions (engagement signal)
    if (leadMessageCount >= 3) {
        return true;
    }
    return false;
}
