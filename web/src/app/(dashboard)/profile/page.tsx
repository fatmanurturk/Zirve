"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { UserStats, VolunteerProfile, UserBadge } from "@/types";
import Link from "next/link";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  
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
  }, [isAuthenticated]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user?.role === "volunteer") {
        const [statsRes, profileRes, badgesRes] = await Promise.allSettled([
          api.get("/api/v1/volunteers/me/stats"),
          api.get("/api/v1/volunteers/me/profile"),
          api.get("/api/v1/volunteers/me/badges"),
        ]);
        if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
        if (profileRes.status === "fulfilled") {
          const p = profileRes.value.data;
          setProfile(p);
          setEditForm(prev => ({
            ...prev,
            bio: p.bio || "",
            city: p.city || "",
            experience_level: p.experience_level || "beginner",
            max_altitude_m: p.max_altitude_m || 0,
          }));
        }
        if (badgesRes.status === "fulfilled") setBadges(badgesRes.value.data.items || []);
      }
      
      if (user) {
        setEditForm(prev => ({
          ...prev,
          full_name: user.full_name || "",
          phone: user.phone || "",
        }));
      }
    } catch {
      console.error("Profil yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // 1. Update basic user info
      await api.patch("/api/v1/auth/me", {
        full_name: editForm.full_name,
        phone: editForm.phone,
      });

      // 2. Update volunteer profile if applicable
      if (user?.role === "volunteer" && profile) {
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

  if (loading && !isEditModalOpen) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profilim</h1>
        <button 
          onClick={() => setIsEditModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition shadow-sm"
        >
          <span>✏️</span> Profili Düzenle
        </button>
      </div>

      {/* Kullanıcı Bilgileri */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl overflow-hidden">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-full h-full object-cover" />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <div className="flex gap-2 mt-1">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                {user?.role === "volunteer" ? "Gönüllü" : "Organizatör"}
              </span>
              {user?.phone && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  📞 {user.phone}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Organizatör için Kulüp Yönetim Kartı */}
      {user?.role === "organizer" && (
        <div className="bg-green-700 rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Kulüp Ayarları</h3>
            <p className="text-green-100 text-sm mb-6 max-w-md">
              Kulüp ismini, açıklamasını, logosunu ve diğer detayları buradan yönetebilirsin.
            </p>
            <Link 
              href="/clubs/setup"
              className="inline-block bg-white text-green-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-50 transition"
            >
              Kulüp Bilgilerini Düzenle
            </Link>
          </div>
          <div className="absolute top-0 right-0 p-8 text-7xl opacity-10">🏢</div>
        </div>
      )}

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.total_applications}</div>
            <div className="text-xs text-gray-500 mt-1">Toplam Başvuru</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.approved_applications}</div>
            <div className="text-xs text-gray-500 mt-1">Onaylanan</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.checked_in_count}</div>
            <div className="text-xs text-gray-500 mt-1">Check-in</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.total_impact_score}</div>
            <div className="text-xs text-gray-500 mt-1">Etki Puanı</div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{stats.badge_count}</div>
            <div className="text-xs text-gray-500 mt-1">Rozet</div>
          </div>
        </div>
      )}

      {/* Profil Detayları */}
      {profile && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gönüllü Profili</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Deneyim Seviyesi</div>
              <div className="text-sm font-medium text-gray-700 capitalize">
                {profile.experience_level === "beginner" ? "Başlangıç" :
                  profile.experience_level === "intermediate" ? "Orta" : "Uzman"}
              </div>
            </div>
            {profile.city && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Şehir</div>
                <div className="text-sm font-medium text-gray-700">{profile.city}</div>
              </div>
            )}
            {profile.max_altitude_m && (
              <div>
                <div className="text-xs text-gray-400 mb-1">Max İrtifa</div>
                <div className="text-sm font-medium text-gray-700">{profile.max_altitude_m} m</div>
              </div>
            )}
            {profile.bio && (
              <div className="col-span-2">
                <div className="text-xs text-gray-400 mb-1">Hakkımda</div>
                <div className="text-sm text-gray-700 leading-relaxed">{profile.bio}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rozetler */}
      {badges.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rozetlerim</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {badges.map((ub) => (
              <div key={ub.id} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-3xl mb-2">
                  {ub.badge.icon_url ? (
                    <img src={ub.badge.icon_url} className="w-10 h-10 mx-auto" />
                  ) : "🏅"}
                </div>
                <div className="text-xs font-medium text-gray-700">{ub.badge.name}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(ub.earned_at).toLocaleDateString("tr-TR")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Profili Düzenle</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Ad Soyad</label>
                  <input 
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Telefon</label>
                  <input 
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="+90 555 000 00 00"
                  />
                </div>

                {user?.role === "volunteer" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Şehir</label>
                        <input 
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Max İrtifa (m)</label>
                        <input 
                          type="number"
                          value={editForm.max_altitude_m}
                          onChange={(e) => setEditForm({...editForm, max_altitude_m: parseInt(e.target.value) || 0})}
                          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Deneyim Seviyesi</label>
                      <select 
                        value={editForm.experience_level}
                        onChange={(e) => setEditForm({...editForm, experience_level: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        <option value="beginner">Başlangıç</option>
                        <option value="intermediate">Orta</option>
                        <option value="advanced">Uzman</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Hakkımda</label>
                      <textarea 
                        rows={3}
                        value={editForm.bio}
                        onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                        placeholder="Kendinden bahset..."
                      />
                    </div>
                  </>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-green-700 text-white py-3 rounded-xl font-bold hover:bg-green-800 transition disabled:opacity-50"
                  >
                    {isSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition"
                  >
                    İptal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {!profile && user?.role === "volunteer" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-6 mt-6">
          <div className="text-4xl mb-4">⛰️</div>
          <h2 className="text-xl font-bold text-green-900 mb-2">Aramıza Hoş Geldin!</h2>
          <p className="text-green-800 text-sm mb-6 max-w-md mx-auto">
            Gönüllü olarak etkinliklere katılabilmen ve ekiplerle eşleşebilmen için öncelikle deneyim ve ekipman bilgilerini profilinize eklemelisin.
          </p>
          <button
            onClick={() => router.push("/profile/setup")}
            className="bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-medium hover:bg-green-800 transition shadow-sm"
          >
            Profilini Tamamla
          </button>
        </div>
      )}
    </div>
  );
}