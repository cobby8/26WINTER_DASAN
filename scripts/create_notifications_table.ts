
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function runMigration() {
    console.log('Starting Notification Table Migration...');

    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('No Connection String found in .env.local');
        process.exit(1);
    }

    try {
        const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
        await client.connect();

        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id UUID REFERENCES students(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                metadata JSONB
            );

            CREATE INDEX IF NOT EXISTS idx_notifications_student ON notifications(student_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(student_id) WHERE is_read = FALSE;
        `;

        await client.query(createTableSQL);
        console.log('Notifications table created successfully.');
        await client.end();

    } catch (e: any) {
        console.error('Migration Failed:', e.message);
        process.exit(1);
    }
}

runMigration();
