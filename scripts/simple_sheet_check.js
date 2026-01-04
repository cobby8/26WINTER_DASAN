
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

async function listRows() {
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY),
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: '1차차량운행!A1:Z150',
        });
        const rows = res.data.values;
        if (rows) {
            const foundHeaders = rows[1]; // Typically row 2 is headers in this sheet structure
            console.log('--- Headers ---');
            console.log(foundHeaders);

            console.log('\n--- 이도경 Rows ---');
            rows.forEach((row, i) => {
                if (row.some(c => c && String(c).includes('이도경'))) {
                    console.log(`[Row ${i + 1}]`, JSON.stringify(row));
                }
            });
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listRows();
