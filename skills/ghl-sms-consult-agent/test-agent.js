#!/usr/bin/env node
/**
 * Test Script for GHL SMS Consult Agent
 * 
 * Usage:
 *   node test-agent.js <contactId> "<message>"
 * 
 * Example:
 *   node test-agent.js abc123 "I need help with my neuropathy"
 */

import { processMessage } from "./listener.js";

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error("Usage: node test-agent.js <contactId> \"<message>\"");
  console.error("Example: node test-agent.js abc123 \"I need help\"");
  process.exit(1);
}

const contactId = args[0];
const message = args[1];
const messageId = `test-${Date.now()}`;

console.log("🧪 Testing GHL SMS Consult Agent");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Contact ID: ${contactId}`);
console.log(`Message: "${message}"`);
console.log(`Message ID: ${messageId}`);
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

try {
  await processMessage(contactId, message, messageId);
  console.log("\n✅ Test completed");
} catch (error) {
  console.error("\n❌ Test failed:", error.message);
  process.exit(1);
}
