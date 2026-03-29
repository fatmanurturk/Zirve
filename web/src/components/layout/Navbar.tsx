"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Mountain } from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 hover:text-emerald-600 transition-colors">
          <Mountain className="w-6 h-6 text-emerald-600" />
          Zirve
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/events" className="text-slate-600 hover:text-emerald-600 transition-colors text-sm font-medium">
            Etkinlikler
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/profile" className="text-slate-600 hover:text-emerald-600 transition-colors text-sm font-medium">
                Profilim
              </Link>
              {user?.role === "volunteer" && (
                <Link href="/applications" className="text-slate-600 hover:text-emerald-600 transition-colors text-sm font-medium">
                  Başvurularım
                </Link>
              )}
              {user?.role === "organizer" && (
                <Link href="/dashboard" className="text-slate-600 hover:text-emerald-600 transition-colors text-sm font-medium">
                  Panel
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
              >
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-emerald-600 transition-colors text-sm font-medium">
                Giriş
              </Link>
              <Link
                href="/register"
                className="bg-emerald-600 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}