
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function check2ndSessionClasses() {
    let output = '--- Checking 2nd Session Classes ---\n';

    // Fetch all "2차" related classes
    const { data: allClasses, error: classError } = await supabase
        .from('classes')
        .select('id, name, session, day_of_week, start_time, deleted_at')
        .or('session.eq.2차,name.ilike.%2차%');

    if (classError) {
        output += `Error fetching classes: ${classError.message}\n`;
        fs.writeFileSync('debug_output_utf8.txt', output, 'utf8');
        return;
    }

    const activeClasses = allClasses.filter(c => !c.deleted_at);
    const deletedClasses = allClasses.filter(c => c.deleted_at);

    output += `Total Found: ${allClasses.length}\n`;
    output += `Active (Visible): ${activeClasses.length}\n`;
    output += `Soft-Deleted (Hidden): ${deletedClasses.length}\n`;

    if (deletedClasses.length > 0) {
        output += '\n--- Sample Soft-Deleted Classes ---\n';
        deletedClasses.slice(0, 5).forEach(c => {
            output += `[DELETED] ${c.name} (${c.day_of_week} ${c.start_time}) - ID: ${c.id}\n`;
        });
    }

    if (activeClasses.length > 0) {
        output += '\n--- Sample Active Classes ---\n';
        activeClasses.slice(0, 5).forEach(c => {
            output += `[ACTIVE] ${c.name} (${c.day_of_week} ${c.start_time}) - ID: ${c.id}\n`;
        });
    }

    // Check for overlap
    output += '\n--- Checking for potential duplicates ---\n';
    let duplicateCount = 0;
    for (const deleted of deletedClasses) {
        const match = activeClasses.find(a =>
            a.name === deleted.name &&
            a.day_of_week === deleted.day_of_week &&
            a.start_time === deleted.start_time
        );
        if (match) {
            output += `Duplicate found: ${deleted.name} is DELETED (${deleted.id}) but also ACTIVE (${match.id})\n`;
            duplicateCount++;
            if (duplicateCount > 5) {
                output += '... more duplicates exist ...\n';
                break;
            }
        }
    }

    if (duplicateCount === 0) output += 'No direct duplicates found (Deleted same as Active).\n';

    fs.writeFileSync('debug_output_utf8.txt', output, 'utf8');
    console.log('Output written to debug_output_utf8.txt');
}

check2ndSessionClasses();
