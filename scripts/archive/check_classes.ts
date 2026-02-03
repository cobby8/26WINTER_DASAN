
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
    console.log('Checking classes in DB...');
    const { data: classes, error } = await supabase.from('classes').select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${classes.length} classes.`);
        console.log(classes);
    }
}

check();
