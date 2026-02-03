
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkStructure() {
    console.log('--- Structure Check ---');
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

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:Z3`, // Row 1-3
    });

    const rows = response.data.values;
    if (!rows) return;

    console.log('=== ROW 1 (Headers?) ===');
    rows[0].forEach((c, i) => console.log(`Col ${i}: ${c}`));

    if (rows.length > 1) {
        console.log('=== ROW 2 (Data?) ===');
        rows[1].forEach((c, i) => console.log(`Col ${i}: ${c}`));
    }
}

checkStructure();
