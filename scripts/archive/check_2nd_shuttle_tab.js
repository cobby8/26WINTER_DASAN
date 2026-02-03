
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkShuttleTab() {
    console.log('--- Checking 2차차량운행 Headers ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = '2차차량운행';

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: `${sheetName}!A1:Z5`,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) return;

        // Dump first 5 rows to see structure
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
            const r = rows[i];
            console.log(`--- Row ${i + 1} ---`);
            console.log('  (0-9):', JSON.stringify(r.slice(0, 10)));
            console.log('  (10-19):', JSON.stringify(r.slice(10, 20)));
        }

    } catch (e) {
        console.error('Error fetching sheet:', e.message);
    }
}

checkShuttleTab();
