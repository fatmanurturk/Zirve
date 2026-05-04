"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Calendar, MapPin, Tag, Users, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateEvent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "hiking",
    difficulty: "easy",
    location_name: "",
    start_date: "",
    end_date: "",
    max_volunteers: "",
    requirements_text: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Parse requirements text into JSON dict
      const reqsList = formData.requirements_text.split(",").map(r => r.trim()).filter(r => r.length > 0);
      const requirements = reqsList.reduce((acc, curr, idx) => {
        acc[`item_${idx}`] = curr;
        return acc;
      }, {} as Record<string, string>);

      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        difficulty: formData.difficulty,
        location_name: formData.location_name,
        // Convert datetime-local to ISO strings
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        max_volunteers: formData.max_volunteers ? parseInt(formData.max_volunteers) : null,
        requirements: Object.keys(requirements).length > 0 ? requirements : null,
      };

      await api.post("/api/v1/events/", payload);
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Etkinlik oluşturulurken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Yeni Etkinlik Oluştur</h1>
          <p className="text-gray-500">Doğa tutkunları için benzersiz bir gönüllülük deneyimi yarat.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-100 px-4 py-2 rounded-xl shadow-sm">
          İptal Et
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-3xl p-6 md:p-10 shadow-sm">
        {error && (
          <div className="mb-8 bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2.5">Etkinlik Başlığı <span className="text-red-500">*</span></label>
              <input 
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-inner"
                placeholder="Örn: Kaz Dağları Çevre Temizliği"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2.5">Detaylı Açıklama</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-inner resize-none"
                placeholder="Gönüllüleri neler bekliyor? Neler yapılacak? Açıklayın..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5"><Tag className="w-4 h-4 text-green-600" /> Kategori <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="hiking">Yürüyüş (Hiking)</option>
                  <option value="climbing">Tırmanış (Climbing)</option>
                  <option value="environment">Çevre & Doğa</option>
                  <option value="rescue">Arama Kurtarma</option>
                  <option value="other">Diğer</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ↓
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5">Zorluk Derecesi <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="easy">Kolay (Herkes için)</option>
                  <option value="medium">Orta (Deneyim Gerektirir)</option>
                  <option value="hard">Zor (Gelişmiş Düzey)</option>
                  <option value="expert">Uzman (Profesyonel Eğitim Gerektirir)</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ↓
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-600" /> Başlangıç Zamanı <span className="text-red-500">*</span></label>
              <input 
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-600" /> Bitiş Zamanı <span className="text-red-500">*</span></label>
              <input 
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-inner"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-500" /> Konum / Adres <span className="text-red-500">*</span></label>
              <input 
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-inner"
                placeholder="Örn: Balıkesir, İda Dağı Etekleri..."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2.5 flex items-center gap-1.5"><Users className="w-4 h-4 text-orange-500" /> Kontenjan Sınırı</label>
              <input 
                type="number"
                name="max_volunteers"
                value={formData.max_volunteers}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
                placeholder="Örn: 20 (Boş bırakılırsa sınırsız)"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2.5">Gerekli Ekipmanlar</label>
              <input 
                name="requirements_text"
                value={formData.requirements_text}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300 transition-all shadow-inner"
                placeholder="Virgülle ayırarak yazın (Çadır, Uyku Tulumu...)"
              />
            </div>
          </div>

          <div className="pt-8 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-700 hover:bg-green-800 text-white font-bold py-4 px-10 rounded-2xl shadow-lg shadow-green-900/10 transition-all disabled:opacity-50 flex items-center gap-2 text-lg"
            >
              {loading && <Loader2 className="w-6 h-6 animate-spin" />}
              {loading ? "Oluşturuluyor..." : "Etkinliği Yayınla"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
