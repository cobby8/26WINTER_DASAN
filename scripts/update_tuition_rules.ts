
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateRules() {
    console.log('Updating Tuition Rules...');

    // Data based on User Request + Logic
    const newRules = [
        // NEW Students
        {
            status_type: 'new',
            frequency_type: '2x',
            session_1_price: 240000,
            session_2_price: 180000
        },
        {
            status_type: 'new',
            frequency_type: '3x',
            session_1_price: 324000,
            session_2_price: 243000
        },
        {
            status_type: 'new',
            frequency_type: '5x', // Daily
            session_1_price: 480000,
            session_2_price: 360000
        },
        // EXISTING Students
        {
            status_type: 'existing',
            frequency_type: '2x',
            session_1_price: 200000,
            session_2_price: 150000
        },
        {
            status_type: 'existing',
            frequency_type: '3x',
            session_1_price: 264000,
            session_2_price: 198000
        },
        {
            status_type: 'existing',
            frequency_type: '5x', // Daily - Inferred 400k/300k (75% ratio matches others)
            session_1_price: 400000,
            session_2_price: 300000
        }
    ];

    for (const rule of newRules) {
        const { data, error } = await supabase
            .from('tuition_rules')
            .upsert(rule, { onConflict: 'status_type,frequency_type' }) // Assuming unique constraint exists
            .select();

        if (error) {
            console.error(`Error updating ${rule.status_type} ${rule.frequency_type}:`, error);
            // Fallback: Try Update using match based on keys if constraint missing
            const { error: updateError } = await supabase
                .from('tuition_rules')
                .update({
                    session_1_price: rule.session_1_price,
                    session_2_price: rule.session_2_price
                })
                .eq('status_type', rule.status_type)
                .eq('frequency_type', rule.frequency_type);

            if (updateError) console.error('Fallback update failed:', updateError);
        } else {
            console.log(`Updated ${rule.status_type} ${rule.frequency_type}: OK`);
        }
    }
}

updateRules();
