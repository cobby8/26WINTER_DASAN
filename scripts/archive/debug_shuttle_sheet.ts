
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function debugSheet() {
    console.log('--- Debugging Shuttle Sheet Rows ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Read a chunk of rows to spot check
    const range = '2차차량운행!A1:M15';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    if (!rows) { console.log('No rows'); return; }

    // Print Headers (Row 1)
    console.log('[Row 1 (Headers)]');
    rows[0].forEach((val, i) => console.log(`  ${String.fromCharCode(65 + i)} (${i}): ${val}`));

    // Print Row 2 (Data 1)
    console.log('[Row 2]');
    rows[1].forEach((val, i) => console.log(`  ${String.fromCharCode(65 + i)} (${i}): ${val}`));

    // Print Row 5
    if (rows.length > 4) {
        console.log('[Row 5]');
        rows[4].forEach((val, i) => console.log(`  ${String.fromCharCode(65 + i)} (${i}): ${val}`));
    }
}

debugSheet();
