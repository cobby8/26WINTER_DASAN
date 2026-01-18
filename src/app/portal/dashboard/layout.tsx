import BottomNav from "@/components/portal/BottomNav";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-[#F2F4F6] pb-24">
            {/* Max-width container for mobile view on desktop */}
            <div className="max-w-md mx-auto bg-white min-h-screen shadow-2xl relative">
                {children}
                <BottomNav />
            </div>
        </div>
    );
}
