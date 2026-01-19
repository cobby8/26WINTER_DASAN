
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('Starting Migration: Adding deleted_at to shuttle_schedules...');

    // 1. Add Column (If not exists)
    // Note: RPC is safer for DDL, but if disabled, we assume user runs SQL manually. 
    // However, we can try to use a raw SQL approach if we had a specific function exposed, 
    // or just log the SQL for the user to run if we can't execute it.
    // Actually, we can use the `postgres` driver directly if installed, but here we only have `supabase-js`.
    // `supabase-js` cannot run raw SQL unless via RPC.

    // Strategy: We will log the SQL and ask user to run or assumes the environment has a mechanism.
    // BUT the user asked me to "make it work". 
    // I will TRY to assume there is a `exec_sql` RPC or similar if I see one in `production_schema.sql`? No.

    // Wait, I can try to use `pg` library if installed. `package.json` had `pg` in devDependencies.
    // Let's check package.json again. Yes, `pg` ^8.16.3 is in devDependencies.

    try {
        const { Client } = require('pg');
        // Using connection string if available in ENVs
        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL; // Next.js often has this

        if (!connectionString) {
            console.log('No POSTGRES_URL found. Cannot auto-apply migration via Node.');
            console.log('Please run this SQL manually in Supabase SQL Editor:');
            console.log(`
        ALTER TABLE shuttle_schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
        DROP INDEX IF EXISTS idx_shuttle_unique_v2;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_shuttle_active_unique ON shuttle_schedules (student_id, day_of_week, type) WHERE deleted_at IS NULL;
      `);
            return;
        }

        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } }); // Supabase requires SSL usually
        await client.connect();

        console.log('Connected to Database via pg driver.');

        await client.query(`ALTER TABLE shuttle_schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
        console.log('Column deleted_at added.');

        // New: Allow student_id to be NULL (for Academy Stops)
        await client.query(`ALTER TABLE shuttle_schedules ALTER COLUMN student_id DROP NOT NULL;`);
        console.log('Column student_id nullable constraint dropped.');

        await client.query(`DROP INDEX IF EXISTS idx_shuttle_unique_v2;`);
        console.log('Old index dropped.');

        await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_shuttle_active_unique ON shuttle_schedules (student_id, day_of_week, type) WHERE deleted_at IS NULL;`);
        console.log('New partial index created.');

        await client.end();
        console.log('Migration Complete.');
    } catch (e: any) {
        console.error('Migration Failed:', e.message);
        // Explicit instructions
        console.log('Please run this SQL manually in Supabase SQL Editor:');
        console.log(`
        -- 1. Allow student_id to be NULL (Critical for Academy Stops)
        ALTER TABLE shuttle_schedules ALTER COLUMN student_id DROP NOT NULL;

        -- 2. Add Soft Delete Column
        ALTER TABLE shuttle_schedules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

        -- 3. Update Unique Index (Partial Index for Active Only)
        DROP INDEX IF EXISTS idx_shuttle_unique_v2;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_shuttle_active_unique ON shuttle_schedules (student_id, day_of_week, type) WHERE deleted_at IS NULL;
    `);
    }
}

runMigration();
