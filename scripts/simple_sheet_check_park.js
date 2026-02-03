
const { google } = require('googleapis');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Use absolute path for env
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const SHEET_ID = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';
const SHEET_NAME = '26겨울방학특강2차';

async function listRows() {
    console.log('--- Start Inspection ---');
    try {
        let creds;
        if (process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY) {
            creds = JSON.parse(process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY);
        } else {
            // Fallback to individual vars if JSON not in env (legacy support)
            creds = {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            };
        }

        const auth = new google.auth.GoogleAuth({
            credentials: creds,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });

        const sheets = google.sheets({ version: 'v4', auth });
        console.log(`Fetching ${SHEET_NAME}...`);

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: SHEET_ID,
            range: `${SHEET_NAME}!A1:AZ2000`,
        });

        const rows = res.data.values;
        if (rows) {
            // Find Header
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(rows.length, 10); i++) {
                const row = rows[i];
                if (row.some(c => c && (c.includes('이름') || c.includes('성명') || c.includes('수강생')))) {
                    headerRowIdx = i;
                    break;
                }
            }
            const headers = rows[headerRowIdx];
            console.log('Headers:', headers);

            const results = [];
            const targets = ['박준수', '박준서'];

            rows.slice(headerRowIdx + 1).forEach((row, i) => {
                const rowStr = row.join(' ');
                if (targets.some(t => rowStr.includes(t))) {
                    console.log(`[Found Row ${i + headerRowIdx + 2}] For ${targets.find(t => rowStr.includes(t))}`);
                    const obj = {};
                    headers.forEach((h, idx) => {
                        obj[h] = row[idx];
                    });
                    results.push(obj);
                }
            });

            console.log('--- Results JSON ---');
            console.log(JSON.stringify(results, null, 2));
            fs.writeFileSync('park_sheet_dump.json', JSON.stringify(results, null, 2));
            console.log('Saved to park_sheet_dump.json');
        } else {
            console.log('No rows found.');
        }
    } catch (err) {
        console.error('Error:', err.message);
    }
}

listRows();
