
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkColumns() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: '2차차량운행!A1:N2', // A to N covers J(10), K(11)
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) { console.log('No data'); return; }

        console.log('--- Headers (Row 1) ---');
        // J is index 9, K is index 10
        const jVal = rows[0][9] || 'EMPTY';
        const kVal = rows[0][10] || 'EMPTY';
        console.log(`[Col J / Index 9] Header: ${jVal}`);
        console.log(`[Col K / Index 10] Header: ${kVal}`);
        console.log('Full Headers:', JSON.stringify(rows[0]));

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

checkColumns();
