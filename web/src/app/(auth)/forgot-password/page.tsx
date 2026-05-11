"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [debugToken, setDebugToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/api/v1/auth/forgot-password", { email });
      setMessage(res.data.message);
      if (res.data.debug_token) {
        setDebugToken(res.data.debug_token);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Şifremi Unuttum</h1>
        <p className="text-gray-500 mb-8 text-sm">
          Hesabına bağlı e-posta adresini gir, sana şifre sıfırlama talimatlarını gönderelim.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {message && !debugToken && (
          <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-6 border border-green-100 flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {message}
          </div>
        )}

        {debugToken && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-xs font-bold text-amber-800 mb-1 uppercase tracking-wider">⚠️ SMTP HATASI / TEST MODU:</p>
            <p className="text-xs text-amber-700 mb-3">SMTP ayarları hatalı olduğu için e-posta gönderilemedi. Test için aşağıdaki linki kullanabilirsin:</p>
            <Link 
              href={`/reset-password?token=${debugToken}`}
              className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 px-3 py-2 rounded block text-center font-medium transition"
            >
              Şifreyi Sıfırla (Geliştirici Linki)
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Adresi
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="ornek@mail.com"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {isLoading ? "Gönderiliyor..." : "Sıfırlama Linki Gönder"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-green-700 font-medium">
            ← Giriş Sayfasına Dön
          </Link>
        </div>
      </div>
    </div>
  );
}
