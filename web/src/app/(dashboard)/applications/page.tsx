"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Application, ApplicationListResponse } from "@/types";
import { useAuthStore } from "@/store/auth";

const statusLabels: Record<string, string> = {
  pending: "Beklemede",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function ApplicationsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    if (user?.role !== "volunteer") {
      router.push("/events");
      return;
    }
    const fetchApps = async () => {
      try {
        const res = await api.get<ApplicationListResponse>("/api/v1/users/me/applications");
        setApplications(res.data.items);
      } catch {
        console.error("Başvurular yüklenemedi");
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [isAuthenticated, user]);

  const handleWithdraw = async (eventId: string) => {
    if (!confirm("Başvuruyu geri çekmek istediğinize emin misiniz?")) return;
    try {
      await api.delete("/api/v1/events/" + eventId + "/apply");
      setApplications((prev) => prev.filter((a) => a.event_id !== eventId));
    } catch {
      alert("Başvuru geri çekilemedi.");
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Başvurularım</h1>

      {applications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          Henüz başvurunuz yok.{" "}
          <Link href="/events" className="text-green-700 hover:underline">
            Etkinliklere göz atın
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={"text-xs px-3 py-1 rounded-full font-medium " + statusColors[app.status]}>
                      {statusLabels[app.status]}
                    </span>
                    {app.checked_in && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                        Check-in yapıldı
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Başvuru tarihi:{" "}
                    {new Date(app.applied_at).toLocaleDateString("tr-TR")}
                  </p>
                  {app.motivation_letter && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      {app.motivation_letter}
                    </p>
                  )}
                  {app.reviewer_note && (
                    <p className="text-sm text-gray-500 mt-2">
                      <span className="font-medium">Not:</span> {app.reviewer_note}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4 items-center">
                  <Link
                    href={"/events/" + app.event_id}
                    className="text-xs text-green-700 hover:underline"
                  >
                    Etkinliği Gör
                  </Link>
                  {app.status === "pending" && (
                    <button
                      onClick={() => handleWithdraw(app.event_id)}
                      className="text-xs text-red-500 hover:text-red-700 ml-3"
                    >
                      Geri Çek
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}