'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Users,
    Calendar,
    RefreshCw,
    LayoutDashboard,
    BookOpen,
    Bus,
    ChevronLeft,
    ChevronRight,
    Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function AdminSidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();

    // Auto-collapse on smaller screens (initial load & resize)
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsCollapsed(true);
            } else {
                setIsCollapsed(false);
            }
        };

        // Set initial state
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const navItems = [
        { name: '대시보드', href: '/admin', icon: LayoutDashboard },
        { name: '학생 관리', href: '/admin/students', icon: Users },
        { name: '출석부', href: '/admin/attendance', icon: Calendar },
        { name: '수업 관리', href: '/admin/classes', icon: BookOpen },
        { name: '셔틀 운행', href: '/admin/shuttle', icon: Bus },
        { name: '데이터 동기화', href: '/admin/sync', icon: RefreshCw },
    ];

    return (
        <aside
            className={cn(
                "bg-white dark:bg-gray-800 border-r shadow-sm transition-all duration-300 ease-in-out relative flex flex-col h-screen",
                isCollapsed ? "w-16" : "w-64"
            )}
        >
            {/* Header */}
            <div className={cn(
                "p-4 h-16 flex items-center overflow-hidden whitespace-nowrap",
                isCollapsed ? "justify-center" : "justify-between"
            )}>
                {!isCollapsed && (
                    <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        Winter Admin
                    </h1>
                )}
                {isCollapsed && (
                    <span className="font-bold text-blue-600">W</span>
                )}
            </div>

            {/* Toggle Button (Desktop/Manual) */}
            <Button
                variant="ghost"
                size="icon"
                className="absolute -right-3 top-20 bg-white border shadow-sm rounded-full h-6 w-6 hidden md:flex z-10"
                onClick={toggleSidebar}
            >
                {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>

            {/* Navigation */}
            <nav className="flex-1 mt-4 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center px-3 py-3 rounded-md transition-colors whitespace-nowrap",
                                isActive
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200"
                                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700",
                                isCollapsed ? "justify-center" : ""
                            )}
                            title={isCollapsed ? item.name : undefined}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 shrink-0",
                                !isCollapsed && "mr-3"
                            )} />

                            {!isCollapsed && (
                                <span>{item.name}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile placeholder could go here */}
            {/* <div className="p-4 border-t"> ... </div> */}
        </aside>
    );
}
