"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import api from "@/lib/api";

export type ChatRole = "user" | "assistant";
export type ChatMode = "general" | "events" | "volunteers" | "reports";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  ts: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  mode: ChatMode;
}

interface AIAssistantState {
  isOpen: boolean;
  sidebarOpen: boolean;
  conversations: Conversation[];
  activeId: string | null;
  mode: ChatMode;
  isTyping: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleSidebar: () => void;

  newConversation: () => string;
  setActive: (id: string) => void;
  deleteConversation: (id: string) => void;
  setMode: (mode: ChatMode) => void;

  sendMessage: (text: string) => Promise<void>;
}

const genId = () => Math.random().toString(36).slice(2, 10);

const titleFromMessage = (text: string) =>
  text.length > 40 ? text.slice(0, 40) + "…" : text;

export const useAIAssistantStore = create<AIAssistantState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      sidebarOpen: true,
      conversations: [],
      activeId: null,
      mode: "general",
      isTyping: false,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      newConversation: () => {
        const id = genId();
        const conv: Conversation = {
          id,
          title: "Yeni Sohbet",
          messages: [],
          createdAt: Date.now(),
          mode: get().mode,
        };
        set((s) => ({
          conversations: [conv, ...s.conversations],
          activeId: id,
        }));
        return id;
      },

      setActive: (id) => set({ activeId: id }),

      deleteConversation: (id) =>
        set((s) => {
          const filtered = s.conversations.filter((c) => c.id !== id);
          const activeId =
            s.activeId === id ? (filtered[0]?.id ?? null) : s.activeId;
          return { conversations: filtered, activeId };
        }),

      setMode: (mode) => set({ mode }),

      sendMessage: async (text: string) => {
        const state = get();
        let convId = state.activeId;

        // Aktif konuşma yoksa yeni oluştur
        if (!convId || !state.conversations.find((c) => c.id === convId)) {
          convId = get().newConversation();
        }

        const userMsg: ChatMessage = {
          id: genId(),
          role: "user",
          content: text,
          ts: Date.now(),
        };

        // Kullanıcı mesajını ekle
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  messages: [...c.messages, userMsg],
                  title:
                    c.messages.length === 0 ? titleFromMessage(text) : c.title,
                }
              : c
          ),
          isTyping: true,
        }));

        // Geçmiş mesajları al (son 10)
        const conv = get().conversations.find((c) => c.id === convId);
        const history = (conv?.messages ?? [])
          .slice(-11, -1)
          .map((m) => ({ role: m.role, content: m.content }));

        try {
          const res = await api.post<{ reply: string }>("/api/v1/ai/chat", {
            message: text,
            mode: get().mode,
            history,
          });

          const assistantMsg: ChatMessage = {
            id: genId(),
            role: "assistant",
            content: res.data.reply,
            ts: Date.now(),
          };

          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === convId
                ? { ...c, messages: [...c.messages, assistantMsg] }
                : c
            ),
            isTyping: false,
          }));
        } catch {
          const errMsg: ChatMessage = {
            id: genId(),
            role: "assistant",
            content: "Bir hata oluştu. Lütfen tekrar deneyin.",
            ts: Date.now(),
          };
          set((s) => ({
            conversations: s.conversations.map((c) =>
              c.id === convId
                ? { ...c, messages: [...c.messages, errMsg] }
                : c
            ),
            isTyping: false,
          }));
        }
      },
    }),
    {
      name: "zirve-ai-assistant",
      partialize: (s) => ({
        conversations: s.conversations.slice(0, 20),
        activeId: s.activeId,
        mode: s.mode,
      }),
    }
  )
);
