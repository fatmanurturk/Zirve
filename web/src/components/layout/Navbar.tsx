"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-green-700">
          ⛰ Zirve
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/events" className="text-gray-600 hover:text-green-700 text-sm">
            Etkinlikler
          </Link>

          {isAuthenticated ? (
            <>
              <Link href="/profile" className="text-gray-600 hover:text-green-700 text-sm">
                Profilim
              </Link>
              {user?.role === "volunteer" && (
                <Link href="/applications" className="text-gray-600 hover:text-green-700 text-sm">
                  Başvurularım
                </Link>
              )}
              {user?.role === "organizer" && (
                <Link href="/dashboard" className="text-gray-600 hover:text-green-700 text-sm">
                  Panel
                </Link>
              )}
              <button
                onClick={logout}
                className="text-sm text-red-500 hover:text-red-700"
              >
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-green-700 text-sm">
                Giriş
              </Link>
              <Link
                href="/register"
                className="bg-green-700 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-800"
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