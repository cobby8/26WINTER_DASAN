
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) process.env[key.trim()] = val.trim();
});

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function listClasses() {
    console.log('--- CLASSES LIST ---');
    console.log(`DB URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
    const { data: classes } = await supabase
        .from('classes')
        .select('*')
        .ilike('name', '%금요일%')
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let output = `DB URL: ${url}\n`;

    output += (classes || []).map(c => {
        const isLong = c.name.startsWith('[');
        return `[ID: ${c.id}] [${isLong ? 'LONG' : 'SHORT'}] ${c.name}`;
    }).join('\n');

    fs.writeFileSync('debug_names.txt', output);
    console.log('Saved to debug_names.txt');
}
listClasses();
