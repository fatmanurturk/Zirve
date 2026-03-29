"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { Event } from "@/types";
import { useAuthStore } from "@/store/auth";

const categoryLabels: Record<string, string> = {
  hiking: "Yürüyüş",
  climbing: "Tırmanma",
  skiing: "Kayak",
  cycling: "Bisiklet",
  other: "Diğer",
};

const difficultyLabels: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
  expert: "Uzman",
};

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [motivation, setMotivation] = useState("");

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get<Event>(`/api/v1/events/${id}`);
        setEvent(res.data);
      } catch {
        router.push("/events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setApplying(true);
    setError("");
    try {
      await api.post(`/api/v1/events/${id}/apply`, {
        motivation_letter: motivation || null,
      });
      setApplied(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Başvuru sırasında hata oluştu.");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
  }

  if (!event) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Geri
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
            {categoryLabels[event.category] || event.category}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            {difficultyLabels[event.difficulty] || event.difficulty}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full ${
            event.status === "open"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {event.status === "open" ? "Açık" : event.status === "closed" ? "Kapalı" : "Tamamlandı"}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed">{event.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Konum</div>
            <div className="text-sm font-medium text-gray-700">📍 {event.location_name}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Başlangıç</div>
            <div className="text-sm font-medium text-gray-700">
              📅 {new Date(event.start_date).toLocaleDateString("tr-TR")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Bitiş</div>
            <div className="text-sm font-medium text-gray-700">
              📅 {new Date(event.end_date).toLocaleDateString("tr-TR")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="text-xs text-gray-400 mb-1">Max Gönüllü</div>
            <div className="text-sm font-medium text-gray-700">👥 {event.max_volunteers}</div>
          </div>
        </div>

        {event.requirements && typeof event.requirements === 'object' && Object.keys(event.requirements).length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Gerekli Ekipmanlar</h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(event.requirements).map((req: any, i) => (
                <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg text-xs font-medium border border-gray-200">
                  {req}
                </span>
              ))}
            </div>
          </div>
        )}

        {event.status === "open" && user?.role === "volunteer" && (
          <div className="border-t border-gray-100 pt-8">
            {applied ? (
              <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl text-sm font-medium">
                ✅ Başvurunuz alındı! Onay bekleyiniz.
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Başvur</h3>
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Motivasyon mektubunuz (opsiyonel)"
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="bg-green-700 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-green-800 transition disabled:opacity-50"
                >
                  {applying ? "Başvuruluyor..." : "Başvur"}
                </button>
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && event.status === "open" && (
          <div className="border-t border-gray-100 pt-8">
            <p className="text-gray-500 text-sm">
              Başvurmak için{" "}
              <a href="/login" className="text-green-700 hover:underline">
                giriş yapın
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}