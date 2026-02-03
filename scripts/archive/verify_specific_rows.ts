
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function verifySpecificRows() {
    console.log('--- Verifying Shuttle Sheet Data for Specific Students ---');
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.GOOGLE_SHEET_ID;

    // Fetch all rows to search
    const range = '2차차량운행!A:H';
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
    });

    const rows = response.data.values;
    if (!rows) { console.log('No rows'); return; }

    const targets = ['권오현', '조해원', '신민주'];
    console.log(`Searching for: ${targets.join(', ')}`);

    rows.forEach((row, i) => {
        const name = row[0]; // Col A
        if (targets.some(t => name && name.includes(t))) {
            console.log(`\n[Row ${i + 1}] Found ${name}`);
            console.log(`  Day (D): ${row[3]}`);
            console.log(`  Time (F): ${row[5]}`);
            console.log(`  Dest (G): ${row[6]}`);
            console.log(`  Type (H): ${row[7]}`);
        }
    });
}

verifySpecificRows();
