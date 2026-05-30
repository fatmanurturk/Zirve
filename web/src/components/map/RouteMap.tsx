"use client";

import { type RefObject, useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:18px;height:18px;border-radius:50%;
    background:#3b82f6;border:3px solid white;
    box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -12],
});

const destIcon = L.divIcon({
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
});

interface Step {
  instruction: string;
  distance: number;
}

interface RouteInfo {
  coordinates: [number, number][];
  distance_km: number;
  duration_min: number;
  steps: Step[];
}

function FitRoute({ coords }: { coords: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length < 2) return;
    const bounds = L.latLngBounds(coords);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [coords, map]);
  return null;
}

function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 200);
  }, [map]);
  return null;
}

interface Props {
  destLat: number;
  destLng: number;
  destName: string;
  mapRef?: RefObject<L.Map | null>;
}

export default function RouteMap({ destLat, destLng, destName, mapRef }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Tarayıcınız konum desteklemiyor.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => setLocError("Konum izni verilmedi veya alınamadı."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (!userPos) return;
    fetchRoute(userPos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos]);

  async function fetchRoute(from: [number, number]) {
    const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
    if (!apiKey) {
      setError("OpenRouteService API anahtarı eksik.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car/geojson`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
          },
          body: JSON.stringify({
            coordinates: [
              [from[1], from[0]],
              [destLng, destLat],
            ],
          }),
        },
      );
      if (!res.ok) throw new Error(`ORS hatası: ${res.status}`);
      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) throw new Error("Rota bulunamadı.");

      const coords: [number, number][] = feature.geometry.coordinates.map(
        ([lng, lat]: [number, number]) => [lat, lng],
      );
      const summary = feature.properties.summary;
      const rawSteps: Array<{ instruction: string; distance: number }> =
        feature.properties.segments?.[0]?.steps ?? [];

      setRoute({
        coordinates: coords,
        distance_km: Math.round((summary.distance / 1000) * 10) / 10,
        duration_min: Math.round(summary.duration / 60),
        steps: rawSteps.map((s) => ({
          instruction: s.instruction,
          distance: Math.round(s.distance),
        })),
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rota alınamadı.");
    } finally {
      setLoading(false);
    }
  }

  const center: [number, number] = userPos ?? [destLat, destLng];
  const allCoords: [number, number][] = route?.coordinates ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Map */}
      <div className="h-80 rounded-xl overflow-hidden border border-slate-200" style={{ position: "relative", zIndex: 0 }}>
        <MapContainer key="route-map" ref={mapRef} center={center} zoom={10} style={{ height: "100%", width: "100%" }}>
          <InvalidateSizeOnMount />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {allCoords.length > 0 && <FitRoute coords={allCoords} />}
          {userPos && (
            <Marker position={userPos} icon={userIcon}>
              <Popup>Konumunuz</Popup>
            </Marker>
          )}
          <Marker position={[destLat, destLng]} icon={destIcon}>
            <Popup>{destName}</Popup>
          </Marker>
          {allCoords.length > 0 && (
            <Polyline
              positions={allCoords}
              pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>

      {/* Status / Info */}
      {locError && (
        <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-4 py-2">{locError}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</p>
      )}
      {loading && (
        <p className="text-sm text-slate-500 animate-pulse">Rota hesaplanıyor…</p>
      )}

      {route && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex gap-4">
            <div className="flex-1 bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">{route.distance_km} km</p>
              <p className="text-xs text-emerald-600 mt-0.5">Mesafe</p>
            </div>
            <div className="flex-1 bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{route.duration_min} dk</p>
              <p className="text-xs text-blue-600 mt-0.5">Tahmini Süre</p>
            </div>
          </div>

          {/* Steps */}
          {route.steps.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Adım Adım Yol Tarifi
              </p>
              {route.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-slate-700">{step.instruction}</p>
                    {step.distance > 0 && (
                      <p className="text-xs text-slate-400">{step.distance} m</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
