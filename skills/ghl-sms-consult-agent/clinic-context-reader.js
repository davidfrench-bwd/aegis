import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
export class ClinicContextReader {
    sheets;
    spreadsheetId;
    sheetName;
    constructor() {
        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        if (!serviceAccountJson) {
            throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
        }
        const credentials = JSON.parse(serviceAccountJson);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        this.sheets = google.sheets({ version: 'v4', auth });
        // Load config using ES6 modules
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const configPath = join(__dirname, 'clinic-context-sheet.json');
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        this.spreadsheetId = config.spreadsheetId;
        this.sheetName = config.sheetName;
    }
    /**
     * Get clinic context by Location ID
     * CRITICAL: Always fetch fresh data before each SMS reply
     */
    async getClinicContext(locationId) {
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A2:P`, // A-P: Clinic Name through Last Updated (includes Stats column)
        });
        const rows = response.data.values || [];
        for (const row of rows) {
            const [clinicName, stats, // Column B: Stats (link to analytics sheet) - skipped
            rowLocationId, adAccountId, protocol, quizLink, city, address, timezone, active, testMode, tone, offerName, calendarId, context, lastUpdated,] = row;
            if (rowLocationId === locationId) {
                const contextNotes = context || '';
                const toneValue = (tone || 'empathetic');
                const effectiveCalendarId = calendarId || '';
                return {
                    // Core fields (required by notion-context.ts interface)
                    clinicName: clinicName || '',
                    locationId: rowLocationId,
                    consultCalendarId: effectiveCalendarId,
                    examCalendarId: effectiveCalendarId, // Same for SMS agent
                    timezone: timezone || 'America/Chicago',
                    address: address || '',
                    offerName: offerName || 'complimentary phone consultation',
                    tone: toneValue,
                    quizTag: 'quiz-lead', // Standard tag
                    consultTag: 'consult-booked',
                    examTag: 'exam-booked',
                    ctcTag: 'click-to-call',
                    slotCapacity: 1, // Default for SMS
                    active: active === 'TRUE',
                    testMode: testMode === 'TRUE',
                    notes: contextNotes,
                    // Additional Google Sheets fields
                    adAccountId: adAccountId || '',
                    protocol: protocol || '',
                    quizLink: quizLink || '',
                    city: city || '',
                    calendarId: effectiveCalendarId,
                    context: contextNotes,
                    lastUpdated: lastUpdated || '',
                };
            }
        }
        return null; // Clinic not found
    }
    /**
     * Get all active clinics (for polling multiple locations)
     */
    async getActiveClinics() {
        const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${this.sheetName}!A2:P`,
        });
        const rows = response.data.values || [];
        const activeClinics = [];
        for (const row of rows) {
            const [clinicName, stats, // Column B: Stats (link to analytics sheet) - skipped
            locationId, adAccountId, protocol, quizLink, city, address, timezone, active, testMode, tone, offerName, calendarId, context, lastUpdated,] = row;
            if (active === 'TRUE') {
                const contextNotes = context || '';
                const toneValue = (tone || 'empathetic');
                const effectiveCalendarId = calendarId || '';
                activeClinics.push({
                    // Core fields (required by notion-context.ts interface)
                    clinicName: clinicName || '',
                    locationId,
                    consultCalendarId: effectiveCalendarId,
                    examCalendarId: effectiveCalendarId, // Same for SMS agent
                    timezone: timezone || 'America/Chicago',
                    address: address || '',
                    offerName: offerName || 'complimentary phone consultation',
                    tone: toneValue,
                    quizTag: 'quiz-lead', // Standard tag
                    consultTag: 'consult-booked',
                    examTag: 'exam-booked',
                    ctcTag: 'click-to-call',
                    slotCapacity: 1, // Default for SMS
                    active: true,
                    testMode: testMode === 'TRUE',
                    notes: contextNotes,
                    // Additional Google Sheets fields
                    adAccountId: adAccountId || '',
                    protocol: protocol || '',
                    quizLink: quizLink || '',
                    city: city || '',
                    calendarId: effectiveCalendarId,
                    context: contextNotes,
                    lastUpdated: lastUpdated || '',
                });
            }
        }
        return activeClinics;
    }
}
