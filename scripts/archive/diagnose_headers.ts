
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function diagnose() {
    console.log('--- Diagnosing Headers ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = '26겨울방학특강2차';

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:AZ5`,
    });

    const rows = response.data.values;
    if (!rows) {
        console.log('No rows found.');
        return;
    }

    const output = rows.map((row, i) => `Row ${i + 1}: ${row.join(' | ')}`).join('\n');
    fs.writeFileSync('headers_debug.txt', output, 'utf8');
    console.log('Written to headers_debug.txt');
}

diagnose();
