
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

async function listRows() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: '1차차량운행!A1:AZ200',
        });
        const rows = res.data.values;
        if (rows) {
            rows.forEach((row, i) => {
                if (row.some(c => c && String(c).includes('이도경'))) {
                    console.log(`FOUND_ROW_${i + 1}:` + JSON.stringify(row));
                }
            });
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listRows();
