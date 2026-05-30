"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Waypoint } from "@/types";

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function makeStopIcon(num: number, isLast: boolean) {
  const bg = num === 1 ? "#059669" : isLast ? "#dc2626" : "#3b82f6";
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

function FitBounds({ waypoints }: { waypoints: Waypoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length === 0) return;
    if (waypoints.length === 1) {
      map.setView([waypoints[0].lat, waypoints[0].lng], 13);
    } else {
      map.fitBounds(
        L.latLngBounds(waypoints.map((w) => [w.lat, w.lng])),
        { padding: [40, 40] }
      );
    }
  }, [waypoints, map]);
  return null;
}

interface Props {
  waypoints: Waypoint[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routeGeoJSON?: any;
}

export default function RouteViewer({ waypoints, routeGeoJSON }: Props) {
  const validWaypoints = waypoints.filter((w) => w.lat !== 0 || w.lng !== 0);

  const routeCoords: [number, number][] =
    routeGeoJSON?.features?.[0]?.geometry?.coordinates?.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    ) ?? [];

  const summary = routeGeoJSON?.features?.[0]?.properties?.summary;
  const distKm = summary ? Math.round(summary.distance / 100) / 10 : null;
  const durMin = summary ? Math.round(summary.duration / 60) : null;

  const center: [number, number] =
    validWaypoints.length > 0
      ? [validWaypoints[0].lat, validWaypoints[0].lng]
      : [39.9, 32.8];

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 380, position: "relative", zIndex: 0 }}>
        <MapContainer
          key="route-viewer"
          center={center}
          zoom={validWaypoints.length === 0 ? 6 : 11}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <FitBounds waypoints={validWaypoints} />

          {/* Route polyline from saved GeoJSON — no ORS call */}
          {routeCoords.length > 0 && (
            <Polyline
              positions={routeCoords}
              pathOptions={{ color: "#3b82f6", weight: 5, opacity: 0.85 }}
            />
          )}

          {validWaypoints.map((wp, idx) => (
            <Marker
              key={wp.order}
              position={[wp.lat, wp.lng]}
              icon={makeStopIcon(wp.order, idx === validWaypoints.length - 1)}
            >
              <Popup minWidth={140}>
                <p className="font-semibold text-sm">Durak {wp.order}</p>
                <p className="text-xs text-slate-500 mt-0.5">{wp.label}</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Summary stats */}
      {(distKm !== null || durMin !== null) && (
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

      {/* Stop list */}
      {validWaypoints.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rota Durakları</p>
          <div className="space-y-1">
            {validWaypoints.map((wp, idx) => (
              <div key={wp.order} className="flex items-center gap-3">
                <span
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{
                    background:
                      wp.order === 1 ? "#059669"
                      : idx === validWaypoints.length - 1 ? "#dc2626"
                      : "#3b82f6",
                  }}
                >
                  {wp.order}
                </span>
                {idx < validWaypoints.length - 1 && (
                  <div className="absolute ml-3.5 mt-7 w-px h-4 bg-slate-200" />
                )}
                <p className="text-sm text-slate-700 font-medium">{wp.label || `Durak ${wp.order}`}</p>
                {idx < validWaypoints.length - 1 && (
                  <span className="ml-auto text-slate-300 text-xs">↓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
