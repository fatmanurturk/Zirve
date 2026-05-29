"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Sparkles, X, Plus, Trash2, Send, PanelLeftClose, PanelLeftOpen,
  Calendar, Users, BarChart2, Megaphone, Copy, Check, MessageSquare,
} from "lucide-react";
import { useAIAssistantStore, ChatMode, Conversation, ChatMessage } from "@/store/aiAssistant";
import { useAuthStore } from "@/store/auth";

// ---------- Sabit veriler ----------
const MODES: { key: ChatMode; label: string; icon: React.ReactNode }[] = [
  { key: "general",    label: "Genel",      icon: <Sparkles className="w-3.5 h-3.5" /> },
  { key: "events",     label: "Etkinlikler", icon: <Calendar className="w-3.5 h-3.5" /> },
  { key: "volunteers", label: "Gönüllüler",  icon: <Users className="w-3.5 h-3.5" /> },
  { key: "reports",    label: "Raporlar",    icon: <BarChart2 className="w-3.5 h-3.5" /> },
];

function getChips(role?: string) {
  if (role === "organizer") {
    return [
      { icon: "📅", label: "Etkinlik Oluştur",   prompt: "Yeni bir doğa etkinliği oluşturmak istiyorum. Ne yapmalıyım?" },
      { icon: "👥", label: "Gönüllü Bul",         prompt: "Yaklaşan etkinliğim için nasıl gönüllü bulabilirim?" },
      { icon: "📊", label: "Rapor Al",             prompt: "Etkinliklerim hakkında özet bir rapor verir misin?" },
      { icon: "📢", label: "Duyuru Yaz",           prompt: "Etkinliğim için dikkat çekici bir duyuru metni yaz." },
    ];
  }
  return [
    { icon: "🔍", label: "Etkinlik Bul",          prompt: "Bana uygun açık etkinlikler neler?" },
    { icon: "🏔️", label: "Profil Analizi",        prompt: "Profilime göre hangi etkinlikler uygun olur?" },
    { icon: "📋", label: "Başvuru Durumu",         prompt: "Başvurularımın durumu hakkında bilgi ver." },
    { icon: "🗓️", label: "Bu Hafta Ne Var?",      prompt: "Bu hafta açık etkinlikler neler?" },
  ];
}

// ---------- Yardımcılar ----------
function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Bugün";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

// ---------- Markdown hafif render ----------
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="font-bold text-sm mt-2 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="font-bold text-base mt-2 mb-1">{line.slice(3)}</h2>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(<p key={i} className="font-semibold">{line.slice(2, -2)}</p>);
    } else if (line.startsWith("- ") || line.startsWith("• ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
          {inlineFormat(line.slice(2))}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-1.5" />);
    } else {
      elements.push(<p key={i} className="text-sm leading-relaxed">{inlineFormat(line)}</p>);
    }
  });

  return elements;
}

function inlineFormat(text: string): React.ReactNode {
  // **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  );
}

// ---------- Mesaj balonu ----------
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[72%] bg-emerald-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
          <p className="text-[10px] text-emerald-200 mt-1 text-right">{formatTime(msg.ts)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 mb-3 group">
      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
      </div>
      <div className="max-w-[78%]">
        <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
          <div className="text-slate-800 space-y-0.5">{renderMarkdown(msg.content)}</div>
          <p className="text-[10px] text-slate-400 mt-2">{formatTime(msg.ts)}</p>
        </div>
        <button
          onClick={copy}
          className="mt-1 ml-1 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
    </div>
  );
}

