"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Event, EventListResponse } from "@/types";

const categoryLabels: Record<string, string> = {
  hiking: "Yürüyüş",
  climbing: "Tırmanma",
  skiing: "Kayak",
  cycling: "Bisiklet",
  other: "Diğer",
};

const difficultyLabels: Record<string, string> = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
  expert: "Uzman",
};

const difficultyColors: Record<string, string> = {
  easy: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  hard: "bg-orange-100 text-orange-700",
  expert: "bg-red-100 text-red-700",
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (difficulty) params.append("difficulty", difficulty);
      params.append("limit", "20");
      const res = await api.get<EventListResponse>(`/api/v1/events/?${params}`);
      setEvents(res.data.items);
      setTotal(res.data.total);
    } catch {
      console.error("Etkinlikler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [category, difficulty]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Etkinlikler</h1>
          <p className="text-gray-500 mt-1">{total} etkinlik bulundu</p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-4 mb-8">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Tüm Kategoriler</option>
          <option value="hiking">Yürüyüş</option>
          <option value="climbing">Tırmanma</option>
          <option value="skiing">Kayak</option>
          <option value="cycling">Bisiklet</option>
          <option value="other">Diğer</option>
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Tüm Zorluklar</option>
          <option value="easy">Kolay</option>
          <option value="medium">Orta</option>
          <option value="hard">Zor</option>
          <option value="expert">Uzman</option>
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Yükleniyor...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          Henüz etkinlik yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  {categoryLabels[event.category] || event.category}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${difficultyColors[event.difficulty]}`}>
                  {difficultyLabels[event.difficulty] || event.difficulty}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {event.title}
              </h3>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                {event.description}
              </p>
              <div className="text-xs text-gray-400 space-y-1">
                <div>📍 {event.location_name}</div>
                <div>
                  📅{" "}
                  {new Date(event.start_date).toLocaleDateString("tr-TR")}
                </div>
                <div>👥 Max {event.max_volunteers} gönüllü</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}