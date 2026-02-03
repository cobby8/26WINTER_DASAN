
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function debugUpdate() {
    let logBuffer = '';
    const log = (msg: any) => {
        console.log(msg);
        logBuffer += (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n';
    };

    const targetId = 'c04775f1-e70d-41e2-9edf-08145aad05f3';
    log(`--- DEBUG UPDATE: ${targetId} ---`);
    log(`DB URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    // 1. Fetch Current
    const { data: before } = await supabase.from('classes').select('name').eq('id', targetId).single();
    log(`BEFORE: "${before?.name}"`);

    // 2. Calculate New Name
    const pattern = /\((.*)\)$/;
    const match = before?.name.trim().match(pattern);
    if (!match) {
        log('No regex match!');
        fs.writeFileSync('debug_update_log.txt', logBuffer);
        return;
    }
    const newName = match[1].trim();
    log(`CALCULATED NEW NAME: "${newName}"`);

    // Check if change is needed
    if (before?.name === newName) {
        log('Name is already correct. No update needed.');
        fs.writeFileSync('debug_update_log.txt', logBuffer);
        return;
    }

    // 3. Update
    const { data: updated, error } = await supabase
        .from('classes')
        .update({ name: newName })
        .eq('id', targetId)
        .select();

    if (error) {
        log('UPDATE ERROR: ' + JSON.stringify(error));
    } else {
        log('UPDATE SUCCESS: ' + JSON.stringify(updated));
    }

    // 4. Fetch After
    const { data: after } = await supabase.from('classes').select('name').eq('id', targetId).single();
    log(`AFTER: "${after?.name}"`);

    fs.writeFileSync('debug_update_log.txt', logBuffer);
}

debugUpdate();
