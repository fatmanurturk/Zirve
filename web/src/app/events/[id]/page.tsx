"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Event, Application } from "@/types";
import { useAuthStore } from "@/store/auth";
import { Building2, User, ChevronRight, CheckCircle2, XCircle, Clock } from "lucide-react";

const categoryLabels: Record<string, string> = {
  hiking: "Yürüyüş",
  climbing: "Tırmanma",
  skiing: "Kayak",
  cycling: "Bisiklet",
  environment: "Çevre & Doğa",
  rescue: "Arama Kurtarma",
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
  
  // Organizer only states
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  const isCreator = user?.id === event?.created_by;

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

  useEffect(() => {
    if (isCreator) {
      fetchApplicants();
    }
  }, [isCreator]);

  const fetchApplicants = async () => {
    setLoadingApplicants(true);
    try {
      const res = await api.get(`/api/v1/events/${id}/applications`);
      setApplicants(res.data.items || []);
    } catch (err) {
      console.error("Başvurular yüklenemedi");
    } finally {
      setLoadingApplicants(false);
    }
  };

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

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      await api.put(`/api/v1/events/${id}/applications/${appId}`, {
        status: status,
      });
      fetchApplicants();
    } catch (err) {
      alert("Durum güncellenirken hata oluştu.");
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const clubInitials = event.organization_name
    ? event.organization_name.substring(0, 2).toUpperCase()
    : "ZV";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Geri
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            {categoryLabels[event.category] || event.category}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
            {difficultyLabels[event.difficulty] || event.difficulty}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            event.status === "open"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}>
            {event.status === "open" ? "Açık" : event.status === "closed" ? "Kapalı" : "Tamamlandı"}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">{event.description}</p>

        {/* Kulüp & Organizatör Kartı */}
        {event.organization_id && (
          <Link
            href={`/clubs/${event.organization_id}`}
            className="flex items-center justify-between gap-4 mb-8 p-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-100 flex items-center justify-center shadow-sm">
                {event.organization_logo_url ? (
                  <img
                    src={event.organization_logo_url}
                    alt={event.organization_name || "Kulüp"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-700 font-bold text-sm">{clubInitials}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Düzenleyen Kulüp</span>
                </div>
                <p className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {event.organization_name || "Bilinmeyen Kulüp"}
                </p>
                {event.organizer_name && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{event.organizer_name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span className="hidden sm:block">Kulüp Sayfası</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Konum</div>
            <div className="text-sm font-bold text-gray-700 truncate">📍 {event.location_name}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Başlangıç</div>
            <div className="text-sm font-bold text-gray-700">
              📅 {new Date(event.start_date).toLocaleDateString("tr-TR")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Bitiş</div>
            <div className="text-sm font-bold text-gray-700">
              📅 {new Date(event.end_date).toLocaleDateString("tr-TR")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Max Gönüllü</div>
            <div className="text-sm font-bold text-gray-700">👥 {event.max_volunteers}</div>
          </div>
        </div>

        {event.status === "open" && user?.role === "volunteer" && !isCreator && (
          <div className="border-t border-gray-100 pt-8">
            {applied ? (
              <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl text-sm font-medium border border-green-100">
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
                  className="bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-green-800 transition disabled:opacity-50 shadow-sm"
                >
                  {applying ? "Başvuruluyor..." : "Etkinliğe Başvur"}
                </button>
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && event.status === "open" && (
          <div className="border-t border-gray-100 pt-8">
            <p className="text-gray-500 text-sm">
              Başvurmak için{" "}
              <a href="/login" className="text-green-700 font-bold hover:underline">
                giriş yapın
              </a>
              .
            </p>
          </div>
        )}
      </div>

      {/* Organizatör için Başvurular Listesi */}
      {isCreator && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Gelen Başvurular ({applicants.length})</h2>
            {loadingApplicants && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-green-700" />}
          </div>

          <div className="space-y-4">
            {applicants.length === 0 && !loadingApplicants ? (
              <p className="text-center py-10 text-gray-400 text-sm italic">Henüz başvuru bulunmuyor.</p>
            ) : (
              applicants.map((app) => (
                <div key={app.id} className="border border-gray-50 rounded-2xl p-5 hover:bg-gray-50 transition shadow-sm bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Link href={`/volunteers/${app.volunteer_id}`} className="hover:opacity-80 transition">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl overflow-hidden border-2 border-white shadow-sm">
                          {app.volunteer_avatar_url ? (
                            <img src={app.volunteer_avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            "👤"
                          )}
                        </div>
                      </Link>
                      <div>
                        <Link href={`/volunteers/${app.volunteer_id}`} className="font-bold text-gray-900 hover:text-green-700 transition">
                          {app.volunteer_name || "Gönüllü"}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(app.applied_at).toLocaleDateString("tr-TR")} tarihinde başvurdu
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                        app.status === "approved" ? "bg-green-100 text-green-700" :
                        app.status === "rejected" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {app.status === "pending" ? "Beklemede" : app.status === "approved" ? "Onaylandı" : "Reddedildi"}
                      </span>
                      
                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleUpdateStatus(app.id, "approved")}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                            title="Onayla"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(app.id, "rejected")}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                            title="Reddet"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {app.motivation_letter && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-xl">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Motivasyon Mektubu</p>
                      <p className="text-sm text-gray-600 leading-relaxed italic">"{app.motivation_letter}"</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}