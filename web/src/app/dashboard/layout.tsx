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
    return <div className="min-h-[80vh] flex items-center justify-center text-zinc-400">Panela Yükleniyor...</div>;
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-73px)] border-t border-zinc-900 bg-zinc-950">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-[#141414] border-r border-zinc-800/80 hidden md:flex flex-col">
        <div className="p-6 border-b border-zinc-800/80">
          <h2 className="text-lg font-bold text-white tracking-tight">Kurum Paneli</h2>
          <p className="text-sm text-zinc-500 mt-1 truncate">{user?.full_name}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/dashboard' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Ana Panel</span>
          </Link>
          <Link href="/dashboard/create-event" className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${pathname === '/dashboard/create-event' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-inner' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'}`}>
            <PlusCircle className="w-5 h-5" />
            <span className="font-medium">Yeni Etkinlik</span>
          </Link>
        </nav>
      </aside>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden flex fixed bottom-0 left-0 right-0 bg-[#1A1A1A] border-t border-zinc-800 z-50 px-2 pb-safe shadow-2xl">
          <Link href="/dashboard" className={`flex-1 flex flex-col items-center py-3 px-2 ${pathname === '/dashboard' ? 'text-green-400' : 'text-zinc-400'}`}>
            <LayoutDashboard className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-1">Panel</span>
          </Link>
          <Link href="/dashboard/create-event" className={`flex-1 flex flex-col items-center py-3 px-2 ${pathname === '/dashboard/create-event' ? 'text-green-400' : 'text-zinc-400'}`}>
            <PlusCircle className="w-6 h-6" />
            <span className="text-[10px] font-medium mt-1">Oluştur</span>
          </Link>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>
    </div>
  );
}
