"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Waypoint } from "@/types";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeStopIcon(num: number) {
  const bg = num === 1 ? "#059669" : "#3b82f6";
  return L.divIcon({
    className: "",
    html: `<div style="
      width:30px;height:30px;border-radius:50%;
      background:${bg};color:white;border:2px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
      font-weight:700;font-size:13px;
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -18],
  });
}

function ClickLayer({
  active,
  onAdd,
}: {
  active: boolean;
  onAdd: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (active) onAdd(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitWaypoints({ waypoints }: { waypoints: Waypoint[] }) {
  const map = useMap();
  const prevLen = useRef(0);
  useEffect(() => {
    const valid = waypoints.filter((w) => w.lat && w.lng);
    if (valid.length === 0 || valid.length === prevLen.current) return;
    prevLen.current = valid.length;
    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 13);
    } else {
      map.fitBounds(L.latLngBounds(valid.map((w) => [w.lat, w.lng])), { padding: [40, 40] });
    }
  }, [waypoints, map]);
  return null;
}

async function fetchOrsRoute(wps: Waypoint[]): Promise<object | null> {
  const apiKey = process.env.NEXT_PUBLIC_ORS_API_KEY;
  if (!apiKey || wps.length < 2) return null;
  try {
    const res = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: { Authorization: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates: wps.map((p) => [p.lng, p.lat]) }),
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "User-Agent": "ZirveApp/1.0" } }
    );
    const d = await res.json();
    return d.display_name?.split(",").slice(0, 2).join(", ") ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
      { headers: { "User-Agent": "ZirveApp/1.0" } }
    );
    const d = await res.json();
    if (!d?.[0]) return null;
    return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
  } catch {
    return null;
  }
}

interface Props {
  initialWaypoints?: Waypoint[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange: (waypoints: Waypoint[], geoJSON: any | null) => void;
}

export default function RouteEditor({ initialWaypoints = [], onChange }: Props) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(initialWaypoints);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [mode, setMode] = useState<"click" | "address">("click");
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [labels, setLabels] = useState<string[]>(initialWaypoints.map((w) => w.label));
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null);

  // Debounced route fetch whenever waypoints change
  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteGeoJSON(null);
      onChange(waypoints, null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoadingRoute(true);
      const geo = await fetchOrsRoute(waypoints);
      setIsLoadingRoute(false);
      setRouteGeoJSON(geo);
      onChange(waypoints, geo);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

  // Single waypoint — still notify parent
  useEffect(() => {
    if (waypoints.length === 1) onChange(waypoints, null);
    if (waypoints.length === 0) onChange([], null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints]);

  const addByClick = useCallback(async (lat: number, lng: number) => {
    const order = waypoints.length + 1;
    const label = await reverseGeocode(lat, lng);
    const wp: Waypoint = { order, lat, lng, label };
    setWaypoints((prev) => [...prev, wp]);
    setLabels((prev) => [...prev, label]);
  }, [waypoints.length]);

  const removeWaypoint = useCallback((idx: number) => {
    setWaypoints((prev) =>
      prev.filter((_, i) => i !== idx).map((w, i) => ({ ...w, order: i + 1 }))
    );
    setLabels((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const updateWaypointPosition = useCallback((idx: number, lat: number, lng: number) => {
    setWaypoints((prev) =>
      prev.map((w, i) => (i === idx ? { ...w, lat, lng } : w))
    );
  }, []);

  const handleLabelChange = (idx: number, val: string) => {
    setLabels((prev) => prev.map((l, i) => (i === idx ? val : l)));
    setWaypoints((prev) => prev.map((w, i) => (i === idx ? { ...w, label: val } : w)));
  };

  const handleAddressBlur = async (idx: number) => {
    const address = labels[idx];
    if (!address.trim()) return;
    setGeocodingIdx(idx);
    const coords = await geocodeAddress(address);
    setGeocodingIdx(null);
    if (coords) {
      setWaypoints((prev) =>
        prev.map((w, i) => (i === idx ? { ...w, lat: coords.lat, lng: coords.lng } : w))
      );
    }
  };

  const addAddressStop = () => {
    const order = waypoints.length + 1;
    setWaypoints((prev) => [...prev, { order, lat: 0, lng: 0, label: "" }]);
    setLabels((prev) => [...prev, ""]);
  };

  const clearAll = () => {
    setWaypoints([]);
    setLabels([]);
    setRouteGeoJSON(null);
    onChange([], null);
  };

  // Polyline from GeoJSON
  const routeCoords: [number, number][] =
    routeGeoJSON?.features?.[0]?.geometry?.coordinates?.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    ) ?? [];

  const summary = routeGeoJSON?.features?.[0]?.properties?.summary;
  const distKm = summary ? Math.round(summary.distance / 100) / 10 : null;
  const durMin = summary ? Math.round(summary.duration / 60) : null;

  const validWaypoints = waypoints.filter((w) => w.lat !== 0 || w.lng !== 0);

  return (
    <div className="space-y-4">
      {/* Mode toggle + Clear */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          <button
            type="button"
            onClick={() => setMode("click")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "click" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            🗺 Haritaya Tıkla
          </button>
          <button
            type="button"
            onClick={() => setMode("address")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === "address" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            📝 Adres Yaz
          </button>
        </div>
        {waypoints.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
          >
            Tümünü Temizle
          </button>
        )}
      </div>

      {/* Mode hint */}
      <p className="text-xs text-slate-400">
        {mode === "click"
          ? "Haritaya tıklayarak durak ekleyin. Markerları sürükleyerek konumu güncelleyebilirsiniz."
          : "Her durağın adresini yazın ve alandan çıkın — otomatik geocode edilir."}
      </p>

      {/* Map */}
      <div
        className="rounded-xl overflow-hidden border border-slate-200"
        style={{ height: 420, position: "relative", zIndex: 0 }}
      >
        <MapContainer
          key="route-editor"
          center={[39.9, 32.8]}
          zoom={6}
          style={{ height: "100%", width: "100%", cursor: mode === "click" ? "crosshair" : "grab" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ClickLayer active={mode === "click"} onAdd={addByClick} />
          <FitWaypoints waypoints={validWaypoints} />

          {/* Route polyline */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.85 }}
            />
          )}

          {/* Waypoint markers */}
          {validWaypoints.map((wp, idx) => (
            <Marker
              key={idx}
              position={[wp.lat, wp.lng]}
              icon={makeStopIcon(wp.order)}
              draggable
              eventHandlers={{
                dragend(e) {
                  const { lat, lng } = (e.target as L.Marker).getLatLng();
                  updateWaypointPosition(
                    waypoints.findIndex((w) => w.order === wp.order),
                    lat,
                    lng
                  );
                },
              }}
            >
              <Popup minWidth={160}>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Durak {wp.order}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{wp.label}</p>
                  <button
                    onClick={() => removeWaypoint(waypoints.findIndex((w) => w.order === wp.order))}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    ✕ Kaldır
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Route loading indicator */}
      {isLoadingRoute && (
        <p className="text-xs text-blue-500 animate-pulse">Rota hesaplanıyor…</p>
      )}

      {/* Route summary */}
      {distKm !== null && durMin !== null && (
        <div className="flex gap-3">
          <div className="flex-1 bg-emerald-50 rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-700">{distKm} km</p>
            <p className="text-xs text-emerald-600">Toplam Mesafe</p>
          </div>
          <div className="flex-1 bg-blue-50 rounded-xl px-4 py-3 text-center">
            <p className="text-lg font-bold text-blue-700">{durMin} dk</p>
            <p className="text-xs text-blue-600">Tahmini Süre</p>
          </div>
        </div>
      )}

      {/* Waypoints list */}
      {waypoints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Duraklar</p>
          {waypoints.map((wp, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: wp.order === 1 ? "#059669" : "#3b82f6" }}
              >
                {wp.order}
              </span>
              <input
                type="text"
                value={labels[idx] ?? ""}
                onChange={(e) => handleLabelChange(idx, e.target.value)}
                onBlur={() => mode === "address" && handleAddressBlur(idx)}
                placeholder={mode === "address" ? "Adres yaz, alandan çıkınca geocode edilir" : "Durak adı"}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-slate-50"
              />
              {geocodingIdx === idx && (
                <span className="text-xs text-blue-500 animate-pulse w-16">Aranıyor…</span>
              )}
              {wp.lat !== 0 && (
                <span className="text-xs text-slate-400 hidden sm:block w-28 truncate">
                  {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                </span>
              )}
              <button
                type="button"
                onClick={() => removeWaypoint(idx)}
                className="flex-shrink-0 text-slate-400 hover:text-red-500 transition w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50"
                title="Kaldır"
              >
                ✕
              </button>
            </div>
          ))}

          {mode === "address" && (
            <button
              type="button"
              onClick={addAddressStop}
              className="mt-1 text-sm text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1"
            >
              + Durak Ekle
            </button>
          )}
        </div>
      )}

      {waypoints.length === 0 && (
        <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
          {mode === "click"
            ? "Haritaya tıklayarak ilk durağı ekleyin"
            : "\"+ Durak Ekle\" butonuna basarak başlayın"}
        </div>
      )}

      {mode === "address" && waypoints.length === 0 && (
        <button
          type="button"
          onClick={addAddressStop}
          className="w-full py-2.5 border border-dashed border-emerald-300 rounded-xl text-sm text-emerald-600 hover:bg-emerald-50 font-medium transition"
        >
          + Durak Ekle
        </button>
      )}
    </div>
  );
}
