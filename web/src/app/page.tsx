"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Mountain, MapPin, Calendar, Users, Droplets, Snowflake, 
  MessageSquare, TreePine, Flame, Loader2, ArrowRight
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const categoryIcons: any = {
  hiking: <Mountain className="w-16 h-16 text-green-800 opacity-20 absolute -bottom-4 -right-4" />,
  climbing: <Mountain className="w-16 h-16 text-orange-800 opacity-20 absolute -bottom-4 -right-4" />,
  environment: <TreePine className="w-16 h-16 text-emerald-800 opacity-20 absolute -bottom-4 -right-4" />,
  rescue: <Users className="w-16 h-16 text-red-800 opacity-20 absolute -bottom-4 -right-4" />,
  other: <Flame className="w-16 h-16 text-purple-800 opacity-20 absolute -bottom-4 -right-4" />,
};

const categoryLabels: any = {
  hiking: "Yürüyüş",
  climbing: "Tırmanış",
  environment: "Çevre & Doğa",
  rescue: "Arama Kurtarma",
  other: "Diğer"
};

const categoryEmojis: any = {
  hiking: "⛰️",
  climbing: "🧗",
  environment: "🌲",
  rescue: "🚁",
  other: "🔥"
};

const categoryBgColors: any = {
  hiking: "bg-[#D1E8D1]",
  climbing: "bg-[#FFE8D1]",
  environment: "bg-[#D1E8D1]",
  rescue: "bg-[#FFD1D1]",
  other: "bg-[#E5D9FF]",
};

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  
  const [stats, setStats] = useState({ active_volunteers: 248, upcoming_events: 34, cities_count: 12 });
  const [events, setEvents] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ total_impact_score: 0 });
  const [loading, setLoading] = useState(true);

  // Volunteer panel state
  const [activeTab, setActiveTab] = useState<"active" | "pending" | "history">("active");

  useEffect(() => {
    loadHomepageData();
  }, [isAuthenticated]);

  const loadHomepageData = async () => {
    try {
      setLoading(true);
      // Fetch public stats & events
      const [statsRes, eventsRes] = await Promise.all([
        api.get("/api/v1/stats").catch(() => null),
        api.get("/api/v1/events/?status=open&limit=3").catch(() => null)
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (eventsRes?.data) setEvents(eventsRes.data.items || []);

      // If user is logged in, fetch personal data
      if (isAuthenticated) {
        const [appsRes, badgesRes, myStatsRes] = await Promise.all([
          api.get("/api/v1/users/me/applications").catch(() => null),
          api.get("/api/v1/badges/users/me").catch(() => null),
          api.get("/api/v1/volunteers/me/stats").catch(() => null)
        ]);
        if (appsRes?.data) setApplications(appsRes.data.items || []);
        if (badgesRes?.data) setBadges(badgesRes.data);
        if (myStatsRes?.data) setUserStats(myStatsRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredApps = applications.filter(app => {
    if (activeTab === "active") return app.status === "approved";
    if (activeTab === "pending") return app.status === "pending";
    if (activeTab === "history") return app.status === "rejected" || app.status === "completed";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1c1c1c] flex flex-col items-center justify-center text-zinc-400">
        <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
        <p className="font-medium animate-pulse">Zirve platformu yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-zinc-200 pb-20 font-sans">
      
      {/* 1. Hero Seçeneği */}
      <section className="px-6 pt-6 pb-10 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-[#2A5944] text-white p-10 md:p-14 shadow-xl">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#326950] rounded-full translate-x-1/3 -translate-y-1/3 opacity-80" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium border border-white/20 mb-6">
              Doğa Sporları & Gönüllülük
            </span>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
              Zirveye birlikte<br />ulaşalım
            </h1>
            <p className="text-lg md:text-xl text-green-50 mb-10 max-w-xl leading-relaxed opacity-90">
              Doğa sporları etkinliklerini keşfet, gönüllü ekiplere katıl ve toplulukla deneyimlerini paylaş.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-14">
              <Link href="#events" className="px-6 py-3 rounded-full border border-white/30 hover:bg-white/10 transition-colors font-medium backdrop-blur-sm">
                Etkinliklere göz at
              </Link>
              {!isAuthenticated && (
                <Link href="/register" className="px-6 py-3 rounded-full bg-white/10 border border-white/30 hover:bg-white/20 transition-colors font-medium backdrop-blur-sm">
                  Gönüllü ol
                </Link>
              )}
            </div>

            <div className="flex gap-10">
              <div>
                <p className="text-3xl font-bold mb-1">{stats.active_volunteers}</p>
                <p className="text-sm text-green-100/70">Aktif gönüllü</p>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{stats.upcoming_events}</p>
                <p className="text-sm text-green-100/70">Yaklaşan etkinlik</p>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{stats.cities_count}</p>
                <p className="text-sm text-green-100/70">Farklı Şehir</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Yaklaşan Etkinlikler */}
      <section id="events" className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Yaklaşan etkinlikler</h2>
            <p className="text-zinc-400">Yeni maceraları keşfedin ve kontenjanlar dolmadan katılın</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-[#262626] border border-dashed border-zinc-700 rounded-2xl p-10 text-center text-zinc-400">
            Yakında yeni etkinlikler oluşturulacak. Lütfen takipte kalın!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event) => (
              <div 
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                className="rounded-2xl overflow-hidden bg-[#262626] border border-zinc-800/60 shadow-lg group hover:border-zinc-700 hover:bg-[#2C2C2C] transition-all flex flex-col cursor-pointer"
              >
                <div className={`h-32 ${categoryBgColors[event.category] || "bg-zinc-800"} flex items-center justify-center relative overflow-hidden transition-colors`}>
                   {categoryIcons[event.category] || categoryIcons["other"]}
                   <span className="text-6xl drop-shadow-sm z-10 relative group-hover:scale-110 transition-transform">
                     {categoryEmojis[event.category] || "🏕️"}
                   </span>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-auto">
                    <span className="inline-block px-3 py-1 rounded-full bg-zinc-800 text-xs font-semibold text-zinc-300 mb-3 border border-zinc-700">
                      {categoryLabels[event.category] || event.category}
                    </span>
                    <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{event.title}</h3>
                    <p className="text-zinc-400 text-sm flex items-center gap-1.5 mb-1"><Calendar className="w-4 h-4 text-zinc-500" /> {new Date(event.start_date).toLocaleDateString("tr-TR")}</p>
                    <p className="text-zinc-400 text-sm mb-6 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-zinc-500" /> {event.location_name || "Konum Gizli"}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800">
                    <p className="text-sm text-zinc-400">
                      {event.max_volunteers ? <><span className="text-green-500 font-medium">{event.max_volunteers}</span> yer kaldı</> : "Sınırsız Katılım"}
                    </p>
                    <button className="px-5 py-2 rounded-lg bg-zinc-800/80 group-hover:bg-green-700 group-hover:border-green-600 text-white text-sm font-bold border border-zinc-700 transition-colors shadow-sm">
                      Detay / Katıl
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Gönüllü Paneli */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-1">Gönüllü paneli</h2>
        <p className="text-zinc-400 mb-6">Katıldıkların, bekleyenler ve geçmiş etkinliklerin</p>
        
        <div className="bg-[#2A2A2A] border border-zinc-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden min-h-[300px]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
          
          {!isAuthenticated ? (
            <div className="absolute inset-0 z-20 backdrop-blur-md bg-[#2A2A2A]/80 flex flex-col items-center justify-center rounded-2xl p-6 text-center">
               <h3 className="text-xl font-bold text-white mb-3">Paneli görmek için giriş yapın</h3>
               <p className="text-zinc-400 mb-6 max-w-sm">Gönüllü panelindeki başvurularınızı ve etkinlik geçmişinizi yönetmek için hesabınıza erişin.</p>
               <Link href="/login" className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-xl text-white font-bold transition-colors shadow-lg shadow-green-900/30">
                 Giriş Yap
               </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8 relative z-10 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex bg-[#1c1c1c] rounded-xl p-1 border border-zinc-800/50 min-w-max">
                  <button onClick={() => setActiveTab("active")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'active' ? 'bg-[#2A2A2A] text-white shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}`}>Onaylı ({applications.filter(a => a.status === 'approved').length})</button>
                  <button onClick={() => setActiveTab("pending")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'pending' ? 'bg-[#2A2A2A] text-white shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}`}>Bekleyen ({applications.filter(a => a.status === 'pending').length})</button>
                  <button onClick={() => setActiveTab("history")} className={`px-5 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'bg-[#2A2A2A] text-white shadow-sm border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'}`}>Geçmiş ({applications.filter(a => a.status === 'rejected' || a.status === 'completed').length})</button>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                {filteredApps.length === 0 ? (
                  <div className="text-center py-10 text-zinc-500 font-medium">Bu sekmede herhangi bir başvuru bulunmamaktadır.</div>
                ) : (
                  filteredApps.map((app, index) => (
                    <div key={app.id}>
                      <div onClick={() => router.push(`/events/${app.event_id}`)} className="flex items-center justify-between p-4 rounded-xl hover:bg-[#333] border border-transparent hover:border-zinc-700/50 transition-colors group cursor-pointer">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full ${app.status === 'approved' ? 'bg-[#D1E8D1] text-green-900' : app.status === 'pending' ? 'bg-[#FFE8D1] text-orange-900' : 'bg-red-100 text-red-900'} font-bold flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform`}>
                            {app.status === 'approved' ? 'OK' : app.status === 'pending' ? '?' : 'X'}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base">Etkinlik Başvurusu</h4>
                            <p className="text-sm text-zinc-400 mt-0.5"><span className="text-zinc-300 font-medium">{new Date(app.applied_at).toLocaleDateString('tr-TR')}</span> tarihinde başvuruldu</p>
                          </div>
                        </div>
                        <div className={`px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                          app.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          app.status === "pending" ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                          {app.status.toUpperCase()}
                        </div>
                      </div>
                      {index < filteredApps.length - 1 && <div className="h-px bg-zinc-800/50 w-full mx-auto" />}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 4. Puan & Rozetler */}
      <section className="px-6 py-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          
          {/* Toplam Puan */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-8">Toplam puan</h2>
            <div className="bg-[#2A2A2A] p-7 rounded-2xl border border-zinc-800/60 shadow-xl relative overflow-hidden min-h-[240px] flex flex-col justify-center">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {!isAuthenticated ? (
                <div className="relative z-10 text-center">
                  <p className="text-zinc-400 mb-4">Gönüllü puanlarınızı görmek için giriş yapın.</p>
                </div>
              ) : (
                <>
                  <p className="text-zinc-400 text-sm mb-1 font-medium relative z-10">Zirve puanı</p>
                  <h3 className="text-5xl font-bold text-white mb-8 tracking-tight relative z-10">{userStats.total_impact_score}</h3>
                  
                  <div className="relative z-10">
                    <div className="h-2 w-full bg-[#1c1c1c] rounded-full overflow-hidden mb-3 border border-zinc-800/50 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full relative" style={{ width: `${Math.min(100, Math.max(5, userStats.total_impact_score / 10))}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-1/2 rounded-full blur-sm" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 font-medium relative z-10">Zirve seviyanizi artırmak için etkinliklere katılın.</p>
                </>
              )}
            </div>
          </div>

          {/* Rozetler */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-8">Kazanılan Rozetler</h2>
            <div className="flex items-start gap-6 overflow-x-auto pb-6 scrollbar-hide min-h-[160px]">
               {!isAuthenticated ? (
                 <div className="flex items-center justify-center w-full h-full text-zinc-500 mt-10">Rozetleri görüntülemek için giriş yapın.</div>
               ) : badges.length === 0 ? (
                 <div className="flex items-center justify-center w-full h-full text-zinc-500 mt-10">Henüz hiç rozet kazanmadınız.</div>
               ) : (
                 badges.map((user_badge, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-4 group cursor-pointer min-w-[80px]">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center shadow-lg border border-zinc-700 group-hover:border-green-500/50 group-hover:scale-105 transition-all relative overflow-hidden">
                        <div className="absolute inset-0 rounded-full bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        {user_badge.badge?.icon_url ? (
                           <img src={user_badge.badge.icon_url} alt={user_badge.badge.name} className="w-10 h-10 object-contain drop-shadow-md relative z-10" />
                        ) : (
                           <span className="text-3xl relative z-10">🏅</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 text-center leading-tight font-medium group-hover:text-white">{user_badge.badge?.name || "Rozet"}</p>
                    </div>
                 ))
               )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Topluluk */}
      <section className="px-6 py-10 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-1">Topluluk</h2>
        <p className="text-zinc-400 mb-8">Son tartışmalar ve paylaşımlar (Yakında!)</p>
        
        <div className="space-y-4 opacity-60 pointer-events-none">
          {/* Post 1 */}
          <div className="bg-[#2A2A2A] rounded-2xl p-5 border border-zinc-800/60 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-5">
               <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#D1E8D1] to-green-200 flex items-center justify-center shadow-inner flex-shrink-0">
                 <MessageSquare className="w-6 h-6 text-green-800" />
               </div>
               <div>
                 <h4 className="font-bold text-white text-base mb-1.5 line-clamp-1">Kaz Dağları öncesi ekipman tavsiyesi?</h4>
                 <p className="text-xs md:text-sm text-zinc-400"><span className="text-zinc-300 font-medium">Ahmet Y.</span> • Dağcılık • 2 sa önce</p>
               </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}