import { Calendar, MapPin, Users } from "lucide-react";
import { Event } from "../../../../lib/api/organizations";

interface EventCardProps {
  event: Event;
  isPast?: boolean;
}

export default function EventCard({ event, isPast }: EventCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all group flex flex-col h-full">
      <div className="p-5 flex-1">
        <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
          {event.title}
        </h3>
        
        <div className="space-y-2 mt-4">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar size={16} className="mr-2 text-gray-400" />
            {formatDate(event.start_date)}
          </div>
          {(event.city || event.location_name) && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={16} className="mr-2 text-gray-400" />
              {event.city || event.location_name}
            </div>
          )}
          <div className="flex items-center text-sm text-gray-600">
            <Users size={16} className="mr-2 text-gray-400" />
            {isPast ? (
              <span><span className="font-medium text-gray-900">{event.applications?.length || 0}</span> gönüllü katıldı</span>
            ) : (
              <span><span className="font-medium text-gray-900">{event.max_volunteers || "Sınırsız"}</span> gönüllü aranıyor</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-5 pt-0 mt-auto border-t border-transparent">
        {isPast ? (
          <div className="w-full text-center py-2.5 rounded-lg font-medium bg-gray-100 text-gray-500 text-sm">
            Tamamlandı
          </div>
        ) : (
          <a
            href={`/events/${event.id}/apply`}
            className="block w-full text-center py-2.5 rounded-lg font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors text-sm"
          >
            Başvur
          </a>
        )}
      </div>
    </div>
  );
}
