
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function verifySheetSimple() {
    console.log('--- Simple Sheet Dump (Rows 50-60) ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Dump a chunk where we expect data
    const range = '2차차량운행!A50:H60';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    if (!rows) { console.log('No rows found in A50:H60'); return; }

    rows.forEach((row, i) => {
        console.log(`[Row ${50 + i}] ${row.join(' | ')}`);
    });
}

verifySheetSimple();
