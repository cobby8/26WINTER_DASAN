
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load .env.local manually
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function syncDiagnostic() {
    console.log('--- Raw Data Sync Diagnostic ---');

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: env.GOOGLE_PRIVATE_KEY,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        console.log('Step 1: Fetching Sheet Data...');
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: env.GOOGLE_SHEET_ID,
            range: 'A1:AZ1000',
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            console.log('❌ No data found in sheet.');
            return;
        }
        console.log(`✅ Fetched ${rows.length} rows.`);

        const headers = rows[0];
        console.log('Headers:', headers.slice(0, 10).join(', ') + '...');

        // Check if essential headers exist
        const nameIdx = headers.indexOf('수강생 이름');
        if (nameIdx === -1) {
            console.log('❌ "수강생 이름" header NOT FOUND!');
            return;
        }

        console.log('Step 2: Testing single student upsert...');
        const firstStudentRow = rows.slice(1).find(r => r[nameIdx]?.trim());
        if (!firstStudentRow) {
            console.log('❌ No valid student row found.');
            return;
        }

        const testName = firstStudentRow[nameIdx].trim();
        console.log(`Testing with student: ${testName}`);

        // Try to match SyncService logic
        const { data: studentData, error: studentError } = await supabase
            .from('students')
            .upsert({
                name: testName,
                // Add minimal fields
            }, { onConflict: 'name, parent_phone' }) // parent_phone might be empty here in test
            .select('id')
            .single();

        if (studentError) {
            console.error('❌ Student Upsert Error:', studentError.message);
        } else {
            console.log('✅ Student Upsert Success. ID:', studentData.id);
        }

    } catch (e) {
        console.error('🔥 FATAL:', e.message);
    }
}

syncDiagnostic();
