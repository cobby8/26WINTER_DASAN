
import { supabaseAdmin } from './supabase';

export type TuitionBreakdown = {
    tuitionFee: number;
    shuttleFee: number;
    sessionType: string;
    frequency: string;
    calculationLog: any;
};

type RuleKey = {
    status: string; // 'new' | 'existing'
    frequency: string; // '2x' | '3x' | '5x'
};

export async function calculateTuition(
    studentId: string,
    studentStatus: 'new' | 'existing' = 'new',
    shuttleBoarding: boolean = false // default to false if not specified, or fetch from student?
): Promise<TuitionBreakdown> {

    // 1. Fetch Enrollments with Class details
    const { data: enrollments, error } = await supabaseAdmin
        .from('enrollments')
        .select(`
            id,
            status,
            classes (
                id,
                day_of_week,
                session,
                start_time,
                branch
            )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active');

    if (error || !enrollments) {
        throw new Error(`Failed to fetch enrollments: ${error?.message}`);
    }

    if (enrollments.length === 0) {
        return {
            tuitionFee: 0,
            shuttleFee: 0,
            sessionType: 'none',
            frequency: '0x',
            calculationLog: { message: 'No active enrollments' }
        };
    }

    // 2. Analyze Enrollments
    const sessions = new Set<string>();
    const days = new Set<string>(); // Use day+time or just day? distinct slots?
    // Rule says: "Count of active weekly schedule slots (W to AA)". 
    // Usually means unique class IDs count, but let's count unique timeslots if possible.
    // Assuming 1 enrollment = 1 slot.
    const slotCount = enrollments.length;

    enrollments.forEach((e: any) => {
        const c = e.classes;
        if (Array.isArray(c)) return; // Should be object
        if (!c) return;

        // Normalize session name just in case
        if (c.session?.includes('1차')) sessions.add('1차');
        if (c.session?.includes('2차')) sessions.add('2차');
    });

    let sessionType = '';
    if (sessions.has('1차') && sessions.has('2차')) sessionType = '1차, 2차';
    else if (sessions.has('1차')) sessionType = '1차';
    else if (sessions.has('2차')) sessionType = '2차';
    else sessionType = 'unknown';

    // Frequency Logic
    let frequency = '2x';
    // Logic from plan: 2->2x, 3->3x, 5->5x.
    // What if 4? What if 1? Let's implement nearest bucket or safe defaults.
    if (slotCount >= 5) frequency = '5x';
    else if (slotCount >= 3) frequency = '3x';
    else frequency = '2x'; // Default for 1-2

    // 3. Fetch Rules
    const { data: rules, error: rulesError } = await supabaseAdmin
        .from('tuition_rules')
        .select('*')
        .eq('status_type', studentStatus)
        .eq('frequency_type', frequency)
        .single();

    if (rulesError || !rules) {
        console.warn(`No tuition rule found for ${studentStatus}/${frequency}. Using 0.`);
    }

    // 4. Calculate Base Tuition
    let tuition = 0;
    const rule = rules || { session_1_price: 0, session_2_price: 0 };

    if (sessionType === '1차, 2차') {
        tuition = rule.session_1_price + rule.session_2_price;
    } else if (sessionType === '1차') {
        tuition = rule.session_1_price;
    } else if (sessionType === '2차') {
        tuition = rule.session_2_price;
    }

    // 5. Calculate Shuttle Fee
    let shuttleFee = 0;
    if (shuttleBoarding) {
        // Base rates
        let baseShuttle = 0;
        if (frequency === '5x') baseShuttle = 20000;
        else if (frequency === '3x') baseShuttle = 15000;
        else baseShuttle = 10000;

        // Multiplier
        const multiplier = (sessionType === '1차, 2차') ? 2 : 1;
        shuttleFee = baseShuttle * multiplier;
    }

    return {
        tuitionFee: tuition,
        shuttleFee: shuttleFee,
        sessionType,
        frequency,
        calculationLog: {
            slotCount,
            sessions: Array.from(sessions),
            ruleUsed: rules ? rules.id : 'fallback',
            baseRates: rule
        }
    };
}
