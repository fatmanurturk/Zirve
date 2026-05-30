"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useAuthStore } from "@/store/auth";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeVolunteerIcon(stale: boolean) {
  const color = stale ? "#94a3b8" : "#059669";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

interface VolunteerLocation {
  volunteer_id: string;
  lat: number;
  lng: number;
  is_active: boolean;
  updated_at: string;
  full_name?: string;
  avatar_url?: string;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

function AutoFit({ locations }: { locations: VolunteerLocation[] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || locations.length === 0) return;
    if (locations.length === 1) {
      map.setView([locations[0].lat, locations[0].lng], 13);
    } else {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    fitted.current = true;
  }, [locations, map]);
  return null;
}

function isStale(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() > 10 * 60 * 1000;
}

interface Props {
  eventId: string;
  eventLat?: number;
  eventLng?: number;
  eventName?: string;
}

export default function VolunteerTrackingMap({
  eventId,
  eventLat,
  eventLng,
  eventName,
}: Props) {
  const { token } = useAuthStore();
  const [locations, setLocations] = useState<VolunteerLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function fetchLocations() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/locations/event/${eventId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: VolunteerLocation[] = await res.json();
      setLocations(data);
      setError(null);
    } catch {
      setError("Konum verisi alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLocations();
    intervalRef.current = setInterval(fetchLocations, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const center: [number, number] =
    locations.length > 0
      ? [locations[0].lat, locations[0].lng]
      : eventLat && eventLng
        ? [eventLat, eventLng]
        : [39.9, 32.8];

  const activeCount = locations.filter((l) => !isStale(l.updated_at)).length;

  return (
    <div className="space-y-3">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-slate-700">Canlı Takip</span>
        </div>
        <div className="flex gap-3 text-sm">
          <span className="text-emerald-700 font-semibold">{activeCount} aktif</span>
          {locations.length - activeCount > 0 && (
            <span className="text-slate-400">{locations.length - activeCount} pasif</span>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="h-72 rounded-xl overflow-hidden border border-slate-200" style={{ position: "relative", zIndex: 0 }}>
        {loading ? (
          <div className="h-full flex items-center justify-center bg-slate-50">
            <span className="text-sm text-slate-400 animate-pulse">Yükleniyor…</span>
          </div>
        ) : (
          <MapContainer key="tracking-map" center={center} zoom={11} style={{ height: "100%", width: "100%" }}>
            <InvalidateSizeOnMount />
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <AutoFit locations={locations} />

            {/* Event location marker */}
            {eventLat && eventLng && (
              <>
                <Circle
                  center={[eventLat, eventLng]}
                  radius={500}
                  pathOptions={{ color: "#059669", fillColor: "#059669", fillOpacity: 0.08, weight: 1 }}
                />
                <Marker
                  position={[eventLat, eventLng]}
                  icon={L.divIcon({
                    className: "",
                    html: `<div style="
                      width:28px;height:28px;border-radius:50% 50% 50% 0;
                      background:#059669;border:3px solid white;
                      box-shadow:0 2px 8px rgba(0,0,0,0.3);
                      transform:rotate(-45deg);
                    "></div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 28],
                    popupAnchor: [0, -30],
                  })}
                >
                  <Popup>{eventName ?? "Etkinlik"}</Popup>
                </Marker>
              </>
            )}

            {/* Volunteer markers */}
            {locations.map((loc) => {
              const stale = isStale(loc.updated_at);
              return (
                <Marker
                  key={loc.volunteer_id}
                  position={[loc.lat, loc.lng]}
                  icon={makeVolunteerIcon(stale)}
                >
                  <Popup minWidth={160}>
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">{loc.full_name ?? "Gönüllü"}</p>
                      <p className={`text-xs ${stale ? "text-slate-400" : "text-emerald-600"}`}>
                        {stale ? "Pasif (10 dk+)" : "Aktif"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(loc.updated_at).toLocaleTimeString("tr-TR")}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {!loading && locations.length === 0 && !error && (
        <p className="text-sm text-slate-400 text-center py-2">
          Henüz konum paylaşan gönüllü yok.
        </p>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          Aktif (son 10 dk)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
          Pasif
        </span>
      </div>
    </div>
  );
}
