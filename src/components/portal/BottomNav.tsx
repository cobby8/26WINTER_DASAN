"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarCheck, CreditCard, User } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        {
            href: "/portal/dashboard",
            label: "홈",
            icon: Home,
            isActive: (path: string) => path === "/portal/dashboard",
        },
        {
            href: "/portal/dashboard/attendance",
            label: "출석",
            icon: CalendarCheck,
            isActive: (path: string) => path.startsWith("/portal/dashboard/attendance"),
        },
        {
            href: "/portal/dashboard/payments",
            label: "수납",
            icon: CreditCard,
            isActive: (path: string) => path.startsWith("/portal/dashboard/payments"),
        },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-6 z-50">
            <div className="flex justify-between items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const active = item.isActive(pathname);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                                active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
                            )}
                        >
                            <item.icon
                                className={cn("w-6 h-6", active && "fill-current")}
                                strokeWidth={active ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
