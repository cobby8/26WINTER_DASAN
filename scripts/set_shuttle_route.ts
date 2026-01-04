
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setShuttle() {
    console.log('Setting Shuttle Route for Kang Sihyun...');
    // Kang Sihyun ID from previous logs: '6484ae08-4ed4-488d-a10e-c6eb2059eafb' ? No, that was class ID.
    // Let's search by name "강시현"

    const { data: students, error: searchError } = await supabase
        .from('students')
        .select('id, name')
        .eq('name', '강시현')
        .single();

    if (searchError || !students) {
        console.error('Student not found:', searchError);
        return;
    }

    console.log(`Found student: ${students.name} (${students.id})`);

    const { error: updateError } = await supabase
        .from('students')
        .update({ shuttle_route: 'Test Route A' })
        .eq('id', students.id);

    if (updateError) {
        console.error('Update failed:', updateError);
    } else {
        console.log('Update Success: shuttle_route = "Test Route A"');
    }
}

setShuttle();
