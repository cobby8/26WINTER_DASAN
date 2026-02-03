
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TARGET_ID = 'df2a614d-2bfc-4889-8a66-186cb757cfd9';

async function inspectSession() {
    const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .eq('id', TARGET_ID)
        .single();

    if (cls) {
        console.log(`Session: "${cls.session}"`);
        console.log(`Length: ${cls.session.length}`);
        console.log(`CharCodes: ${cls.session.split('').map((c: string) => c.charCodeAt(0)).join(', ')}`);

        // Test query
        const { count } = await supabase.from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('session', '2차')
            .is('deleted_at', null); // ADD THIS
        console.log(`Query eq('session', '2차') AND is('deleted_at', null) count: ${count}`);
    } else {
        console.log('Class not found.');
    }
}

inspectSession();
