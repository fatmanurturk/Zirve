"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useParams as useNextParams, useRouter as useNextRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { Mail, Phone, MapPin, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

interface PublicProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  experience_level: string;
  total_impact_score: number;
  badge_count: number;
}

interface OrganizerView extends PublicProfile {
  email: string;
  phone?: string;
  bio?: string;
  emergency_contact?: {
    name?: string;
    phone?: string;
    relation?: string;
  };
}

export default function VolunteerPublicProfilePage() {
  const { id } = useNextParams();
  const router = useNextRouter();
  const { user, isInitialized } = useAuthStore();
  const [profile, setProfile] = useState<OrganizerView | null>(null);
  const [isOrganizerView, setIsOrganizerView] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auth durumu hazır olana kadar bekliyoruz
    if (!isInitialized) return;

    const fetchProfile = async () => {
      setLoading(true);
      try {
        if (user?.role === "organizer") {
          try {
            const res = await api.get<OrganizerView>(`/api/v1/volunteers/${id}/organizer-view`);
            setProfile(res.data);
            setIsOrganizerView(true);
            return;
          } catch {
            // Bu gönüllü bu organizatörün etkinliğine başvurmamış, public profile göster
          }
        }
        const res = await api.get<PublicProfile>(`/api/v1/volunteers/${id}/profile`);
        setProfile(res.data as OrganizerView);
        setIsOrganizerView(false);
      } catch (err) {
        console.error("Profil bulunamadı", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, user, isInitialized]);

  if (loading || !isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-gray-400">
        <Loader2 className="w-10 h-10 animate-spin text-green-700" />
        <p className="text-sm">Profil yükleniyor...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Profil Bulunamadı</h1>
        <button onClick={() => router.back()} className="text-green-700 hover:underline">
          Geri Dön
        </button>
      </div>
    );
  }

  const expLabel =
    profile.experience_level === "beginner" ? "Başlangıç" :
    profile.experience_level === "intermediate" ? "Orta" : "Uzman";

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Geri
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-4xl overflow-hidden mx-auto mb-6 border-4 border-white shadow-md">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
          ) : (
            "👤"
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name}</h1>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Gönüllü</span>
          {profile.city && (
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              📍 {profile.city}
            </span>
          )}
          <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full capitalize">
            {expLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition">
            <div className="text-3xl font-bold text-green-700 mb-1">{profile.total_impact_score}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Etki Puanı</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition">
            <div className="text-3xl font-bold text-green-700 mb-1">{profile.badge_count}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Kazanılan Rozet</div>
          </div>
        </div>

        {profile.bio && (
          <div className="border-t border-gray-100 pt-6 mb-6 text-left">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Hakkında</h2>
            <p className="text-gray-600 leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {isOrganizerView && (
          <div className="border-t border-gray-100 pt-6 space-y-3">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 text-left">İletişim Bilgileri</h2>

            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
              <Mail className="w-4 h-4 text-green-700 shrink-0" />
              <div className="text-left">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">E-posta</p>
                <a href={`mailto:${profile.email}`} className="text-sm font-medium text-gray-800 hover:text-green-700 transition-colors">
                  {profile.email}
                </a>
              </div>
            </div>

            {profile.phone && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <Phone className="w-4 h-4 text-green-700 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Telefon</p>
                  <a href={`tel:${profile.phone}`} className="text-sm font-medium text-gray-800 hover:text-green-700 transition-colors">
                    {profile.phone}
                  </a>
                </div>
              </div>
            )}

            {profile.city && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-green-700 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Şehir</p>
                  <p className="text-sm font-medium text-gray-800">{profile.city}</p>
                </div>
              </div>
            )}

            {profile.emergency_contact && (
              <div className="flex items-start gap-3 bg-red-50 rounded-xl px-4 py-3 border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="text-left">
                  <p className="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-1">Acil Durum Kişisi</p>
                  {profile.emergency_contact.name && (
                    <p className="text-sm font-semibold text-gray-800">{profile.emergency_contact.name}</p>
                  )}
                  {profile.emergency_contact.relation && (
                    <p className="text-xs text-gray-500">{profile.emergency_contact.relation}</p>
                  )}
                  {profile.emergency_contact.phone && (
                    <a href={`tel:${profile.emergency_contact.phone}`} className="text-sm font-medium text-red-600 hover:text-red-700 transition-colors mt-1 block">
                      {profile.emergency_contact.phone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
