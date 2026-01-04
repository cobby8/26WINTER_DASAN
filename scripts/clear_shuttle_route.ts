
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearShuttle() {
    console.log('Clearing Shuttle Route for Kang Sihyun...');

    // 1. Get ID
    const { data: students } = await supabase
        .from('students')
        .select('id, name')
        .eq('name', '강시현')
        .single();

    if (!students) return;

    // 2. Update to null
    const { error } = await supabase
        .from('students')
        .update({ shuttle_route: null }) // Set to null
        .eq('id', students.id);

    if (error) {
        console.error('Clear failed:', error);
    } else {
        console.log('Clear Success: shuttle_route = NULL');
    }
}

clearShuttle();
