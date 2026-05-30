"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type L from "leaflet";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { Event, Application, EventPhoto, Waypoint } from "@/types";
import { useAuthStore } from "@/store/auth";
import { Building2, User, ChevronRight, CheckCircle2, XCircle, Navigation, Route, Pencil } from "lucide-react";
import EventPhotoGallery from "@/components/events/EventPhotoGallery";
import EventPhotoUploader from "@/components/events/EventPhotoUploader";

const RouteMap = dynamic(() => import("@/components/map/RouteMap"), { ssr: false });
const VolunteerTrackingMap = dynamic(() => import("@/components/map/VolunteerTrackingMap"), { ssr: false });
const VolunteerLocationShare = dynamic(() => import("@/components/map/VolunteerLocationShare"), { ssr: false });
const RouteViewer = dynamic(() => import("@/components/map/RouteViewer"), { ssr: false });
const RouteEditor = dynamic(() => import("@/components/map/RouteEditor"), { ssr: false });

const categoryLabels: Record<string, string> = {
  hiking: "Yürüyüş",
  climbing: "Tırmanma",
  skiing: "Kayak",
  cycling: "Bisiklet",
  environment: "Çevre & Doğa",
  rescue: "Arama Kurtarma",
  other: "Diğer",
};

const difficultyLabels: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
  expert: "Uzman",
};

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [motivation, setMotivation] = useState("");

  // Organizer only states
  const [applicants, setApplicants] = useState<Application[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [photos, setPhotos] = useState<EventPhoto[]>([]);

  // Route state
  const [editingRoute, setEditingRoute] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<Waypoint[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [savingRoute, setSavingRoute] = useState(false);
  // Volunteer: their application status for this event
  const [myAppStatus, setMyAppStatus] = useState<string | null>(null);
  const routeMapRef = useRef<L.Map | null>(null);

  const isCreator = !!user?.id && !!event?.created_by && user.id === event.created_by;

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await api.get<Event>(`/api/v1/events/${id}`);
        setEvent(res.data);
        // Initialise route state from saved event data
        if (res.data.waypoints?.length) {
          setRouteWaypoints(res.data.waypoints);
          setRouteGeoJSON(res.data.route_geojson ?? null);
        }
        try {
          const photosRes = await api.get(`/api/v1/event-photos/${res.data.id}`);
          setPhotos(photosRes.data);
        } catch {
          setPhotos([]);
        }
      } catch {
        router.push("/events");
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();

    // Check volunteer's application status for this event
    if (isAuthenticated && user?.role === "volunteer") {
      api.get("/api/v1/users/me/applications?limit=200").then((res) => {
        const apps: Application[] = res.data?.items ?? [];
        const mine = apps.find((a) => a.event_id === id);
        setMyAppStatus(mine?.status ?? null);
      }).catch(() => {/* silent */});
    }
  }, [id, router]);

  const fetchApplicants = useCallback(async () => {
    if (!id || !isCreator) return;
    
    setLoadingApplicants(true);
    
    try {
      const res = await api.get(`/api/v1/events/${id}/applications`);
      setApplicants(res.data.items || []);
    } catch {
      console.error("Başvurular yüklenemedi");
    } finally {
      setLoadingApplicants(false);
    }
  }, [id, isCreator, user?.id, event?.created_by]);

  useEffect(() => {
    if (isCreator) {
      fetchApplicants();
    }
  }, [isCreator, fetchApplicants]);

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    setApplying(true);
    setError("");
    try {
      await api.post(`/api/v1/events/${id}/apply`, {
        motivation_letter: motivation || null,
      });
      setApplied(true);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || (err instanceof Error ? err.message : "Başvuru sırasında hata oluştu."));
    } finally {
      setApplying(false);
    }
  };

  const handleUpdateStatus = async (appId: string, status: string) => {
    try {
      await api.put(`/api/v1/events/${id}/applications/${appId}`, {
        status: status,
      });
      fetchApplicants();
    } catch {
      alert("Durum güncellenirken hata oluştu.");
    }
  };

  const saveRoute = async () => {
    if (!event) return;
    setSavingRoute(true);
    try {
      await api.put(`/api/v1/events/${event.id}`, {
        waypoints: routeWaypoints.length > 0 ? routeWaypoints : null,
        route_geojson: routeGeoJSON ?? null,
      });
      setEditingRoute(false);
    } catch {
      alert("Rota kaydedilemedi.");
    } finally {
      setSavingRoute(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event) return null;

  const clubInitials = event.organization_name
    ? event.organization_name.substring(0, 2).toUpperCase()
    : "ZV";

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1"
      >
        ← Geri
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            {categoryLabels[event.category] || event.category}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">
            {difficultyLabels[event.difficulty] || event.difficulty}
          </span>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${event.status === "open"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
            }`}>
            {event.status === "open" ? "Açık" : event.status === "closed" ? "Kapalı" : "Tamamlandı"}
          </span>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>
        <p className="text-gray-600 mb-8 leading-relaxed whitespace-pre-wrap">{event.description}</p>

        {/* Fotoğraf Galerisi */}
        {isCreator ? (
          <div className="mb-10 pt-8 border-t border-gray-100">
            <EventPhotoUploader
              eventId={event.id}
              initialPhotos={photos}
              onPhotosChange={setPhotos}
            />
          </div>
        ) : photos.length > 0 ? (
          <div className="mb-10 pt-8 border-t border-gray-100">
            <EventPhotoGallery photos={photos} />
          </div>
        ) : null}

        {/* Kulüp & Organizatör Kartı */}
        {event.organization_id && (
          <Link
            href={`/clubs/${event.organization_id}`}
            className="flex items-center justify-between gap-4 mb-8 p-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden border-2 border-emerald-200 bg-emerald-100 flex items-center justify-center shadow-sm">
                {event.organization_logo_url ? (
                  <img
                    src={event.organization_logo_url}
                    alt={event.organization_name || "Kulüp"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-emerald-700 font-bold text-sm">{clubInitials}</span>
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Düzenleyen Kulüp</span>
                </div>
                <p className="text-base font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                  {event.organization_name || "Bilinmeyen Kulüp"}
                </p>
                {event.organizer_name && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-500">{event.organizer_name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 text-emerald-600 text-sm font-semibold group-hover:gap-2 transition-all">
              <span className="hidden sm:block">Kulüp Sayfası</span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </Link>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Konum</div>
            <div className="text-sm font-bold text-gray-700 truncate">📍 {event.location_name}</div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Başlangıç</div>
            <div className="text-sm font-bold text-gray-700">
              📅 {new Date(event.start_date).toLocaleDateString("tr-TR")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Bitiş</div>
            <div className="text-sm font-bold text-gray-700">
              📅 {new Date(event.end_date).toLocaleDateString("tr-TR")}
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 transition hover:bg-gray-100">
            <div className="text-xs text-gray-400 mb-1 font-medium">Max Gönüllü</div>
            <div className="text-sm font-bold text-gray-700">👥 {event.max_volunteers}</div>
          </div>
        </div>

        {event.status === "open" && new Date(event.end_date) < new Date() && user?.role === "volunteer" && !isCreator && (
          <div className="border-t border-gray-100 pt-8">
            <div className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
              <span className="text-slate-400 text-xl leading-none">🕒</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">Bu etkinlik sona erdi</p>
                <p className="text-sm text-slate-500 mt-1">Tarihi geçmiş etkinliklere başvuru yapılamaz.</p>
              </div>
            </div>
          </div>
        )}

        {event.status === "open" && new Date(event.end_date) >= new Date() && user?.role === "volunteer" && !isCreator && (
          <div className="border-t border-gray-100 pt-8">
            {applied ? (
              <div className="bg-green-50 text-green-700 px-6 py-4 rounded-xl text-sm font-medium border border-green-100">
                ✅ Başvurunuz alındı! Onay bekleyiniz.
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Başvur</h3>
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Motivasyon mektubunuz (opsiyonel)"
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="bg-green-700 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-green-800 transition disabled:opacity-50 shadow-sm"
                >
                  {applying ? "Başvuruluyor..." : "Etkinliğe Başvur"}
                </button>
              </div>
            )}
          </div>
        )}

        {!isAuthenticated && event.status === "open" && (
          <div className="border-t border-gray-100 pt-8">
            <p className="text-gray-500 text-sm">
              Başvurmak için{" "}
              <a href="/login" className="text-green-700 font-bold hover:underline">
                giriş yapın
              </a>
              .
            </p>
          </div>
        )}

        {isAuthenticated && user?.role === "organizer" && !isCreator && event.status === "open" && (
          <div className="border-t border-gray-100 pt-8">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <span className="text-amber-500 text-xl leading-none">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Bu etkinliğe başvuramazsınız</p>
                <p className="text-sm text-amber-700 mt-1">
                  Etkinliklere yalnızca <span className="font-semibold">gönüllü</span> hesapları başvurabilir.
                  Başvurmak için gönüllü hesabıyla giriş yapın.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Volunteer: route view + location share ── */}
        {isAuthenticated && user?.role === "volunteer" && !isCreator && (
          <div className="border-t border-gray-100 pt-8 space-y-5">
            <VolunteerLocationShare />

            {/* Approved volunteer sees the mission route */}
            {myAppStatus === "approved" && routeWaypoints.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Route className="w-4 h-4 text-emerald-600" />
                  <p className="text-sm font-semibold text-slate-800">Görev Rotası</p>
                </div>
                <RouteViewer waypoints={routeWaypoints} routeGeoJSON={routeGeoJSON} />
              </div>
            ) : myAppStatus === "approved" && routeWaypoints.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Organizatör henüz bir rota çizmedi.
              </p>
            ) : (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
                <Route className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">
                  Rotayı görmek için başvurun ve onaylanın
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Yalnızca onaylanan gönüllüler etkinlik rotasını görebilir.
                </p>
              </div>
            )}

            {/* Personal directions (always visible if event has coords) */}
            {event.latitude && event.longitude && (
              <details
                className="group"
                onToggle={(e) => {
                  if ((e.target as HTMLDetailsElement).open) {
                    setTimeout(() => routeMapRef.current?.invalidateSize(), 200);
                  }
                }}
              >
                <summary className="cursor-pointer flex items-center gap-2 text-sm font-semibold text-emerald-700 list-none">
                  <Navigation className="w-4 h-4" />
                  Konumdan Yol Tarifi Al
                  <span className="text-slate-400 font-normal text-xs group-open:hidden">(tıkla)</span>
                </summary>
                <div className="mt-3">
                  <RouteMap
                    mapRef={routeMapRef}
                    destLat={event.latitude}
                    destLng={event.longitude}
                    destName={event.location_name || event.title}
                  />
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Organizer: route editor + live tracking */}
      {isCreator && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6 space-y-8">

          {/* Mission route */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">Görev Rotası</h2>
              </div>
              {!editingRoute ? (
                <button
                  onClick={() => setEditingRoute(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition"
                >
                  <Pencil className="w-4 h-4" />
                  {routeWaypoints.length > 0 ? "Rotayı Düzenle" : "Rota Oluştur"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingRoute(false)}
                    className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
                  >
                    İptal
                  </button>
                  <button
                    onClick={saveRoute}
                    disabled={savingRoute}
                    className="text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    {savingRoute ? "Kaydediliyor…" : "Kaydet"}
                  </button>
                </div>
              )}
            </div>

            {editingRoute ? (
              <RouteEditor
                initialWaypoints={routeWaypoints}
                onChange={(wps, geo) => {
                  setRouteWaypoints(wps);
                  setRouteGeoJSON(geo);
                }}
              />
            ) : routeWaypoints.length > 0 ? (
              <RouteViewer waypoints={routeWaypoints} routeGeoJSON={routeGeoJSON} />
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                <Route className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Henüz rota çizilmedi. "Rota Oluştur" ile başlayın.</p>
              </div>
            )}
          </div>

          {/* Live volunteer tracking */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Gönüllü Konum Takibi</h2>
            <VolunteerTrackingMap
              eventId={event.id}
              eventLat={event.latitude}
              eventLng={event.longitude}
              eventName={event.title}
            />
          </div>
        </div>
      )}

      {/* Organizatör için Başvurular Listesi */}
      {isCreator && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Gelen Başvurular ({applicants.length})</h2>
            {loadingApplicants && <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-green-700" />}
          </div>

          <div className="space-y-4">
            {applicants.length === 0 && !loadingApplicants ? (
              <p className="text-center py-10 text-gray-400 text-sm italic">Henüz başvuru bulunmuyor.</p>
            ) : (
              applicants.map((app) => (
                <div key={app.id} className="border border-gray-50 rounded-2xl p-5 hover:bg-gray-50 transition shadow-sm bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <Link href={`/volunteers/${app.volunteer_id}`} className="hover:opacity-80 transition">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-xl overflow-hidden border-2 border-white shadow-sm">
                          {app.volunteer_avatar_url ? (
                            <img src={app.volunteer_avatar_url} alt={app.volunteer_name || "Gönüllü"} className="w-full h-full object-cover" />
                          ) : (
                            "👤"
                          )}
                        </div>
                      </Link>
                      <div>
                        <Link href={`/volunteers/${app.volunteer_id}`} className="font-bold text-gray-900 hover:text-green-700 transition">
                          {app.volunteer_name || "Gönüllü"}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(app.applied_at).toLocaleDateString("tr-TR")} tarihinde başvurdu
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${app.status === "approved" ? "bg-green-100 text-green-700" :
                          app.status === "rejected" ? "bg-red-100 text-red-700" :
                            "bg-yellow-100 text-yellow-700"
                        }`}>
                        {app.status === "pending" ? "Beklemede" : app.status === "approved" ? "Onaylandı" : "Reddedildi"}
                      </span>

                      {app.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateStatus(app.id, "approved")}
                            className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                            title="Onayla"
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(app.id, "rejected")}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                            title="Reddet"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {app.motivation_letter && (
                    <div className="mt-4 p-4 bg-gray-100 rounded-xl">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Motivasyon Mektubu</p>
                      <p className="text-sm text-gray-600 leading-relaxed italic">&quot;{app.motivation_letter}&quot;</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}