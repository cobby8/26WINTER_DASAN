'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight, Bus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import Link from 'next/link';

interface ShuttleHeaderProps {
    dateStr: string;
    prevDateStr: string;
    nextDateStr: string;
}

export default function ShuttleHeader({ dateStr, prevDateStr, nextDateStr }: ShuttleHeaderProps) {
    const router = useRouter();
    const date = new Date(dateStr);

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            // Use local date parts to avoid timezone shift
            const year = selectedDate.getFullYear();
            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
            const day = String(selectedDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            router.push(`/admin/shuttle?date=${formattedDate}`);
        }
    };

    return (
        <header className="bg-white border-b sticky top-0 z-30 px-4 py-2 flex items-center justify-between shadow-sm gap-2">
            {/* Left: Title & Badge */}
            <div className="flex items-center gap-2 shrink-0">
                <Bus className="h-5 w-5 text-blue-600" />
                <h1 className="text-base font-bold text-slate-800 hidden sm:block">
                    셔틀 운행표
                </h1>
                <div className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase leading-none">
                    기사용
                </div>
            </div>

            {/* Center: Date Navigation & Picker */}
            <div className="flex items-center gap-1 flex-1 justify-center max-w-sm">
                <Link href={`/admin/shuttle?date=${prevDateStr}`} passHref>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                </Link>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            suppressHydrationWarning
                            variant="ghost"
                            className={cn(
                                "flex items-center gap-2 h-10 px-3 font-bold text-slate-900 transition-colors hover:bg-slate-100 rounded-lg",
                                "active:scale-95 shrink-0"
                            )}
                        >
                            <CalendarIcon className="h-4 w-4 text-blue-500" />
                            <div className="flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight">
                                <span>{dateStr}</span>
                                <span className={cn(
                                    "text-xs px-2 rounded-full py-1",
                                    date.getDay() === 0 ? "text-red-500 bg-red-50" :
                                        date.getDay() === 6 ? "text-blue-500 bg-blue-50" :
                                            "text-slate-500 bg-slate-100 font-bold"
                                )}>
                                    {format(date, 'EEE', { locale: ko })}
                                </span>
                            </div>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="center">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>

                <Link href={`/admin/shuttle?date=${nextDateStr}`} passHref>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </Link>
            </div>

            {/* Right: Placeholder for symmetry/other actions */}
            <div className="hidden sm:flex w-10 sm:w-20 shrink-0 justify-end">
                {/* Reserved for Future Buttons */}
            </div>
        </header>
    );
}
