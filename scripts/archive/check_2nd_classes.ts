
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .eq('session', '2차'); // All

    if (error) {
        fs.writeFileSync('db_check_result.txt', `Error: ${error.message}`);
        return;
    }

    const active = classes?.filter(c => !c.deleted_at) || [];
    const deleted = classes?.filter(c => c.deleted_at) || [];

    const output = `Total: ${classes?.length}\nActive: ${active.length}\nDeleted: ${deleted.length}\nSample Active: ${active[0]?.name || 'None'}\nSample Deleted: ${deleted[0]?.name || 'None'}`;
    fs.writeFileSync('db_check_result.txt', output);
    console.log('Result written to db_check_result.txt');
}

check();
