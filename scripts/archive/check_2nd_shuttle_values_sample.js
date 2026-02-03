
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkValues() {
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
        range: `${sheetName}!A3:M10`, // Read data rows
    });

    const rows = response.data.values;
    if (!rows) return;

    rows.forEach((r, i) => {
        console.log(`Row ${i + 3}:`);
        console.log('  Name (0):', r[0]);
        console.log('  Day (7):', r[7]);
        console.log('  Time (9):', r[9]);
        console.log('  Loc (10):', r[10]);
        console.log('  Type (11):', r[11]);
    });
}

checkValues();
