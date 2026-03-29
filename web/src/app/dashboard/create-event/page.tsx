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
          <h1 className="text-3xl font-bold text-white mb-2">Yeni Etkinlik Oluştur</h1>
          <p className="text-zinc-400">Doğa tutkunları için benzersiz bir gönüllülük deneyimi yarat.</p>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors bg-zinc-800 px-4 py-2 rounded-lg">
          İptal Et
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#1C1C1C] border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl">
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Etkinlik Başlığı <span className="text-red-500">*</span></label>
              <input 
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all"
                placeholder="Örn: Kaz Dağları Çevre Temizliği"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2">Detaylı Açıklama</label>
              <textarea 
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all resize-none"
                placeholder="Gönüllüleri neler bekliyor? Neler yapılacak? Açıklayın..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5"><Tag className="w-4 h-4 text-green-500" /> Kategori <span className="text-red-500">*</span></label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all appearance-none"
              >
                <option value="hiking">Yürüyüş (Hiking)</option>
                <option value="climbing">Tırmanış (Climbing)</option>
                <option value="environment">Çevre & Doğa</option>
                <option value="rescue">Arama Kurtarma</option>
                <option value="other">Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5">Zorluk Derecesi <span className="text-red-500">*</span></label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/50 transition-all appearance-none"
              >
                <option value="easy">Kolay (Herkes için)</option>
                <option value="medium">Orta (Deneyim Gerektirir)</option>
                <option value="hard">Zor (Gelişmiş Düzey)</option>
                <option value="expert">Uzman (Profesyonel Eğitim Gerektirir)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Başlangıç Zamanı <span className="text-red-500">*</span></label>
              <input 
                type="datetime-local"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
                required
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5"><Calendar className="w-4 h-4 text-blue-500" /> Bitiş Zamanı <span className="text-red-500">*</span></label>
              <input 
                type="datetime-local"
                name="end_date"
                value={formData.end_date}
                onChange={handleChange}
                required
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-red-400" /> Konum / Adres <span className="text-red-500">*</span></label>
              <input 
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                required
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all"
                placeholder="Örn: Balıkesir, İda Dağı Etekleri..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-orange-400" /> Kontenjan Sınırı</label>
              <input 
                type="number"
                name="max_volunteers"
                value={formData.max_volunteers}
                onChange={handleChange}
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
                placeholder="Örn: 20 (Boş bırakılırsa sınırsız)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Gerekli Ekipmanlar</label>
              <input 
                name="requirements_text"
                value={formData.requirements_text}
                onChange={handleChange}
                className="w-full bg-[#141414] border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                placeholder="Virgülle ayırarak yazın (Çadır, Uyku Tulumu...)"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-green-900/30 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Oluşturuluyor..." : "Etkinliği Yayınla"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
