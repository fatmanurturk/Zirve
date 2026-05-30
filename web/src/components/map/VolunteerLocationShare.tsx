"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth";

export default function VolunteerLocationShare() {
  const { token } = useAuthStore();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const watchRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const posRef = useRef<GeolocationCoordinates | null>(null);

  async function upsertLocation(coords: GeolocationCoordinates, active: boolean) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/locations/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lat: coords.latitude,
          lng: coords.longitude,
          is_active: active,
        }),
      });
      if (active) setLastSent(new Date());
    } catch {
      // silent — next interval will retry
    }
  }

  async function deactivate() {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/locations/me`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // silent
    }
  }

  function startSharing() {
    if (!navigator.geolocation) {
      setError("Tarayıcınız konum desteklemiyor.");
      return;
    }
    setError(null);
    setSharing(true);

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        posRef.current = pos.coords;
      },
      () => setError("Konum alınamadı. İzin verdiğinizden emin olun."),
      { enableHighAccuracy: true },
    );

    // Send immediately, then every 15s
    navigator.geolocation.getCurrentPosition((pos) => {
      posRef.current = pos.coords;
      upsertLocation(pos.coords, true);
    });

    intervalRef.current = setInterval(() => {
      if (posRef.current) upsertLocation(posRef.current, true);
    }, 15_000);
  }

  function stopSharing() {
    setSharing(false);
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    watchRef.current = null;
    intervalRef.current = null;
    posRef.current = null;
    deactivate();
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (sharing) stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-800">Konum Paylaşımı</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {sharing
            ? lastSent
              ? `Son güncelleme: ${lastSent.toLocaleTimeString("tr-TR")}`
              : "Konum gönderiliyor…"
            : "Organizatörler konumunuzu görebilsin"}
        </p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>

      <button
        onClick={sharing ? stopSharing : startSharing}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
          sharing ? "bg-emerald-500" : "bg-slate-200"
        }`}
        aria-label={sharing ? "Konum paylaşımını durdur" : "Konum paylaşımını başlat"}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
            sharing ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>

      {sharing && (
        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Aktif
        </span>
      )}
    </div>
  );
}
