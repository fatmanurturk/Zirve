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
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-green-500" />
        <p>Gönüllü verileri yükleniyor...</p>
      </div>
    );
  }

  if (!event) {
    return <div className="p-10 text-white">Etkinlik bulunamadı.</div>;
  }

  const pendingApps = applications.filter(a => a.status === "pending");
  const approvedApps = applications.filter(a => a.status === "approved");
  const rejectedApps = applications.filter(a => a.status === "rejected");

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto pb-20">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 font-medium">
        <ArrowLeft className="w-4 h-4" /> Panele Dön
      </Link>

      <div className="bg-[#1C1C1C] border border-zinc-800 rounded-3xl p-6 md:p-8 mb-10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl rounded-full" />
        
        <div className="flex items-center gap-3 mb-4">
           <span className="px-3 py-1 uppercase text-[10px] font-bold tracking-widest bg-zinc-800 text-zinc-400 rounded-lg border border-zinc-700">Etkinlik Detayı</span>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-4 tracking-tight drop-shadow-sm">{event.title}</h1>
        
        <div className="flex flex-wrap gap-6 text-sm font-medium text-zinc-400">
          <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-zinc-500" /> {new Date(event.start_date).toLocaleDateString("tr-TR")}</span>
          <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-zinc-500" /> {event.location_name}</span>
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-zinc-500" /> 
            {approvedApps.length} / {event.max_volunteers || "Sınırsız"} Onaylanan
          </span>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Gelen Başvurular ({applications.length})</h2>
      </div>

      {applications.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-dashed border-zinc-800 rounded-2xl p-16 text-center">
          <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Henüz başvuru yok</h3>
          <p className="text-zinc-500">Bu etkinlik için onay bekleyen hiçbir gönüllü bulunmuyor.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="bg-[#222] border border-zinc-800/80 rounded-2xl p-5 md:p-6 transition-all shadow-md flex flex-col md:flex-row gap-6">
              
              <div className="flex-1">
                <div className="flex items-center justify-between md:justify-start gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300 border border-zinc-700">
                      V
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Gönüllü #{app.volunteer_id.substring(0,6)}</h4>
                      <p className="text-xs text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(app.applied_at).toLocaleString("tr-TR").slice(0, 16)}</p>
                    </div>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="md:hidden">
                    {app.status === "approved" && <span className="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">ONAYLI</span>}
                    {app.status === "rejected" && <span className="px-3 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">RED</span>}
                    {app.status === "pending" && <span className="px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-bold rounded-full border border-orange-500/20">BEKLİYOR</span>}
                  </div>
                </div>

                <div className="bg-[#1C1C1C] border border-zinc-800 p-4 rounded-xl mt-4">
                  <p className="text-xs text-zinc-500 font-bold mb-1 uppercase tracking-wider">Motivasyon Mektubu</p>
                  <p className="text-sm text-zinc-300 italic leading-relaxed">
                    "{app.motivation_letter || "Gönüllü herhangi bir motivasyon metni girmedi."}"
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end justify-center min-w-[140px] pt-4 md:pt-0 md:border-l md:border-zinc-800 md:pl-6">
                 
                 <div className="hidden md:block mb-4 w-full text-right">
                    {app.status === "approved" && <span className="inline-block px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold rounded-full border border-green-500/20">ONAYLANDI</span>}
                    {app.status === "rejected" && <span className="inline-block px-3 py-1 bg-red-500/10 text-red-400 text-xs font-bold rounded-full border border-red-500/20">REDDEDİLDİ</span>}
                    {app.status === "pending" && <span className="inline-block px-3 py-1 bg-orange-500/10 text-orange-400 text-xs font-bold rounded-full border border-orange-500/20">ONAY BEKLİYOR</span>}
                 </div>

                 {app.status === "pending" ? (
                   <div className="flex gap-2 w-full">
                     <button
                       onClick={() => handleStatusUpdate(app.id, "rejected")}
                       disabled={actionLoading === app.id}
                       className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center font-bold text-sm transition-colors border border-red-500/20 disabled:opacity-50"
                     >
                       Reddet
                     </button>
                     <button
                       onClick={() => handleStatusUpdate(app.id, "approved")}
                       disabled={actionLoading === app.id}
                       className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg flex items-center justify-center font-bold text-sm transition-colors shadow-lg shadow-green-900/20 disabled:opacity-50"
                     >
                       Onayla
                     </button>
                   </div>
                 ) : (
                   <div className="w-full">
                      <button
                        onClick={() => handleStatusUpdate(app.id, "pending")}
                        disabled={actionLoading === app.id}
                        className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium text-xs transition-colors border border-zinc-700 disabled:opacity-50"
                      >
                        Kararı Geri Al (Pending)
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
