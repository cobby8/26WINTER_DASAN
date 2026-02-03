
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function testShuttleDelete() {
    console.log('🧪 Testing Virtual Shuttle Stop Deletion...');

    // 1. Create a virtual stop
    const { data: newSched, error: createError } = await supabase
        .from('shuttle_schedules')
        .insert({
            student_id: null,
            day_of_week: 'Mon',
            type: 'return',
            time: '12:00:00',
            location_name: 'TEST DELETE STOP',
            location_address: 'Test Address'
        })
        .select('id')
        .single();

    if (createError) {
        console.error('❌ Failed to create test schedule:', createError.message);
        return;
    }
    console.log(`✅ Test Schedule Created: ${newSched.id}`);

    // 2. Try to delete it (mimicking server action logic)
    console.log('🗑️  Attempting deletion of Schedule:', newSched.id);

    // First, delete logs (though there shouldn't be any for a new stop, but the action does it)
    await supabase.from('shuttle_ops_logs').delete().eq('schedule_id', newSched.id);

    // Then delete schedule
    const { error: delError } = await supabase.from('shuttle_schedules').delete().eq('id', newSched.id);

    if (delError) {
        console.error('❌ Deletion FAILED:', delError.message);
    } else {
        console.log('✅ Deletion SUCCESSFUL in DB');
    }
}

testShuttleDelete();
