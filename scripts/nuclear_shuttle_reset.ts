
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function nuclearShuttleReset() {
    console.log('--- NUCLEAR SHUTTLE RESET ---');

    // 1. Backup
    console.log('1. Backing up existing data...');
    const { data: backup, error: backupErr } = await supabase
        .from('shuttle_schedules')
        .select('*');

    if (backupErr) {
        console.error('Backup Failed:', backupErr);
        return;
    }

    const dumpPath = path.join(process.cwd(), `scripts/shuttle_backup_${Date.now()}.json`);
    fs.writeFileSync(dumpPath, JSON.stringify(backup, null, 2));
    console.log(`Backup saved to ${dumpPath} (${backup.length} records)`);

    // 2. Delete ALL
    console.log('2. DELETING ALL SHUTTLE SCHEDULES...');
    const { error: delErr } = await supabase
        .from('shuttle_schedules')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything except maybe a system row if it existed (safety)

    if (delErr) {
        console.error('Delete Failed:', delErr);
        return;
    }
    console.log('All shuttle schedules deleted.');

    // 3. (Optional) We could clear shuttle_ops_logs too if needed, but user focused on Schedules.
}

nuclearShuttleReset();
