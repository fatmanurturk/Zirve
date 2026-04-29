import { MapPin, Tag } from "lucide-react";
import { OrganizationProfile } from "../../../../lib/api/organizations";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followOrganization } from "../../../../lib/api/organizations";
import { useState } from "react";

interface ClubHeaderProps {
  club: OrganizationProfile;
}

export default function ClubHeader({ club }: ClubHeaderProps) {
  const queryClient = useQueryClient();
  // We'll mock initial follow state as false unless it's returned by the backend
  // For optimistic update, we keep local state synced with mutation
  const [isFollowing, setIsFollowing] = useState(false);

  const followMutation = useMutation({
    mutationFn: () => followOrganization(club.id),
    onMutate: async () => {
      // Optimistic update
      setIsFollowing(!isFollowing);
    },
    onError: () => {
      // Revert on error
      setIsFollowing(!isFollowing);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["club", club.id] });
    }
  });

  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-8">
      {/* Cover Banner */}
      <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 relative">
        <div className="absolute -bottom-12 left-6">
          <div className="h-24 w-24 bg-white rounded-full p-1 shadow-md">
            {club.logo_url ? (
              <img src={club.logo_url} alt={club.name} className="h-full w-full rounded-full object-cover" />
            ) : (
              <div className="h-full w-full rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-3xl font-bold">
                {getInitials(club.name)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-16 pb-6 px-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{club.name}</h1>
            <div className="flex flex-wrap items-center mt-2 text-gray-500 gap-4 text-sm font-medium">
              {club.city && (
                <span className="flex items-center gap-1">
                  <MapPin size={16} className="text-emerald-500" />
                  {club.city}
                </span>
              )}
              {club.category && (
                <span className="flex items-center gap-1">
                  <Tag size={16} className="text-emerald-500" />
                  {club.category}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={() => followMutation.mutate()}
            disabled={followMutation.isPending}
            className={`px-5 py-2.5 rounded-full font-semibold transition-all shadow-sm ${
              isFollowing 
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200" 
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {isFollowing ? "Takip Ediliyor" : "+ Takip Et"}
          </button>
        </div>

        {club.description && (
          <p className="mt-6 text-gray-600 leading-relaxed max-w-3xl">
            {club.description}
          </p>
        )}

        {club.tags && club.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-5">
            {club.tags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium border border-emerald-100">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
