
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
        env[key] = value.replace(/\\n/g, '\n');
    }
});

async function listTabs() {
    console.log('--- Listing Google Sheet Tabs ---');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: env.GOOGLE_PRIVATE_KEY,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        const ss = await sheets.spreadsheets.get({
            spreadsheetId: env.GOOGLE_SHEET_ID,
        });

        console.log('Tabs found:');
        ss.data.sheets.forEach(s => {
            console.log(`- ${s.properties.title}`);
        });

        // Check first 3 tabs for headers
        for (const sheet of ss.data.sheets.slice(0, 3)) {
            const title = sheet.properties.title;
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: env.GOOGLE_SHEET_ID,
                range: `${title}!A1:E2`,
            });
            console.log(`\n[${title}] Top Rows:`);
            console.log(res.data.values);
        }

    } catch (e) {
        console.error('Error:', e.message);
    }
}

listTabs();
