
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function analyzeTimestamps() {
    console.log('--- Analyzing Shuttle Schedule Timestamps ---');

    const { data, error } = await supabase
        .from('shuttle_schedules')
        .select('updated_at, created_at, id')
        .is('deleted_at', null);

    if (error || !data) {
        console.error('Error:', error);
        return;
    }

    console.log(`Total Active Schedules: ${data.length}`);

    // Group by 'updated_at' (approximate to hour/minute)
    const groups: Record<string, number> = {};
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 1); // 1 hour ago

    let recentCount = 0;
    let oldCount = 0;

    data.forEach(d => {
        const dTime = new Date(d.updated_at || d.created_at);
        const key = dTime.toISOString().substring(0, 13); // YYYY-MM-DDTHH
        groups[key] = (groups[key] || 0) + 1;

        if (dTime > cutoff) recentCount++;
        else oldCount++;
    });

    console.log('Time Distribution (Hourly):', groups);
    console.log(`Recent (Last 1hr): ${recentCount}`);
    console.log(`Old (Older than 1hr): ${oldCount}`);

    if (oldCount > 0) {
        console.log("⚠️ Found OLD records that were not touched by the recent rebuild. These are likely Zombies.");
    }
}

analyzeTimestamps();
