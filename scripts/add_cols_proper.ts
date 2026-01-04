
import { Client } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("No DB URL");
        return;
    }

    // Supabase requires SSL usually
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        await client.query(`
            ALTER TABLE shuttle_ops_logs
            ADD COLUMN IF NOT EXISTS actual_time TIME DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
        `);

        console.log("Columns Added (if not existing).");
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await client.end();
    }
}

run();
