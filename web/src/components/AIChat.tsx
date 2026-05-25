"use client";

import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { useAIChatStore } from "@/store/aiChat";

type Message = {
  role: "user" | "assistant";
  text: string;
  city?: string;
  activity?: string;
};

type AIIntentResponse = {
  city?: string;
  activity?: string;
  model_text?: string;
};

const SUGGESTIONS = [
  "Bu hafta açık etkinlikler neler?",
  "Ankara'da hiking önerir misin?",
  "Başlangıç seviyesi için uygun etkinlik var mı?",
];

export default function AIChat() {
  const { open, toggle, setOpen } = useAIChatStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Merhaba! Ben Zirve'nin AI asistanıyım. Doğa sporları etkinlikleri hakkında sana yardımcı olabilirim. Şehir, etkinlik türü veya tarih bilgisiyle arama yapabilirsin!",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post<AIIntentResponse>("/api/v1/ai/intent", {
        message: trimmed,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.model_text ?? "Yanıt alınamadı.",
          city: data.city ?? undefined,
          activity: data.activity ?? undefined,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Üzgünüm, şu an servise bağlanamıyorum. Lütfen biraz sonra tekrar dene.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={toggle}
        aria-label="AI Asistan"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
      >
        {open ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 16a2 2 0 01-2 2H7l-4 4V6a2 2 0 012-2h14a2 2 0 012 2v10z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex w-80 flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 sm:w-96" style={{ maxHeight: "520px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-emerald-600 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white text-sm font-bold">
              AI
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Zirve Asistanı</p>
              <p className="text-xs text-emerald-100">Etkinlik arama ve öneri</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: 0, maxHeight: "320px" }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-emerald-600 text-white rounded-br-sm"
                      : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                  {msg.role === "assistant" && (msg.city || msg.activity) && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {msg.city && (
                        <span className="inline-block rounded-full bg-white/60 px-2 py-0.5 text-xs text-slate-600">
                          📍 {msg.city}
                        </span>
                      )}
                      {msg.activity && (
                        <span className="inline-block rounded-full bg-white/60 px-2 py-0.5 text-xs text-slate-600">
                          🏔️ {msg.activity}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2">
                  <span className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions (only on first message) */}
          {messages.length === 1 && (
            <div className="border-t border-slate-100 px-4 py-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 transition hover:bg-emerald-100"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="border-t border-slate-100 p-3 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Etkinlik sor..."
              disabled={loading}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-40"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
