"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Mountain, MapPin, Calendar, Users, Droplets, Snowflake, 
  MessageSquare, TreePine, Flame, Loader2, Search
} from "lucide-react";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const categoryIcons: any = {
  hiking: <Mountain className="w-16 h-16 text-emerald-600 opacity-10 absolute -bottom-4 -right-4" />,
  climbing: <Mountain className="w-16 h-16 text-orange-600 opacity-10 absolute -bottom-4 -right-4" />,
  environment: <TreePine className="w-16 h-16 text-emerald-600 opacity-10 absolute -bottom-4 -right-4" />,
  rescue: <Users className="w-16 h-16 text-rose-600 opacity-10 absolute -bottom-4 -right-4" />,
  other: <Flame className="w-16 h-16 text-purple-600 opacity-10 absolute -bottom-4 -right-4" />,
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
  hiking: "bg-emerald-50",
  climbing: "bg-orange-50",
  environment: "bg-emerald-50",
  rescue: "bg-rose-50",
  other: "bg-purple-50",
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
      const [statsRes, eventsRes] = await Promise.all([
        api.get("/api/v1/stats").catch(() => null),
        api.get("/api/v1/events/?status=open&limit=3").catch(() => null)
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (eventsRes?.data) setEvents(eventsRes.data.items || []);

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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
        <p className="font-medium animate-pulse">Zirve platformu yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      
      {/* 1. Hero Seçeneği */}
      <section className="px-6 pt-6 pb-10 max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-800 to-emerald-950 text-white p-10 md:p-14 shadow-2xl shadow-emerald-900/20">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600 rounded-full translate-x-1/3 -translate-y-1/4 opacity-20 blur-3xl" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-sm font-medium border border-white/20 mb-6 shadow-sm">
              Doğa Sporları & Gönüllülük Platformu
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
              Açık Havada <br />
              <span className="text-emerald-300">İyilik Yap!</span>
            </h1>
            <p className="text-lg md:text-xl text-emerald-50 mb-10 max-w-xl leading-relaxed opacity-90">
              Doğa sporları etkinliklerini keşfet, harika bir topluluğun parçası ol ve deneyimlerini iyiliğe dönüştür.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-14">
              <Link href="/events" className="px-8 py-3.5 rounded-full bg-white text-emerald-900 hover:bg-slate-50 transition-all font-bold shadow-lg shadow-black/10 hover:-translate-y-0.5">
                Etkinlikleri Keşfet
              </Link>
              {!isAuthenticated && (
                <Link href="/register" className="px-8 py-3.5 rounded-full bg-white/10 border border-white/20 hover:bg-white/20 transition-all font-bold backdrop-blur-md">
                  Gönüllü Ol
                </Link>
              )}
            </div>

            <div className="flex gap-10">
              <div>
                <p className="text-3xl font-bold mb-1">{stats.active_volunteers}</p>
                <p className="text-sm text-emerald-200/80 font-medium">Aktif gönüllü</p>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{stats.upcoming_events}</p>
                <p className="text-sm text-emerald-200/80 font-medium">Yaklaşan etkinlik</p>
              </div>
              <div>
                <p className="text-3xl font-bold mb-1">{stats.cities_count}</p>
                <p className="text-sm text-emerald-200/80 font-medium">Farklı Şehir</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Yaklaşan Etkinlikler */}
      <section className="px-6 py-8 max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Yaklaşan Etkinlikler</h2>
            <p className="text-slate-500 font-medium">Yeni maceraları keşfedin ve kontenjanlar dolmadan katılın</p>
          </div>
          <Link href="/events" className="text-emerald-600 font-bold hover:text-emerald-700 flex items-center gap-1 group">
            Tümünü Gör <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-10 text-center text-slate-400">
            Yakında yeni etkinlikler oluşturulacak. Lütfen takipte kalın!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map((event) => (
              <div 
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col cursor-pointer overflow-hidden group"
              >
                <div className={`h-40 ${categoryBgColors[event.category] || "bg-slate-50"} flex items-center justify-center relative overflow-hidden transition-colors`}>
                   {categoryIcons[event.category] || categoryIcons["other"]}
                   <span className="text-6xl drop-shadow-sm z-10 relative group-hover:scale-110 transition-transform">
                     {categoryEmojis[event.category] || "🏕️"}
                   </span>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-auto">
                    <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-600 mb-4 border border-slate-200 shadow-sm">
                      {categoryLabels[event.category] || event.category}
                    </span>
                    <h3 className="font-bold text-xl text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">{event.title}</h3>
                    <p className="text-slate-500 text-sm flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-emerald-600" /> {new Date(event.start_date).toLocaleDateString("tr-TR")}</p>
                    <p className="text-slate-500 text-sm mb-6 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-600" /> {event.location_name || "Konum Gizli"}</p>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-100">
                    <p className="text-sm font-medium text-slate-500">
                      {event.max_volunteers ? <><span className="text-emerald-600 font-bold">{event.max_volunteers}</span> yer kaldı</> : "Sınırsız Katılım"}
                    </p>
                    <button className="px-5 py-2.5 rounded-xl bg-slate-50 group-hover:bg-emerald-600 text-slate-700 group-hover:text-white text-sm font-bold transition-colors shadow-sm">
                      Katıl
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Gönüllü Paneli */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Gönüllü Paneli</h2>
          <p className="text-slate-500 font-medium">Katıldığınız, bekleyen ve geçmiş etkinliklerinizi takip edin</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden min-h-[350px]">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />
          
          {!isAuthenticated ? (
            <div className="absolute inset-0 z-20 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center rounded-[2rem] p-6 text-center">
               <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                  <Users className="w-8 h-8 text-emerald-600" />
               </div>
               <h3 className="text-2xl font-bold text-slate-900 mb-3">Paneli görmek için giriş yapın</h3>
               <p className="text-slate-500 mb-8 max-w-md text-lg leading-relaxed">Etkinlik başvurularınızı ve kişisel geçmişinizi yönetmek için hesabınıza erişin.</p>
               <Link href="/login" className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 rounded-full text-white font-bold transition-all shadow-lg shadow-emerald-600/30 hover:-translate-y-0.5">
                 Giriş Yap
               </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-8 relative z-10 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200/60 min-w-max shadow-inner">
                  <button onClick={() => setActiveTab("active")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'active' ? 'bg-white text-emerald-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Onaylı ({applications.filter(a => a.status === 'approved').length})</button>
                  <button onClick={() => setActiveTab("pending")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'pending' ? 'bg-white text-amber-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Bekleyen ({applications.filter(a => a.status === 'pending').length})</button>
                  <button onClick={() => setActiveTab("history")} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-slate-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}`}>Geçmiş ({applications.filter(a => a.status === 'rejected' || a.status === 'completed').length})</button>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                {filteredApps.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">Bu sekmede herhangi bir kayıt bulunamadı.</div>
                ) : (
                  filteredApps.map((app, index) => (
                    <div key={app.id} onClick={() => router.push(`/events/${app.event_id}`)} className="flex items-center justify-between p-5 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group cursor-pointer">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl ${app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : app.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'} font-bold flex items-center justify-center text-xl shadow-sm group-hover:scale-105 transition-transform`}>
                          {app.status === 'approved' ? '✓' : app.status === 'pending' ? '?' : '×'}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-lg group-hover:text-emerald-700 transition-colors">Etkinlik Başvurusu</h4>
                          <p className="text-sm text-slate-500 mt-1 font-medium"><span className="text-slate-700">{new Date(app.applied_at).toLocaleDateString('tr-TR')}</span> tarihinde gönderildi</p>
                        </div>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-xs font-bold border shadow-sm ${
                        app.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        app.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {app.status === "approved" ? "ONAYLANDI" : app.status === "pending" ? "BEKLİYOR" : "REDDEDİLDİ / GEÇMİŞ"}
                      </div>
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
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Etki Puanınız</h2>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden min-h-[260px] flex flex-col justify-center">
              <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              
              {!isAuthenticated ? (
                <div className="relative z-10 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Flame className="w-8 h-8 text-slate-400" /></div>
                  <p className="text-slate-500 font-medium">Puanlarınızı görmek için giriş yapmalısınız.</p>
                </div>
              ) : (
                <>
                  <p className="text-slate-500 text-sm mb-2 font-bold uppercase tracking-wider relative z-10 flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" /> TOPLAM ZİRVE PUANI</p>
                  <h3 className="text-6xl font-extrabold text-slate-900 mb-8 tracking-tight relative z-10">{userStats.total_impact_score}</h3>
                  
                  <div className="relative z-10">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full relative" style={{ width: `${Math.min(100, Math.max(5, userStats.total_impact_score / 10))}%` }}>
                        <div className="absolute inset-0 bg-white/30 w-1/2 rounded-full blur-sm" />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 font-medium relative z-10">Seviyenizi artırmak için etkinliklere kaydolun.</p>
                </>
              )}
            </div>
          </div>

          {/* Rozetler */}
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Kazanılan Rozetler</h2>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden min-h-[260px] flex items-center">
               {!isAuthenticated ? (
                 <div className="flex flex-col items-center justify-center w-full text-slate-500">
                   <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Mountain className="w-8 h-8 text-slate-400" /></div>
                   <p className="font-medium">Rozet kasanız kilitli.</p>
                 </div>
               ) : badges.length === 0 ? (
                 <div className="flex flex-col items-center justify-center w-full text-slate-400 text-center">
                   <div className="w-20 h-20 bg-slate-50 border border-slate-200 border-dashed rounded-full flex items-center justify-center mb-4 shadow-sm">
                      <span className="text-3xl opacity-50 grayscale">🏅</span>
                   </div>
                   <p className="font-medium">Henüz rozet kazanmadınız.<br/>İlk maceranıza atılın!</p>
                 </div>
               ) : (
                 <div className="flex items-start gap-6 overflow-x-auto pb-4 scrollbar-hide w-full">
                   {badges.map((user_badge, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-4 group cursor-pointer min-w-[90px]">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shadow-md border border-slate-200 group-hover:border-emerald-400 group-hover:shadow-lg group-hover:-translate-y-1 transition-all relative overflow-hidden">
                          {user_badge.badge?.icon_url ? (
                             <img src={user_badge.badge.icon_url} alt={user_badge.badge.name} className="w-10 h-10 object-contain drop-shadow-md relative z-10" />
                          ) : (
                             <span className="text-4xl relative z-10 drop-shadow-sm">🏅</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 text-center leading-tight font-bold group-hover:text-emerald-700">{user_badge.badge?.name || "Rozet"}</p>
                      </div>
                   ))}
                 </div>
               )}
            </div>
          </div>
        </div>
      </section>

      {/* 5. Topluluk */}
      <section className="px-6 py-12 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Topluluk <span className="text-sm font-semibold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full ml-3 align-middle">Beta</span></h2>
        <p className="text-slate-500 font-medium mb-8">Son tartışmalar ve paylaşımlar yakında aktifleşecek</p>
        
        <div className="space-y-4 opacity-70 pointer-events-none">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                 <MessageSquare className="w-6 h-6 text-emerald-600" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-900 text-lg mb-1 line-clamp-1">Kaz Dağları öncesi ekipman tavsiyesi?</h4>
                 <p className="text-sm text-slate-500 font-medium"><span className="text-slate-700">Ahmet Y.</span> • Dağcılık • 2 sa önce</p>
               </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

// Helper icon component since lucide-react ChevronRight conflicts with imported text
function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
    </svg>
  );
}