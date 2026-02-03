
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkShuttleValues() {
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
        range: `${sheetName}!A1:AZ200`,
    });

    const rows = response.data.values;
    const headerRowIdx = rows.findIndex(r => r.some(c => c && c.includes('이름')));
    const headerRow = rows[headerRowIdx];
    const shuttleIdx = headerRow.findIndex(h => h.includes('셔틀탑승 여부'));

    if (shuttleIdx === -1) {
        console.log('Column not found');
        return;
    }

    const values = rows.slice(headerRowIdx + 1).map(r => r[shuttleIdx]).filter(v => v);
    const unique = [...new Set(values)];
    console.log('Unique Shuttle Values:', unique);
}

checkShuttleValues();
