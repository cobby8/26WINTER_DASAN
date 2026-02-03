
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function inspectSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = '1SSBv_yY22Mr5y8W5z2J0NvxC0keZcQRIRkHmtAVaqrw';

    try {
        const meta = await sheets.spreadsheets.get({
            spreadsheetId: sheetId
        });

        console.log("📑 Found Sheets:");
        if (!meta.data.sheets || meta.data.sheets.length === 0) {
            console.log("No sheets found.");
            return;
        }

        meta.data.sheets.forEach(s => {
            console.log(` - [${s.properties?.title}] (ID: ${s.properties?.sheetId})`);
        });

        const fs = require('fs');
        try {
            const sheetName = '26겨울방학특강2차';
            console.log(`\n🔍 Fetching '${sheetName}'...`);

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${sheetName}!A1:AZ2000`,
            });

            const rows = response.data.values || [];
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

            // Find Students
            const targets = ['박준수', '박준서'];
            const results: any[] = [];

            const dataRows = rows.slice(headerRowIdx + 1);
            dataRows.forEach((row, rIdx) => {
                const rowStr = row.join(' ');
                if (targets.some(t => rowStr.includes(t))) {
                    const obj: any = {};
                    headers.forEach((h, i) => {
                        if (row[i]) obj[h] = row[i];
                    });
                    results.push(obj);
                }
            });

            console.log(`Found ${results.length} rows.`);
            fs.writeFileSync('sheet_dump.json', JSON.stringify(results, null, 2));
            console.log('Saved to sheet_dump.json');

        } catch (error) {
            console.error("Error fetching sheet:", error);
        }

    } catch (error) {
        console.error("Error fetching sheet metadata:", error);
    }
}

inspectSheets();
