import api from "../api";

export interface OrganizationStats {
  followers: number;
  active_volunteers: number;
  completed_events: number;
  total_hours: number;
}

export interface OrganizationProfile {
  id: string;
  name: string;
  city?: string;
  category?: string;
  description?: string;
  logo_url?: string;
  tags: string[];
  stats: OrganizationStats;
}

export interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location_name?: string;
  city?: string;
  max_volunteers?: number;
  status: string;
  applications?: any[];
}

export const getOrganization = async (id: string): Promise<OrganizationProfile> => {
  const { data } = await api.get(`/api/v1/organizations/${id}`);
  return data;
};

export const getOrganizationEvents = async (id: string, status?: string): Promise<{ items: Event[], total: number }> => {
  const params = status ? { app_status: status } : {};
  const { data } = await api.get(`/api/v1/organizations/${id}/events`, { params });
  return data;
};

export const followOrganization = async (id: string): Promise<{ status: string }> => {
  const { data } = await api.post(`/api/v1/organizations/${id}/follow`);
  return data;
};
