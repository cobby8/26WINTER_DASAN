
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';
import { readFileSync } from 'fs';

// Ensure this file is never bundled to client
import 'server-only';

// Manually load .env.local to bypass Next.js potential env pollution
try {
    const envPath = join(process.cwd(), '.env.local');
    const envFile = readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Simple unquote
            if (!process.env[key]) {
                process.env[key] = value;
            }
            // FORCE OVERRIDE for critical keys
            if (key === 'NEXT_PUBLIC_SUPABASE_URL' || key === 'SUPABASE_SERVICE_ROLE_KEY') {
                process.env[key] = value;
            }
        }
    });
    console.log('[SupabaseAdmin] .env.local manually loaded.');
} catch (e) {
    console.warn('[SupabaseAdmin] Failed to load .env.local manually', e);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase URL or Service Role Key missing in server environment.');
}

console.log('[SupabaseAdmin] Initializing with Service Role Key...');

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
