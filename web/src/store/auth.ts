import { create } from "zustand";
import { User } from "@/types";
import api from "@/lib/api";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role: "volunteer" | "organizer";
  phone?: string;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/api/v1/auth/login", { email, password });
      const token = res.data.access_token;
      localStorage.setItem("token", token);
      set({ token, isLoading: false });
      const me = await api.get("/api/v1/auth/me");
      set({ user: me.data, isAuthenticated: true });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post("/api/v1/auth/register", data);
      const token = res.data.access_token;
      localStorage.setItem("token", token);
      set({ token, isLoading: false });
      const me = await api.get("/api/v1/auth/me");
      set({ user: me.data, isAuthenticated: true });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = "/login";
  },

  fetchMe: async () => {
    try {
      const me = await api.get("/api/v1/auth/me");
      set({ user: me.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));