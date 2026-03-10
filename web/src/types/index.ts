export type UserRole = "volunteer" | "organizer";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export type EventCategory = "hiking" | "climbing" | "skiing" | "cycling" | "other";
export type EventDifficulty = "easy" | "medium" | "hard" | "expert";
export type EventStatus = "open" | "closed" | "completed";

export interface Event {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  difficulty: EventDifficulty;
  status: EventStatus;
  location_name: string;
  latitude: number;
  longitude: number;
  start_date: string;
  end_date: string;
  max_volunteers: number;
  requirements?: string;
  created_by: string;
  organization_id?: string;
  created_at: string;
}

export interface EventListResponse {
  items: Event[];
  total: number;
}

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Application {
  id: string;
  event_id: string;
  volunteer_id: string;
  motivation_letter?: string;
  status: ApplicationStatus;
  reviewer_note?: string;
  checked_in: boolean;
  checked_in_at?: string;
  applied_at: string;
  created_at: string;
}

export interface ApplicationListResponse {
  items: Application[];
  total: number;
}

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  logo_url?: string;
  website?: string;
  is_verified: boolean;
  created_at: string;
}

export interface VolunteerProfile {
  id: string;
  user_id: string;
  bio?: string;
  experience_level: "beginner" | "intermediate" | "expert";
  max_altitude_m?: number;
  total_impact_score: number;
  city?: string;
  emergency_contact?: Record<string, string>;
  equipment_list: VolunteerEquipment[];
}

export interface VolunteerEquipment {
  id: string;
  equipment_type: string;
  brand?: string;
  condition: string;
  verified: boolean;
}

export interface UserStats {
  total_applications: number;
  approved_applications: number;
  checked_in_count: number;
  total_impact_score: number;
  badge_count: number;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon_url?: string;
  category: string;
  score_threshold: number;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_from_event_id?: string;
  earned_at: string;
  badge: Badge;
}