// ---------- Yazıyor göstergesi ----------
function TypingIndicator() {
  return (
    <div className="flex gap-2.5 mb-3">
      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Ana panel ----------
export default function AIAssistantPanel() {
  const {
    isOpen, close, sidebarOpen, toggleSidebar,
    conversations, activeId, mode, isTyping,
    newConversation, setActive, deleteConversation, setMode, sendMessage,
  } = useAIAssistantStore();

  const { user } = useAuthStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chips = getChips(user?.role);

  const activeConv: Conversation | undefined = conversations.find((c) => c.id === activeId);

  // ESC ile kapat
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  // Yeni mesaj gelince scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length, isTyping]);

  // Panel açılınca input focus
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
  }, [isOpen]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    await sendMessage(text);
  }, [input, isTyping, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChip = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const handleNew = () => {
    newConversation();
    setInput("");
  };

  if (!isOpen) return null;

  // --- Grup konuşmaları tarihe göre ---
  const grouped: { label: string; items: Conversation[] }[] = [];
  const today: Conversation[] = [], yesterday: Conversation[] = [], older: Conversation[] = [];
  const now = Date.now();
  conversations.forEach((c) => {
    const diff = now - c.createdAt;
    if (diff < 86400000) today.push(c);
    else if (diff < 172800000) yesterday.push(c);
    else older.push(c);
  });
  if (today.length)     grouped.push({ label: "Bugün", items: today });
  if (yesterday.length) grouped.push({ label: "Dün", items: yesterday });
  if (older.length)     grouped.push({ label: "Daha Önce", items: older });

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={close}
      />

      {/* Panel */}
      <div className="relative flex w-full h-full bg-slate-50 animate-in fade-in slide-in-from-bottom-4 duration-200">

        {/* ===== Sol sidebar ===== */}
        <aside
          className={`
            flex-shrink-0 flex flex-col bg-slate-900 text-white transition-all duration-200
            ${sidebarOpen ? "w-64" : "w-0 overflow-hidden"}
          `}
        >
          {/* Logo + toggle */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-sm">AI Asistan</span>
            </div>
            <button onClick={toggleSidebar} className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Konuşma listesi */}
          <div className="flex-1 overflow-y-auto py-2 min-w-0">
            {conversations.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500">Henüz sohbet yok</p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                  {group.items.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                        activeId === conv.id
                          ? "bg-slate-700 text-white"
                          : "hover:bg-slate-800 text-slate-300"
                      }`}
                      onClick={() => setActive(conv.id)}
                    >
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                      <span className="flex-1 text-xs truncate">{conv.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-600 transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Yeni sohbet butonu */}
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={handleNew}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni Sohbet
            </button>
          </div>
        </aside>

        {/* ===== Sağ: Aktif Sohbet ===== */}
        <div className="flex-1 flex flex-col min-w-0 h-full">

          {/* Üst bar */}
          <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* Sidebar aç/kapat (gizliyse göster) */}
              {!sidebarOpen && (
                <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}

              {/* Mod seçici */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMode(m.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mode === m.key
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {m.icon}
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kullanıcı + kapat */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-[10px]">
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.full_name}</span>
                </div>
              )}
              <button
                onClick={close}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Mesaj alanı */}
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            {!activeConv || activeConv.messages.length === 0 ? (
              <WelcomeScreen userName={user?.full_name} mode={mode} />
            ) : (
              <>
                {activeConv.messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input alanı */}
          <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 pt-3 pb-4">
            {/* Hızlı chiplar */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleChip(chip.prompt)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent text-slate-600 text-xs rounded-full transition-all"
                >
                  <span>{chip.icon}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 flex items-end bg-slate-100 rounded-2xl px-4 py-2.5 gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Bir şeyler yazın… (Enter gönderin, Shift+Enter yeni satır)"
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 resize-none outline-none max-h-36 leading-relaxed"
                  style={{ minHeight: "24px" }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-10 h-10 flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition-all flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">
              AI yanıtları hata içerebilir. Önemli kararlar için doğrulayın.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Karşılama ekranı ----------
function WelcomeScreen({ userName, mode }: { userName?: string; mode: ChatMode }) {
  const modeDesc: Record<ChatMode, string> = {
    general:    "Etkinlikler, gönüllülük ve platform hakkında her şeyi sorabilirsin.",
    events:     "Etkinlik oluşturma, yönetme ve planlama konularında yardımcı olurum.",
    volunteers: "Gönüllü bulma, eşleştirme ve koordinasyon için buradayım.",
    reports:    "İstatistik, analiz ve raporlar için sorularını sor.",
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16 px-8 max-w-lg mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        {userName ? `Merhaba, ${userName.split(" ")[0]}! 👋` : "Zirve AI Asistanı"}
      </h2>
      <p className="text-slate-500 text-sm leading-relaxed mb-8">
        {modeDesc[mode]}
      </p>
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          "Bu hafta hangi etkinlikler var?",
          "Profilime uygun etkinlik öner",
          "Başlangıç seviyesi etkinlikler?",
          "Ankara'da doğa yürüyüşü var mı?",
        ].map((s) => {
          const { sendMessage } = useAIAssistantStore.getState();
          return (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-left p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 transition-all leading-relaxed"
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
