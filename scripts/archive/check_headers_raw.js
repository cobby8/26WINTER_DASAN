
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^"|"$/g, '').replace(/\\n/g, '\n');
        env[key] = value;
    }
});

async function checkHeaders() {
    console.log('--- Checking Sheet Headers ---');
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
            range: 'A2:AZ2', // Assume Row 2 because of previous check or Row 1
        });

        console.log('Row 2 Headers:', res.data.values ? res.data.values[0] : 'None');

        const res1 = await sheets.spreadsheets.values.get({
            spreadsheetId: env.GOOGLE_SHEET_ID,
            range: 'A1:AZ1',
        });
        console.log('Row 1 Headers:', res1.data.values ? res1.data.values[0] : 'None');

    } catch (e) {
        console.error('Error:', e.message);
    }
}

checkHeaders();
