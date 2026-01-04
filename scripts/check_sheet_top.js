
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        env[key] = value.replace(/"/g, '').replace(/\\n/g, '\n');
    }
});

async function checkSheetStructure() {
    console.log('--- Checking Primary Sync Sheet Structure ---');

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: env.GOOGLE_PRIVATE_KEY,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: env.GOOGLE_SHEET_ID,
            range: 'A1:H10', // Just first few rows
        });

        const rows = res.data.values;
        if (!rows) {
            console.log('No data.');
            return;
        }

        console.log('--- Top 5 Rows ---');
        rows.slice(0, 5).forEach((row, i) => {
            console.log(`Row ${i + 1}:`, row.join(' | '));
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkSheetStructure();
