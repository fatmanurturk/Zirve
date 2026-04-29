import { Users, UserCheck, CalendarCheck, Clock } from "lucide-react";
import { OrganizationStats } from "../../../../lib/api/organizations";

interface ClubStatsProps {
  stats: OrganizationStats;
}

export default function ClubStats({ stats }: ClubStatsProps) {
  const cards = [
    {
      label: "Takipçi",
      value: stats.followers,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50"
    },
    {
      label: "Aktif Gönüllü",
      value: stats.active_volunteers,
      icon: UserCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      label: "Tamamlanan Etkinlik",
      value: stats.completed_events,
      icon: CalendarCheck,
      color: "text-purple-600",
      bg: "bg-purple-50"
    },
    {
      label: "Gönüllü Saati",
      value: stats.total_hours,
      icon: Clock,
      color: "text-orange-600",
      bg: "bg-orange-50"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div key={idx} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-start hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                <Icon size={18} />
              </div>
              <span className="text-sm font-medium text-gray-500">{card.label}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {card.value.toLocaleString()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
