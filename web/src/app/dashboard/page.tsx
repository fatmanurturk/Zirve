"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import Link from "next/link";
import { Plus, Users, Calendar, MapPin, Inbox, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardHome() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await api.get("/api/v1/events/users/me/events");
      setEvents(res.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "open": return "bg-green-100 text-green-700 border-green-200";
      case "full": return "bg-orange-100 text-orange-700 border-orange-200";
      case "closed": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Organizasyon Paneli</h1>
          <p className="text-gray-500 text-lg">Etkinliklerini yönet ve gelen gönüllü başvurularını onayla.</p>
        </div>
        <Link 
          href="/dashboard/create-event" 
          className="flex items-center justify-center gap-2 bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex-shrink-0"
        >
          <Plus className="w-5 h-5" />
          Yeni Etkinlik Oluştur
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
           <div className="absolute -top-4 -right-4 w-24 h-24 bg-green-50 rounded-full blur-2xl pointer-events-none group-hover:bg-green-100 transition-colors" />
           <p className="text-gray-400 text-sm font-medium mb-3">Toplam Etkinlik</p>
           <h3 className="text-4xl font-bold text-gray-900">{events.length}</h3>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
           <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-50 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-100 transition-colors" />
           <p className="text-gray-400 text-sm font-medium mb-3">Aktif Etkinlikler</p>
           <h3 className="text-4xl font-bold text-gray-900">{events.filter(e => e.status === 'open').length}</h3>
        </div>
        <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
           <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-50 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-100 transition-colors" />
           <p className="text-gray-400 text-sm font-medium mb-3">Platform Etkileşimi</p>
           <h3 className="text-4xl font-bold text-gray-900">Güçlü</h3>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Tüm Etkinlikler</h2>
        
        {loading ? (
          <div className="text-gray-500 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-gray-200 rounded-full animate-spin" />
            Yükleniyor...
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-16 text-center">
            <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Henüz etkinlik yok</h3>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">Sistemde oluşturduğunuz hiçbir etkinlik bulunamadı. Hemen yeni bir etkinlik ekleyerek başlayın.</p>
            <Link href="/dashboard/create-event" className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 font-bold bg-green-50 px-4 py-2 rounded-lg transition-colors">
              Hemen oluştur <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map((event) => (
              <div 
                key={event.id} 
                onClick={() => router.push(`/dashboard/applications/${event.id}`)}
                className="bg-white border border-gray-100 rounded-2xl p-6 hover:border-green-200 hover:bg-green-50/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group cursor-pointer shadow-sm hover:shadow-md" 
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`px-3 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full border ${getStatusColor(event.status)}`}>
                      {event.status === "open" ? "Açık" : event.status}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                      {event.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">{event.title}</h3>
                  <div className="flex flex-wrap items-center gap-5 text-sm font-medium text-gray-500">
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /> {new Date(event.start_date).toLocaleDateString("tr-TR")}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {event.location_name || "Belirtilmedi"}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" /> {event.max_volunteers ? `${event.max_volunteers} Kişi` : "Sınırsız"}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 md:border-l md:border-gray-100 md:pl-8">
                  <div className="hidden md:block text-right pr-4">
                     <p className="text-sm text-gray-700 font-bold mb-0.5">Başvurular</p>
                     <p className="text-xs text-green-700 font-bold group-hover:translate-x-1 transition-transform inline-block">Yönet & İncele &rarr;</p>
                  </div>
                  <button className="w-full md:w-auto px-6 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl transition-colors border border-gray-100 shadow-sm whitespace-nowrap flex items-center justify-center gap-2">
                    Detay Gör
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
