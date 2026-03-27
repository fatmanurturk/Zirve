"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { UserStats, VolunteerProfile, UserBadge } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profile, setProfile] = useState<VolunteerProfile | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchMe();
    const fetchData = async () => {
      try {
        if (user?.role === "volunteer") {
          const [statsRes, profileRes, badgesRes] = await Promise.allSettled([
            api.get("/api/v1/volunteers/me/stats"),
            api.get("/api/v1/volunteers/me/profile"),
            api.get("/api/v1/volunteers/me/badges"),
          ]);
          if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
          if (profileRes.status === "fulfilled") setProfile(profileRes.value.data);
          if (badgesRes.status === "fulfilled") setBadges(badgesRes.value.data.items || []);
        }
      } catch {
        console.error("Profil yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Profilim</h1>

      {/* Kullanıcı Bilgileri */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-2xl">
            {user?.avatar_url ? (
              <img src={user.avatar_url} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              "👤"
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.full_name}</h2>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full mt-1 inline-block">
              {user?.role === "volunteer" ? "Gönüllü" : "Organizatör"}
            </span>
          </div>
        </div>
      </div>

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
                <div className="text-sm text-gray-700">{profile.bio}</div>
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

      {!profile && user?.role === "volunteer" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center mb-6">
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