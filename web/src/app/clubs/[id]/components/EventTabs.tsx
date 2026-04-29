import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getOrganizationEvents } from "../../../../lib/api/organizations";
import EventCard from "./EventCard";

interface EventTabsProps {
  clubId: string;
}

export default function EventTabs({ clubId }: EventTabsProps) {
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");

  const { data, isLoading } = useQuery({
    queryKey: ["clubEvents", clubId, activeTab],
    queryFn: () => getOrganizationEvents(clubId, activeTab === "active" ? "open" : "completed"),
  });

  return (
    <div className="mt-8">
      <div className="flex space-x-8 border-b border-gray-200 mb-6">
        <button
          className={`pb-4 font-medium text-sm transition-colors relative ${
            activeTab === "active" ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("active")}
        >
          Aktif Etkinlikler
          {activeTab === "active" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-md" />
          )}
        </button>
        <button
          className={`pb-4 font-medium text-sm transition-colors relative ${
            activeTab === "past" ? "text-emerald-600" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("past")}
        >
          Geçmiş Etkinlikler
          {activeTab === "past" && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-600 rounded-t-md" />
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data?.items?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.items.map((event) => (
            <EventCard key={event.id} event={event} isPast={activeTab === "past"} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center bg-gray-50 rounded-xl border border-gray-100 border-dashed">
          <p className="text-gray-500">
            {activeTab === "active" 
              ? "Şu anda aktif bir etkinlik bulunmuyor." 
              : "Henüz tamamlanmış bir etkinlik bulunmuyor."}
          </p>
        </div>
      )}
    </div>
  );
}
