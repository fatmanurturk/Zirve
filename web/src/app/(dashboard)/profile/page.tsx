"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { UserStats, VolunteerProfile, UserBadge, Event, Application, Organization } from "@/types";
import Link from "next/link";
import { 
  User, 
  Settings, 
  MapPin, 
  Calendar, 
  Award, 
  Shield, 
  Backpack, 
  Briefcase,
  History,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  TrendingUp,
  Users,
  LayoutDashboard
} from "lucide-react";

// --- Components ---

const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

const EmptyState = ({ icon, title, description, action }: { icon: React.ReactNode, title: string, description: string, action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
    <div className="text-4xl mb-4 text-gray-300">{icon}</div>
    <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
    <p className="text-gray-500 text-sm max-w-xs mb-6">{description}</p>
    {action}
  </div>
);

const BadgeStatus = ({ status }: { status: string }) => {
  const styles = {
    pending: "bg-amber-50 text-amber-600 border-amber-100",
    approved: "bg-green-50 text-green-700 border-green-100",
    rejected: "bg-red-50 text-red-600 border-red-100",
    open: "bg-blue-50 text-blue-600 border-blue-100",
    closed: "bg-gray-50 text-gray-600 border-gray-100",
    completed: "bg-purple-50 text-purple-600 border-purple-100",
  }[status] || "bg-gray-50 text-gray-600";

  const labels = {
    pending: "Beklemede",
    approved: "Onaylandı",
    rejected: "Reddedildi",
    open: "Açık",
    closed: "Kapalı",
    completed: "Tamamlandı",
  }[status] || status;

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles}`}>
      {labels}
    </span>
  );
};

// --- Main Page ---

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  // Volunteer Data
  const [vStats, setVStats] = useState<UserStats | null>(null);
  const [vProfile, setVProfile] = useState<VolunteerProfile | null>(null);
  const [vBadges, setVBadges] = useState<UserBadge[]>([]);
  const [vApplications, setVApplications] = useState<Application[]>([]);
  
  // Organizer Data
  const [oEvents, setOEvents] = useState<Event[]>([]);
  const [oOrg, setOOrg] = useState<Organization | null>(null);
  
  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    bio: "",
    city: "",
    experience_level: "beginner",
    max_altitude_m: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchMe();
    fetchData();
  }, [isAuthenticated, user?.role]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.role === "volunteer") {
        const [statsRes, profileRes, badgesRes, appsRes] = await Promise.allSettled([
          api.get("/api/v1/volunteers/me/stats"),
          api.get("/api/v1/volunteers/me/profile"),
          api.get("/api/v1/volunteers/me/badges"),
          api.get("/api/v1/users/me/applications"),
        ]);
        
        if (statsRes.status === "fulfilled") setVStats(statsRes.value.data);
        if (profileRes.status === "fulfilled") {
          const p = profileRes.value.data;
          setVProfile(p);
          setEditForm(prev => ({
            ...prev,
            bio: p.bio || "",
            city: p.city || "",
            experience_level: p.experience_level || "beginner",
            max_altitude_m: p.max_altitude_m || 0,
          }));
        }
        if (badgesRes.status === "fulfilled") setVBadges(badgesRes.value.data.items || []);
        if (appsRes.status === "fulfilled") setVApplications(appsRes.value.data.items || []);
      } else if (user?.role === "organizer") {
        const [eventsRes, orgRes] = await Promise.allSettled([
          api.get("/api/v1/events/users/me/events"),
          api.get("/api/v1/organizations/me"),
        ]);
        
        if (eventsRes.status === "fulfilled") setOEvents(eventsRes.value.data.items || []);
        if (orgRes.status === "fulfilled") setOOrg(orgRes.value.data);
      }
      
      if (user) {
        setEditForm(prev => ({
          ...prev,
          full_name: user.full_name || "",
          phone: user.phone || "",
        }));
      }
    } catch (err) {
      console.error("Profil verileri yüklenemedi", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.patch("/api/v1/auth/me", {
        full_name: editForm.full_name,
        phone: editForm.phone,
      });

      if (user?.role === "volunteer" && vProfile) {
        await api.put("/api/v1/volunteers/me/profile", {
          bio: editForm.bio,
          city: editForm.city,
          experience_level: editForm.experience_level,
          max_altitude_m: editForm.max_altitude_m,
        });
      }

      await fetchMe();
      await fetchData();
      setIsEditModalOpen(false);
    } catch (err) {
      alert("Bilgiler güncellenirken bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Sub-Components for Rendering ---

  const OrganizerStats = () => {
    // We can calculate some stats from the events list
    const totalEvents = oEvents.length;
    // For applications count, we would need a specific endpoint, but let's show placeholders for now as per plan
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-700 rounded-2xl flex items-center justify-center">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalEvents}</div>
            <div className="text-xs text-gray-500 font-medium">Toplam Etkinlik</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">-</div>
            <div className="text-xs text-gray-500 font-medium">Toplam Başvuru</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">-</div>
            <div className="text-xs text-gray-500 font-medium">Onaylanan Gönüllü</div>
          </div>
        </div>
      </div>
    );
  };

  const CreatedEvents = () => (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gray-900">Oluşturduğum Etkinlikler</h3>
        <Link href="/dashboard" className="text-sm font-bold text-[#15803d] hover:underline">Tümünü Gör</Link>
      </div>
      {oEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {oEvents.slice(0, 4).map((event) => (
            <Link 
              key={event.id} 
              href={`/events/${event.id}`}
              className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-[#15803d] hover:shadow-md transition-all flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {event.photos && event.photos.length > 0 ? (
                  <img src={event.photos.find(p => p.is_cover)?.file_path || event.photos[0].file_path} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🏔️</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-900 truncate group-hover:text-[#15803d] transition-colors">{event.title}</h4>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Calendar size={12} />
                    {new Date(event.start_date).toLocaleDateString("tr-TR")}
                  </div>
                  <BadgeStatus status={event.status} />
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-[#15803d] transition-colors" size={20} />
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon="📅" 
          title="Henüz etkinlik yok" 
          description="Hemen ilk etkinliğini oluştur ve gönüllülerle buluş." 
          action={<Link href="/events/create" className="bg-[#15803d] text-white px-6 py-2 rounded-xl text-sm font-bold">Etkinlik Oluştur</Link>}
        />
      )}
    </div>
  );

  const VolunteerStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
        <div className="text-3xl font-black text-[#15803d] mb-1">{vStats?.checked_in_count || 0}</div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Katılan Etkinlik</div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center">
        <div className="text-3xl font-black text-[#15803d] mb-1">
          {vApplications.filter(a => a.status === "pending").length}
        </div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Bekleyen Başvuru</div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center col-span-2 md:col-span-1">
        <div className="text-3xl font-black text-[#15803d] mb-1">{vStats?.total_impact_score || 0}</div>
        <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Impact Score</div>
      </div>
    </div>
  );

  const ApplicationHistory = () => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <History size={20} className="text-[#15803d]" /> Başvuru Geçmişi
      </h3>
      {vApplications.length > 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {vApplications.map((app) => (
              <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    app.status === "approved" ? "bg-green-50 text-green-600" :
                    app.status === "rejected" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {app.status === "approved" ? <CheckCircle2 size={20} /> :
                     app.status === "rejected" ? <XCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Etkinlik Başvurusu</h4>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(app.applied_at).toLocaleDateString("tr-TR")} • {new Date(app.applied_at).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <BadgeStatus status={app.status} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState 
          icon="📝" 
          title="Henüz başvuru yok" 
          description="Etkinlikleri incele ve sana uygun olanlara başvurmaya başla." 
          action={<Link href="/events" className="bg-[#15803d] text-white px-6 py-2 rounded-xl text-sm font-bold">Etkinlikleri Keşfet</Link>}
        />
      )}
    </div>
  );

  const EquipmentList = () => (
    <div className="mb-8">
      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Backpack size={20} className="text-[#15803d]" /> Ekipman Listesi
      </h3>
      {vProfile?.equipment_list && vProfile.equipment_list.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {vProfile.equipment_list.map((item) => (
            <div key={item.id} className="bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm text-xs font-bold text-gray-700 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
              {item.equipment_type}
              <span className="text-[10px] text-gray-400 font-normal">({item.condition})</span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState 
          icon="🎒" 
          title="Ekipman eklenmemiş" 
          description="Sahip olduğun ekipmanları ekleyerek daha zorlu etkinliklere katılabilirsin." 
          action={<button onClick={() => setIsEditModalOpen(true)} className="bg-white border border-gray-200 text-gray-700 px-6 py-2 rounded-xl text-sm font-bold">Ekipman Ekle</button>}
        />
      )}
    </div>
  );

  // --- Main Render Logic ---

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <Skeleton className="w-48 h-10" />
          <Skeleton className="w-32 h-10" />
        </div>
        <Skeleton className="w-full h-32 mb-6" />
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="w-full h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 pb-24">
      {/* Profil Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Profilim</h1>
          <p className="text-gray-500 mt-1 font-medium">Kişisel bilgilerini ve istatistiklerini buradan yönet.</p>
        </div>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <Settings size={18} className="text-gray-400" /> Düzenle
        </button>
      </div>

      {/* Profil Kartı */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 mb-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#15803d]/5 rounded-full -mr-32 -mt-32 transition-all duration-700 group-hover:scale-110"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[#15803d] to-green-900 rounded-[2rem] flex items-center justify-center text-4xl text-white shadow-lg border-4 border-white">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" alt={user.full_name} />
            ) : (
              <User size={40} />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-2xl font-black text-gray-900 leading-tight">{user?.full_name}</h2>
            <p className="text-gray-500 font-medium mb-4">{user?.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <div className="bg-green-50 text-[#15803d] px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Shield size={14} /> {user?.role === "volunteer" ? "Gönüllü" : "Organizatör"}
              </div>
              {user?.role === "volunteer" && vProfile && (
                <div className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={14} /> {
                    vProfile.experience_level === "beginner" ? "Başlangıç" :
                    vProfile.experience_level === "intermediate" ? "Orta" : "Uzman"
                  }
                </div>
              )}
              {user?.phone && (
                <div className="bg-gray-50 text-gray-600 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2">
                  📞 {user.phone}
                </div>
              )}
            </div>
          </div>
          {user?.role === "volunteer" && (
            <div className="bg-gray-900 text-white p-6 rounded-[1.5rem] flex flex-col items-center justify-center min-w-[140px] shadow-xl">
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-400 mb-1">Impact Score</div>
              <div className="text-3xl font-black tracking-tighter">{vStats?.total_impact_score || 0}</div>
              <div className="mt-2 text-[10px] font-bold text-[#15803d] bg-white px-2 py-0.5 rounded-md flex items-center gap-1">
                <Award size={10} /> {vBadges.length} Rozet
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Specific Content */}
      {user?.role === "organizer" ? (
        <>
          <OrganizerStats />
          <CreatedEvents />
          
          {/* Club Info Card */}
          <div className="bg-[#15803d] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Briefcase size={24} />
                </div>
                <h3 className="text-2xl font-black tracking-tight">Kulüp Yönetimi</h3>
              </div>
              <p className="text-green-100 mb-8 max-w-md font-medium leading-relaxed">
                {oOrg ? `"${oOrg.name}" kulübünün bilgilerini, logosunu ve ayarlarını buradan yönetebilirsin.` : "Hala bir kulüp kurmadın mı? Hemen bilgilerini düzenle ve kurumsallığını göster."}
              </p>
              <Link 
                href="/clubs/setup"
                className="inline-flex items-center gap-2 bg-white text-[#15803d] px-8 py-3.5 rounded-[1.25rem] text-sm font-black hover:bg-green-50 transition shadow-lg hover:shadow-white/10 active:scale-95"
              >
                Kulüp Ayarları <ChevronRight size={18} />
              </Link>
            </div>
            <div className="absolute top-1/2 -right-12 -translate-y-1/2 text-[12rem] text-white/5 font-black select-none pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
              🏢
            </div>
          </div>
        </>
      ) : (
        <>
          <VolunteerStats />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <ApplicationHistory />
              <EquipmentList />
            </div>
            
            <div className="space-y-8">
              {/* Badges Section */}
              <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-black text-gray-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                  <Award size={18} className="text-[#15803d]" /> Rozetler
                </h3>
                {vBadges.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3">
                    {vBadges.map((ub) => (
                      <div key={ub.id} className="aspect-square bg-gray-50 rounded-2xl flex flex-col items-center justify-center p-2 text-center group hover:bg-green-50 transition-colors">
                        <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">
                          {ub.badge.icon_url ? <img src={ub.badge.icon_url} className="w-8 h-8" alt={ub.badge.name} /> : "🏅"}
                        </div>
                        <div className="text-[8px] font-black text-gray-500 uppercase leading-tight truncate w-full">{ub.badge.name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs font-medium italic">Henüz rozet kazanılmadı.</div>
                )}
              </div>

              {/* Bio/Info Card */}
              <div className="bg-gray-50 rounded-[2rem] p-6">
                <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={18} className="text-[#15803d]" /> Hakkımda
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Şehir</div>
                    <div className="text-sm font-bold text-gray-700">{vProfile?.city || "Belirtilmemiş"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Hakkımda</div>
                    <div className="text-xs text-gray-600 leading-relaxed italic">
                      {vProfile?.bio || "Henüz bir açıklama eklenmemiş."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Profile Modal (Existing logic preserved, styled with modern look) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Profili Düzenle</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 hover:text-gray-900 rounded-full transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Ad Soyad</label>
                    <input 
                      type="text"
                      required
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#15803d] outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Telefon</label>
                    <input 
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#15803d] outline-none transition-all"
                      placeholder="+90 555 000 00 00"
                    />
                  </div>

                  {user?.role === "volunteer" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Şehir</label>
                          <input 
                            type="text"
                            value={editForm.city}
                            onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#15803d] outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Max İrtifa (m)</label>
                          <input 
                            type="number"
                            value={editForm.max_altitude_m}
                            onChange={(e) => setEditForm({...editForm, max_altitude_m: parseInt(e.target.value) || 0})}
                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#15803d] outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Deneyim Seviyesi</label>
                        <select 
                          value={editForm.experience_level}
                          onChange={(e) => setEditForm({...editForm, experience_level: e.target.value})}
                          className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#15803d] outline-none transition-all appearance-none"
                        >
                          <option value="beginner">Başlangıç</option>
                          <option value="intermediate">Orta</option>
                          <option value="advanced">Uzman</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Hakkımda</label>
                        <textarea 
                          rows={3}
                          value={editForm.bio}
                          onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                          className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-2 focus:ring-[#15803d] outline-none transition-all resize-none"
                          placeholder="Kendinden bahset..."
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-6 flex gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-[#15803d] text-white py-4 rounded-[1.25rem] font-black shadow-lg shadow-[#15803d]/20 hover:shadow-[#15803d]/30 hover:bg-[#15803d]/90 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-8 py-4 bg-gray-50 text-gray-700 rounded-[1.25rem] font-black hover:bg-gray-100 transition-all active:scale-95"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Setup Prompt (Preserved) */}
      {!vProfile && user?.role === "volunteer" && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[50] w-full max-w-lg px-6">
          <div className="bg-gray-900 text-white rounded-[2rem] p-6 shadow-2xl flex items-center justify-between gap-4 border-2 border-[#15803d]/30 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="text-3xl">🏔️</div>
              <div>
                <h4 className="font-black text-sm">Profilini Tamamla</h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Etkinliklere katılmak için gerekli.</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/profile/setup")}
              className="bg-[#15803d] text-white px-6 py-2.5 rounded-xl text-xs font-black hover:bg-[#15803d]/90 transition shadow-lg whitespace-nowrap"
            >
              Kuruluma Başla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}