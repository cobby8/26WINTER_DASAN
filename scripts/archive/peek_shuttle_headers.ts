
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function peekSheet() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = '2차차량운행';

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:Z3`, // Just 3 rows
        });

        const rows = response.data.values;
        if (!rows) { console.log('No rows'); return; }

        console.log('--- HEADERS ---');
        console.log(JSON.stringify(rows[0]));
        console.log('--- ROW 1 ---');
        console.log(JSON.stringify(rows[1]));

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

peekSheet();
