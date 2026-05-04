"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, CheckCircle, XCircle, Clock, MapPin, Calendar, Users, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ApplicationsReview() {
  const params = useParams();
  const eventId = params.eventId as string;
  const router = useRouter();

  const [event, setEvent] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      const [eventRes, appsRes] = await Promise.all([
        api.get(`/api/v1/events/${eventId}`),
        api.get(`/api/v1/events/${eventId}/applications`)
      ]);
      setEvent(eventRes.data);
      setApplications(appsRes.data.items);
    } catch (err) {
      console.error(err);
      alert("Bilgiler alınırken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: "approved" | "rejected" | "pending") => {
    setActionLoading(applicationId);
    try {
      await api.put(`/api/v1/events/${eventId}/applications/${applicationId}`, {
        status: newStatus,
      });
      // Update local state
      setApplications(prev => prev.map(app =>
        app.id === applicationId ? { ...app, status: newStatus } : app
      ));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Durum güncellenemedi.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-green-700" />
        <p>Gönüllü verileri yükleniyor...</p>
      </div>
    );
  }

  if (!event) {
    return <div className="p-10 text-gray-900">Etkinlik bulunamadı.</div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-20">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Geri Dön
      </button>

      <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 mb-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 blur-3xl rounded-full" />

        <div className="flex items-center gap-3 mb-4">
          <span className="px-3 py-1 uppercase text-[10px] font-bold tracking-widest bg-gray-50 text-gray-500 rounded-lg border border-gray-100">Etkinlik Detayı</span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">{event.title}</h1>

        <div className="flex flex-wrap gap-6 text-sm font-medium text-gray-500">
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" /> {new Date(event.start_date).toLocaleDateString("tr-TR")}</span>
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> {event.location_name}</span>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            {applications.filter(a => a.status === 'approved').length} / {event.max_volunteers || "Sınırsız"} Onaylanan
          </span>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gelen Başvurular ({applications.length})</h2>
      </div>

      {applications.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-3xl p-16 text-center">
          <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Henüz başvuru yok</h3>
          <p className="text-gray-500">Bu etkinlik için onay bekleyen hiçbir gönüllü bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 transition-all shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md">

              <div className="flex-1">
                <div className="flex items-center justify-between md:justify-start gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/volunteers/${app.volunteer_id}`} className="hover:opacity-80 transition">
                      <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center font-bold text-green-700 border border-green-100 overflow-hidden shadow-sm">
                        {app.volunteer_avatar_url ? (
                          <img src={app.volunteer_avatar_url} className="w-full h-full object-cover" />
                        ) : (
                          "V"
                        )}
                      </div>
                    </Link>
                    <div>
                      <Link href={`/volunteers/${app.volunteer_id}`} className="hover:text-green-700 transition-colors">
                        <h4 className="font-bold text-gray-900 text-base">
                          {app.volunteer_name || `Gönüllü #${app.volunteer_id.substring(0, 6)}`}
                        </h4>
                      </Link>
                      <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(app.applied_at).toLocaleString("tr-TR").slice(0, 16)}</p>
                    </div>
                  </div>

                  <div className="md:hidden">
                    {app.status === "approved" && <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">ONAYLI</span>}
                    {app.status === "rejected" && <span className="px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">RED</span>}
                    {app.status === "pending" && <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200">BEKLİYOR</span>}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl mt-4">
                  <p className="text-xs text-gray-400 font-bold mb-1 uppercase tracking-wider">Motivasyon Mektubu</p>
                  <p className="text-sm text-gray-600 italic leading-relaxed">
                    "{app.motivation_letter || "Gönüllü herhangi bir motivasyon metni girmedi."}"
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-center min-w-[160px] pt-4 md:pt-0 md:border-l md:border-gray-100 md:pl-6">

                <div className="hidden md:block mb-4 w-full text-right">
                  {app.status === "approved" && <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">ONAYLANDI</span>}
                  {app.status === "rejected" && <span className="inline-block px-3 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded-full border border-red-200">REDDEDİLDİ</span>}
                  {app.status === "pending" && <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-bold rounded-full border border-orange-200">ONAY BEKLİYOR</span>}
                </div>

                {app.status === "pending" ? (
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => handleStatusUpdate(app.id, "rejected")}
                      disabled={actionLoading === app.id}
                      className="flex-1 py-2.5 bg-white hover:bg-red-50 text-red-600 rounded-lg flex items-center justify-center font-bold text-sm transition-colors border border-red-100 disabled:opacity-50"
                    >
                      Reddet
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(app.id, "approved")}
                      disabled={actionLoading === app.id}
                      className="flex-1 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg flex items-center justify-center font-bold text-sm transition-colors shadow-sm disabled:opacity-50"
                    >
                      Onayla
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <button
                      onClick={() => handleStatusUpdate(app.id, "pending")}
                      disabled={actionLoading === app.id}
                      className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg font-bold text-xs transition-colors border border-gray-100 disabled:opacity-50"
                    >
                      Kararı Geri Al (Bekleyen)
                    </button>
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
