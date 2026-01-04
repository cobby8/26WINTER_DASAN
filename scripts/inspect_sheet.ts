
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

        // HEADERS DUMP
        const firstSheetName = meta.data.sheets[0].properties?.title;
        if (firstSheetName) {
            console.log(`\n🔍 Inspecting Headers of '${firstSheetName}'...`);
            const rows = await sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: `${firstSheetName}!A1:Z5`, // Get first 5 rows to see structure
            });

            console.log("Headers (Row 1):", JSON.stringify(rows.data.values?.[0], null, 2));
            console.log("Sample Data (Row 2):", JSON.stringify(rows.data.values?.[1], null, 2));
        }

        console.log("✅ INSPECTION COMPLETE");
        // Force wait for flush
        await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
        console.error("Error fetching sheet metadata:", error);
    }
}

inspectSheets();
