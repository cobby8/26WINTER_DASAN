
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findTypes() {
    console.log('--- Finding Distinct Shuttle Types ---');
    const { data } = await supabase.from('shuttle_schedules').select('type');
    if (!data) return;

    // Distinct
    const unique = [...new Set(data.map(d => d.type))];
    console.log('Unique Types:', unique);

    // Check if there are any specific 'academy' types
    // If not, maybe they used location names.
}

findTypes();
