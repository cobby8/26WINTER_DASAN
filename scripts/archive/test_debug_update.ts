
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUpdate() {
    console.log('Fetching one class...');
    const { data: cls } = await supabase
        .from('classes')
        .select('*')
        .ilike('name', '%[%')
        .limit(1)
        .single();

    if (!cls) {
        console.log('No matching class found.');
        return;
    }

    console.log(`Found Class: ID=${cls.id}`);
    console.log(`Name="${cls.name}"`);
    console.log(`Length: ${cls.name.length}`);
    if (cls.name.length > 0) {
        console.log(`Last Char Code: ${cls.name.charCodeAt(cls.name.length - 1)}`);
    }

    // Simulate Rename with loose regex: anything after last paren is allowed
    // \(([^)]+)\) captures (Target)
    // [^)]*$ matches any non-paren characters until end
    const pattern = /\(([^)]+)\)[^)]*$/;
    const match = cls.name.trim().match(pattern);

    if (!match) {
        console.log('Regex did not match.');
        return;
    }

    const newName = match[1].trim();
    console.log(`Start index of match: ${cls.name.indexOf(match[0])}`);
    console.log(`Captured Group 1: "${match[1]}"`);
    console.log(`Target Name: "${newName}"`);

    if (newName === cls.name) {
        console.log('New name is same as old name. Skipping.');
        return;
    }

    // Attempt Update
    const { data, error } = await supabase
        .from('classes')
        .update({ name: newName })
        .eq('id', cls.id)
        .select();

    if (error) {
        console.error('UPDATE ERROR:', JSON.stringify(error, null, 2));
    } else {
        console.log('Update Success:', data);
    }
}

debugUpdate();
