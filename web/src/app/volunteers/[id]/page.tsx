"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "react-router-dom"; // Actually, using next/navigation
import api from "@/lib/api";
import { UserStats, VolunteerProfile, UserBadge } from "@/types";
import { useParams as useNextParams, useRouter as useNextRouter } from "next/navigation";

interface PublicProfile {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  experience_level: string;
  total_impact_score: number;
  badge_count: number;
}

export default function VolunteerPublicProfilePage() {
  const { id } = useNextParams();
  const router = useNextRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<PublicProfile>(`/api/v1/volunteers/${id}/profile`);
        setProfile(res.data);
      } catch (err) {
        console.error("Profil bulunamadı", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-700"></div>
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

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Geri
      </button>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-4xl overflow-hidden mx-auto mb-6 border-4 border-white shadow-md">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" />
          ) : (
            "👤"
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{profile.full_name}</h1>
        
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            Gönüllü
          </span>
          {profile.city && (
            <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
              📍 {profile.city}
            </span>
          )}
          <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full capitalize">
            {profile.experience_level === "beginner" ? "Başlangıç" :
             profile.experience_level === "intermediate" ? "Orta" : "Uzman"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-2xl p-6 transition hover:bg-gray-100">
            <div className="text-3xl font-bold text-green-700 mb-1">{profile.total_impact_score}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Etki Puanı</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-6 transition hover:bg-gray-100">
            <div className="text-3xl font-bold text-green-700 mb-1">{profile.badge_count}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Kazanılan Rozet</div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-8 text-left">
          <h2 className="text-lg font-bold text-gray-900 mb-4 text-center sm:text-left">Hakkında</h2>
          <p className="text-gray-600 leading-relaxed text-center sm:text-left">
            Bu gönüllü Zirve topluluğunun aktif bir üyesidir. Doğa etkinliklerine katılarak 
            hem toplumsal hem de ekolojik fayda sağlamaktadır.
          </p>
        </div>
      </div>
    </div>
  );
}
