
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function inspectHeaders() {
    console.log('--- Inspecting Sheet Headers ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const tabName = '2차차량운행';

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${tabName}!A1:Z5`, // Read first 5 rows, col A to Z
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('No data found.');
            return;
        }

        rows.forEach((row: any[], i: number) => {
            console.log(`[Row ${i + 1}] Length: ${row.length}`);
            row.forEach((cell, idx) => {
                const char = String.fromCharCode(65 + idx); // A, B, C...
                console.log(`  ${char} (${idx}): ${cell}`);
            });
            console.log('---');
        });

    } catch (e: any) {
        console.error('Error fetching sheet:', e.message);
    }
}

inspectHeaders();
