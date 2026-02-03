
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkShuttle() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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
    // Find header row with '이름'
    const headerRow = rows.find(r => r.some(c => c.includes('이름')));

    if (headerRow) {
        const shuttleCols = headerRow.filter(h => h.includes('셔틀') || h.includes('차량'));
        console.log('Shuttle Related Headers:', shuttleCols);
    } else {
        console.log('Header row not found');
    }
}

checkShuttle();
