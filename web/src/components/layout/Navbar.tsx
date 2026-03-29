"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { Mountain } from "lucide-react";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="bg-zinc-950 border-b border-zinc-800 px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-zinc-100 hover:text-green-500 transition-colors">
          <Mountain className="w-6 h-6 text-green-600" />
          Zirve
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/events" className="text-zinc-400 hover:text-green-500 transition-colors text-sm font-medium">
            Etkinlikler
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/profile" className="text-zinc-400 hover:text-green-500 transition-colors text-sm font-medium">
                Profilim
              </Link>
              {user?.role === "volunteer" && (
                <Link href="/applications" className="text-zinc-400 hover:text-green-500 transition-colors text-sm font-medium">
                  Başvurularım
                </Link>
              )}
              {user?.role === "organizer" && (
                <Link href="/dashboard" className="text-zinc-400 hover:text-green-500 transition-colors text-sm font-medium">
                  Panel
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm font-medium text-red-400 hover:text-red-500 transition-colors"
              >
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-zinc-400 hover:text-green-500 transition-colors text-sm font-medium">
                Giriş
              </Link>
              <Link
                href="/register"
                className="bg-green-700 text-white text-sm font-medium px-5 py-2 rounded-full hover:bg-green-600 transition-colors shadow-lg shadow-green-900/20"
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