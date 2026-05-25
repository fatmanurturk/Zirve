"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      router.push("/events");
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { detail?: unknown } } };
      const detail = axiosError.response?.data?.detail;
      const status = axiosError.response?.status;

      if (status === 401 || (typeof detail === "string" && detail.toLowerCase().includes("incorrect"))) {
        setError("E-posta veya şifre hatalı. Lütfen tekrar deneyin.");
      } else if (typeof detail === "string" && detail) {
        setError(detail);
      } else if (status === 0 || !axiosError.response) {
        setError("Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.");
      } else {
        setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Giriş Yap</h1>
        <p className="text-gray-500 mb-8">
          Hesabın yok mu?{" "}
          <Link href="/register" className="text-green-700 hover:underline">
            Kayıt Ol
          </Link>
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
            />
          </div>
          <div className="flex justify-end">
            <Link 
              href="/forgot-password" 
              className="text-xs text-gray-500 hover:text-green-700 font-medium transition"
            >
              Şifremi Unuttum
            </Link>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
          >
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}