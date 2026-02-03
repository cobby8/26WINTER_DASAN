
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabaseAdmin } from '../src/lib/supabase';

async function checkRecentSchedules() {
    console.log('--- Checking Recent Shuttle Schedules ---');

    // Fetch schedules created/updated recently (active ones)
    const { data: activeSchedules, error } = await supabaseAdmin
        .from('shuttle_schedules')
        .select(`
            id, 
            student_id, 
            day_of_week, 
            time, 
            location_name, 
            type,
            created_at,
            deleted_at
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (!activeSchedules || activeSchedules.length === 0) {
        console.log('No active schedules found.');
        return;
    }

    console.log(`Found ${activeSchedules.length} active schedules.`);
    activeSchedules.forEach(s => {
        console.log(`[${s.day_of_week}] ${s.time} - ${s.type} (Created: ${s.created_at})`);
    });

    // Check count
    const { count } = await supabaseAdmin
        .from('shuttle_schedules')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

    console.log(`Total Active Schedules: ${count}`);
}

checkRecentSchedules();
