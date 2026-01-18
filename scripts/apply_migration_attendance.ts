
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const { Client } = require('pg');

async function runMigration() {
    console.log('Starting Migration: Adding makeup_date to attendance...');

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('No Connection String found. Run SQL manually.');
        console.log(`
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS makeup_date DATE;
    `);
        return;
    }

    try {
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        await client.connect();

        await client.query(`ALTER TABLE attendance ADD COLUMN IF NOT EXISTS makeup_date DATE;`);
        console.log('Column makeup_date added.');

        await client.end();
        console.log('Migration Complete.');
    } catch (e: any) {
        console.error('Migration Failed:', e.message);
    }
}

runMigration();
