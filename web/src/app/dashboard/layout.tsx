"use client";

import { useAuthStore } from "@/store/auth";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, PlusCircle, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated) {
      if (typeof window !== "undefined" && localStorage.getItem("token")) {
        fetchMe().catch(() => router.push("/login"));
      } else {
        router.push("/login");
      }
    } else if (user?.role !== "organizer") {
      router.push("/");
    }
  }, [isAuthenticated, user, router, fetchMe]);

  if (!isAuthenticated || user?.role !== "organizer") {
    return <div className="min-h-[80vh] flex items-center justify-center text-gray-400">Panela Yükleniyor...</div>;
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-73px)] border-t border-gray-100 bg-gray-50">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Kurum Paneli</h2>
          <p className="text-sm text-gray-500 mt-1 truncate">{user?.full_name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/dashboard' ? 'bg-green-50 text-green-700 border border-green-100 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-bold">Ana Panel</span>
          </Link>
          <Link href="/dashboard/create-event" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/dashboard/create-event' ? 'bg-green-50 text-green-700 border border-green-100 shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>
            <PlusCircle className="w-5 h-5" />
            <span className="font-bold">Yeni Etkinlik</span>
          </Link>
        </nav>
      </aside>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden flex fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 px-2 pb-safe shadow-lg">
          <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-3 px-2 ${pathname === '/dashboard' ? 'text-green-700' : 'text-gray-400'}`}>
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-1">Panel</span>
          </Link>
          <Link href="/dashboard/create-event" className={`flex-1 flex flex-col items-center py-3 px-2 ${pathname === '/dashboard/create-event' ? 'text-green-700' : 'text-gray-400'}`}>
            <PlusCircle className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-1">Oluştur</span>
          </Link>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>
    </div>
  );
}
