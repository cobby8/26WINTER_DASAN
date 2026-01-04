
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local manually to avoid alias issues
const envFile = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
    console.log('--- Checking Classes Table Structure ---');
    try {
        // Try to select ONE record with all columns
        const { data, error } = await supabase.from('classes').select('*').limit(1);

        if (error) {
            console.error('❌ SQL ERROR:', error.message);
            console.error('Code:', error.code);
            console.error('Hint:', error.hint);
        } else if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log('✅ Found Columns:', columns.join(', '));

            const hasBranch = columns.includes('branch');
            const hasSession = columns.includes('session');

            if (hasBranch && hasSession) {
                console.log('✨ SUCCESS: All required columns exist.');
            } else {
                console.log('❌ MISSING: ', !hasBranch ? 'branch ' : '', !hasSession ? 'session' : '');
                console.log('MUST RUN fix_sync_schema.sql IN SUPABASE DASHBOARD!');
            }
        } else {
            console.log('⚠️ Classes table is empty. Trying blind select...');
            const { error: blindError } = await supabase.from('classes').select('branch, session').limit(1);
            if (blindError) {
                console.log('❌ branch/session columns do NOT exist:', blindError.message);
            } else {
                console.log('✅ branch/session columns EXIST.');
            }
        }
    } catch (e) {
        console.error('🔥 Fatal script error:', e.message);
    }
}

check();
