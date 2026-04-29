"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { getOrganization } from "../../../lib/api/organizations";
import ClubHeader from "./components/ClubHeader";
import ClubStats from "./components/ClubStats";
import EventTabs from "./components/EventTabs";
import { useEffect } from "react";

export default function ClubProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clubId = params.id as string;

  const { data: club, isLoading, isError, error } = useQuery({
    queryKey: ["club", clubId],
    queryFn: () => getOrganization(clubId),
    retry: false
  });

  useEffect(() => {
    if (isError && (error as any)?.response?.status === 404) {
      router.push("/404");
    }
  }, [isError, error, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-xl mb-8"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="h-10 w-64 bg-gray-200 rounded-md mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!club) {
    return null; // Will redirect or show empty
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <ClubHeader club={club} />
        
        {club.stats && (
          <ClubStats stats={club.stats} />
        )}
        
        <EventTabs clubId={clubId} />
      </div>
    </div>
  );
}
