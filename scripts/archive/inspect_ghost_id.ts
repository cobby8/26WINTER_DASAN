
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectGhost() {
    const targetId = '601127ca-16de-473b-b553-100c7a3daab6';
    console.log(`Inspecting ID: ${targetId}`);

    const { data: cls, error } = await supabase
        .from('classes')
        .select('*')
        .eq('id', targetId)
        .single();

    if (error) {
        console.error('Error fetching ID:', error);
    } else {
        console.log('--- DB Record ---');
        console.log(`ID: ${cls.id}`);
        console.log(`Name: "${cls.name}"`);
        console.log(`Branch: ${cls.branch}`);
        console.log(`Updated At: ${cls.updated_at}`);
        console.log(`Deleted At: ${cls.deleted_at}`);
    }
}

inspectGhost();
