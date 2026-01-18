"use client";

import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { ko } from 'date-fns/locale';

interface Props {
    presentDates: string[];
    absentDates: string[];
    lateDates: string[];
}

export default function AttendanceCalendar({ presentDates, absentDates, lateDates }: Props) {
    // Convert strings back to Dates for the Calendar component
    const present = presentDates.map((d) => new Date(d));
    const absent = absentDates.map((d) => new Date(d));
    const late = lateDates.map((d) => new Date(d));

    return (
        <Card className="rounded-[24px] border-none shadow-sm p-4 bg-white flex justify-center">
            <Calendar
                mode="single"
                locale={ko}
                selected={new Date()}
                className="rounded-md border-none"
                modifiers={{
                    present: present,
                    absent: absent,
                    late: late,
                }}
                modifiersStyles={{
                    present: { color: 'white', backgroundColor: '#3b82f6', borderRadius: '50%' }, // Blue
                    absent: { color: 'white', backgroundColor: '#ef4444', borderRadius: '50%' }, // Red
                    late: { color: 'white', backgroundColor: '#eab308', borderRadius: '50%' }, // Yellow
                }}
            />
        </Card>
    );
}
