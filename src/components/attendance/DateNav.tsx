'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface DateNavProps {
    dateStr: string; // YYYY-MM-DD
}

export function DateNav({ dateStr }: DateNavProps) {
    const router = useRouter();
    const [date, setDate] = React.useState<Date | undefined>(undefined);

    React.useEffect(() => {
        if (dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            setDate(new Date(y, m - 1, d));
        }
    }, [dateStr]);
    const [open, setOpen] = React.useState(false);

    // Fix: Ensure the calendar displays the correct date even if timezone differs
    const [year, month, day] = dateStr.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);

    const handleSelect = (newDate: Date | undefined) => {
        if (!newDate) return;
        setDate(newDate);
        setOpen(false);
        const newDateStr = format(newDate, 'yyyy-MM-dd');
        router.push(`/admin/attendance?date=${newDateStr}`);
    };

    const prevDate = format(new Date(currentDate.getTime() - 86400000), 'yyyy-MM-dd');
    const nextDate = format(new Date(currentDate.getTime() + 86400000), 'yyyy-MM-dd');

    return (
        <div className="flex items-center space-x-2 bg-white p-1 rounded-lg shadow-sm border">
            <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/attendance?date=${prevDate}`}>
                    <ChevronLeft className="h-4 w-4" />
                </Link>
            </Button>

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"ghost"}
                        className={cn(
                            "min-w-[160px] justify-center text-left font-medium text-lg hover:bg-gray-100",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {format(currentDate, "yyyy-MM-dd (eee)", { locale: ko })}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                        mode="single"
                        selected={currentDate}
                        onSelect={handleSelect}
                        initialFocus
                        locale={ko}
                    />
                </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/attendance?date=${nextDate}`}>
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </Button>
        </div>
    );
}
