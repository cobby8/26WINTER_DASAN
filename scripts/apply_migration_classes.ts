
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

// Just use pg directly if possible for DDL
const { Client } = require('pg');

async function runMigration() {
    console.log('Starting Migration: Adding deleted_at to classes...');

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('No Connection String found. Run SQL manually.');
        console.log(`
      ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      DROP INDEX IF EXISTS idx_classes_composite_sync;
      CREATE INDEX IF NOT EXISTS idx_classes_active_sync ON classes(day_of_week, start_time, branch, session) WHERE deleted_at IS NULL;
    `);
        return;
    }

    try {
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        await client.connect();

        await client.query(`ALTER TABLE classes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
        console.log('Column deleted_at added.');

        await client.query(`DROP INDEX IF EXISTS idx_classes_composite_sync;`);
        console.log('Old index dropped.');

        await client.query(`CREATE INDEX IF NOT EXISTS idx_classes_active_sync ON classes(day_of_week, start_time, branch, session) WHERE deleted_at IS NULL;`);
        console.log('New partial index created.');

        await client.end();
        console.log('Migration Complete.');
    } catch (e: any) {
        console.error('Migration Failed:', e.message);
    }
}

runMigration();
