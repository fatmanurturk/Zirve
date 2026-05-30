"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { Event } from "@/types";

// Leaflet default icon fix
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const categoryColors: Record<string, string> = {
  hiking:      "#059669",
  climbing:    "#ea580c",
  environment: "#16a34a",
  rescue:      "#dc2626",
  other:       "#7c3aed",
};

function makeIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:28px;border-radius:50% 50% 50% 0;
      background:${color};border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      transform:rotate(-45deg);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });
}

// Haritayı event'lere sığdır
function FitBounds({ events }: { events: Event[] }) {
  const map = useMap();
  useEffect(() => {
    const withCoords = events.filter((e) => e.latitude && e.longitude);
    if (withCoords.length === 0) return;
    if (withCoords.length === 1) {
      map.setView([withCoords[0].latitude!, withCoords[0].longitude!], 10);
      return;
    }
    const bounds = L.latLngBounds(withCoords.map((e) => [e.latitude!, e.longitude!]));
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [events, map]);
  return null;
}

interface Props {
  events: Event[];
  onGetDirections?: (event: Event) => void;
}

export default function EventMap({ events, onGetDirections }: Props) {
  const eventsWithCoords = events.filter((e) => e.latitude && e.longitude);
  const center: [number, number] = eventsWithCoords.length > 0
    ? [eventsWithCoords[0].latitude!, eventsWithCoords[0].longitude!]
    : [39.9, 32.8]; // Türkiye merkezi

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds events={eventsWithCoords} />
      {eventsWithCoords.map((event) => (
        <Marker
          key={event.id}
          position={[event.latitude!, event.longitude!]}
          icon={makeIcon(categoryColors[event.category] ?? "#059669")}
        >
          <Popup minWidth={200}>
            <div className="space-y-1.5">
              <p className="font-semibold text-sm text-slate-800 leading-snug">{event.title}</p>
              {event.location_name && (
                <p className="text-xs text-slate-500">📍 {event.location_name}</p>
              )}
              <p className="text-xs text-slate-500">
                🗓 {new Date(event.start_date).toLocaleDateString("tr-TR")}
              </p>
              {onGetDirections && (
                <button
                  onClick={() => onGetDirections(event)}
                  className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-1.5 px-3 rounded-lg transition-colors"
                >
                  🗺 Yol Tarifi Al
                </button>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
