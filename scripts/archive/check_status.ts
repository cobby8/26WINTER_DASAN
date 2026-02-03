
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('🔍 Checking Schema Status...');

    // 1. Check students table columns
    const { data: studentColumns, error: colError } = await supabaseAdmin
        .from('students')
        .select('id, deleted_at, status')
        .limit(1);

    if (colError) {
        // If column doesn't exist, it might throw an error or just return data without those fields if using * (but here we selected specific fields)
        // Actually, selecting non-existent columns via PostgREST usually throws an error: "Could not find the 'deleted_at' column..."
        console.log('⚠️  Students table check result:', colError.message);
    } else {
        console.log('✅ Students table has `deleted_at` and `status` columns.');
    }

    // 2. Check notifications table existence
    const { data: notifications, error: tableError } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .limit(1);

    if (tableError) {
        console.log('⚠️  Notifications table check result:', tableError.message);
    } else {
        console.log('✅ Notifications table exists.');
    }
}

checkSchema();
