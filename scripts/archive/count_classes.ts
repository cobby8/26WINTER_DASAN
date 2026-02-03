
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function countClasses() {
    const { count: total } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    console.log('TOTAL:', total);

    const { count: active } = await supabase.from('classes').select('*', { count: 'exact', head: true }).is('deleted_at', null);
    console.log('ACTIVE:', active);

    // Check if simplify fetches deleted
    const { data: fetchCheck } = await supabase.from('classes').select('id, name');
    console.log('DEFAULT FETCH COUNT:', fetchCheck?.length);
}

countClasses();
