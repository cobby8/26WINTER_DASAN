
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkShuttleHeaders() {
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

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:M2`, // Just 2 rows
    });

    const rows = response.data.values;
    if (!rows) return;

    console.log('--- Shuttle Headers ---');
    rows.forEach((row, i) => {
        console.log(`Row ${i + 1}:`);
        row.forEach((col, idx) => console.log(`  Col ${idx}: ${col}`));
    });
}

checkShuttleHeaders();
