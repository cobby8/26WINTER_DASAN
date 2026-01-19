"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
// Use client-side helper if available or standard createClient
// Actually, standard project might use a specific helper. I'll rely on the standard imports seen elsewhere or use @supabase/supabase-js if needing direct client.
// Based on previous files, we often use `supabaseAdmin` on server, but for client we need a client. 
// Assuming `createClient` from `@/lib/supabase` is NOT for client side auth usually? 
// Let's check imports in other files. `dashboard/page.tsx` uses `supabaseAdmin`. 
// I'll assume I need to create a client here or use a provided hook. 
// For now, I'll use `createBrowserClient` pattern if Next.js, or just use `createClient` from custom lib if it supports it.
// Checking `src/lib/supabase.ts` via 'read_file' might differ. I'll assume standard `createClient` for now.

// Wait, I haven't checked `src/lib/supabase.ts` completely. I'll use a generic fetch approach to an API route to avoid exposing keys if unsure, 
// OR simpler: use state and standard fetching from a new API route `/api/notifications` to keep it clean.
// Yes, let's make an API route for fetching to be safe and consistent.

interface Notification {
    id: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    type: string;
}

export default function NotificationBell({ studentId }: { studentId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const res = await fetch(`/api/notifications?studentId=${studentId}`);
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unreadCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        if (studentId) {
            fetchNotifications();
            // Optional: Set up polling or realtime subscription here
            const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
            return () => clearInterval(interval);
        }
    }, [studentId]);

    const handleMarkAsRead = async () => {
        if (unreadCount > 0) {
            await fetch(`/api/notifications/read?studentId=${studentId}`, { method: "POST" });
            setUnreadCount(0);
            fetchNotifications(); // Refresh to update list status
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={(open) => {
            setIsOpen(open);
            if (open) handleMarkAsRead();
        }}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-6 h-6 text-gray-400" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
                    <h4 className="font-semibold text-sm">알림</h4>
                    <span className="text-xs text-gray-500">{notifications.length}개의 알림</span>
                </div>
                <ScrollArea className="h-[300px]">
                    {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">새로운 알림이 없습니다.</div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notif) => (
                                <div key={notif.id} className={`p-4 hover:bg-gray-50 ${!notif.is_read ? 'bg-blue-50/50' : ''}`}>
                                    <div className="flex gap-2 mb-1">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${notif.type === 'attendance' ? 'bg-blue-100 text-blue-600' :
                                            notif.type === 'shuttle' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {notif.type === 'attendance' ? '출결' : notif.type === 'shuttle' ? '셔틀' : '알림'}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(notif.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h5 className="text-sm font-medium text-gray-900 mb-0.5">{notif.title}</h5>
                                    <p className="text-xs text-gray-500 leading-snug">{notif.message}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
