"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import api from "@/lib/api";
import { Organization } from "@/types";

export default function ClubSetupPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [isUpdate, setIsUpdate] = useState(false);
  const [error, setError] = useState("");
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    logo_url: "",
    website: "",
    city: "",
    category: "",
    tags_string: "",
  });

  useEffect(() => {
    if (user && user.role !== "organizer") {
      router.push("/events");
      return;
    }

    const fetchOrg = async () => {
      try {
        const res = await api.get("/api/v1/organizations/me");
        if (res.data) {
          const org = res.data as Organization;
          setForm({
            name: org.name || "",
            description: org.description || "",
            logo_url: org.logo_url || "",
            website: org.website || "",
            city: org.city || "",
            category: org.category || "",
            tags_string: org.tags ? org.tags.join(", ") : "",
          });
          setIsUpdate(true);
        }
      } catch (err: any) {
        // 404 is expected for new organizers
        if (err.response?.status !== 404) {
          console.error("Error fetching organization:", err);
        }
      } finally {
        setIsFetching(false);
      }
    };

    fetchOrg();
  }, [user, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const payload = {
      name: form.name,
      description: form.description,
      logo_url: form.logo_url,
      website: form.website,
      city: form.city,
      category: form.category,
      tags: form.tags_string.split(",").map(t => t.trim()).filter(t => t !== ""),
    };

    try {
      if (isUpdate) {
        await api.put("/api/v1/organizations/me", payload);
      } else {
        await api.post("/api/v1/organizations/", payload);
      }
      router.push("/profile");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isUpdate ? "Kulüp Ayarlarını Düzenle" : "Kulübünü Oluştur"}
            </h1>
            <p className="text-gray-500">
              {isUpdate 
                ? "Kulüp bilgilerini güncelleyerek gönüllülere daha iyi ulaşabilirsin." 
                : "Etkinliklerini düzenlemek ve yönetmek için kulüp bilgilerini tanımlamalısın."}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kulüp Adı *
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: Zirve Dağcılık Kulübü"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şehir
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Örn: İstanbul"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Seçiniz</option>
                  <option value="mountaineering">Dağcılık</option>
                  <option value="trekking">Doğa Yürüyüşü</option>
                  <option value="environment">Çevre Koruma</option>
                  <option value="search_rescue">Arama Kurtarma</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kulüp Açıklaması
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Kulübünüzün amacı ve faaliyetleri hakkında bilgi verin..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website URL
                </label>
                <input
                  type="url"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://www.kulup.org"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logo URL
                </label>
                <input
                  type="text"
                  name="logo_url"
                  value={form.logo_url}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="https://image-url.com/logo.png"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Etiketler (virgülle ayırın)
                </label>
                <input
                  type="text"
                  name="tags_string"
                  value={form.tags_string}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="zirve, tırmanış, doğa, macera"
                />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-green-700 text-white py-3 rounded-xl font-semibold hover:bg-green-800 transition disabled:opacity-50"
              >
                {isLoading ? "Kaydediliyor..." : (isUpdate ? "Değişiklikleri Kaydet" : "Kulübü Kur")}
              </button>
              
              {isUpdate && (
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition"
                >
                  İptal
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
