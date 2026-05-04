"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Search, Mountain, TreePine, Users, Flame, 
  MapPin, Calendar, Filter, Loader2, ChevronRight 
} from "lucide-react";
import api from "@/lib/api";

const categoryIcons: any = {
  hiking: <Mountain className="w-16 h-16 text-emerald-600 opacity-10 absolute -bottom-4 -right-4" />,
  climbing: <Mountain className="w-16 h-16 text-orange-600 opacity-10 absolute -bottom-4 -right-4" />,
  environment: <TreePine className="w-16 h-16 text-emerald-600 opacity-10 absolute -bottom-4 -right-4" />,
  rescue: <Users className="w-16 h-16 text-rose-600 opacity-10 absolute -bottom-4 -right-4" />,
  other: <Flame className="w-16 h-16 text-purple-600 opacity-10 absolute -bottom-4 -right-4" />,
};

const categoryLabels: any = {
  hiking: "Yürüyüş",
  climbing: "Tırmanış",
  environment: "Çevre & Doğa",
  rescue: "Arama Kurtarma",
  other: "Diğer"
};

const difficultyLabels: any = {
  easy: "Kolay",
  medium: "Orta",
  hard: "Zor",
  expert: "Uzman",
};

const categoryEmojis: any = {
  hiking: "⛰️",
  climbing: "🧗",
  environment: "🌲",
  rescue: "🚁",
  other: "🔥"
};

const categoryBgColors: any = {
  hiking: "bg-emerald-50",
  climbing: "bg-orange-50",
  environment: "bg-emerald-50",
  rescue: "bg-rose-50",
  other: "bg-purple-50",
};

export default function EventsPage() {
  const router = useRouter();
  
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/v1/events/?status=open&limit=100");
      if (res.data && res.data.items) {
        setEvents(res.data.items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryToggle = (catKey: string) => {
    setSelectedCategories(prev => 
      prev.includes(catKey) ? prev.filter(c => c !== catKey) : [...prev, catKey]
    );
  };

  const handleDifficultyToggle = (diffKey: string) => {
    setSelectedDifficulties(prev => 
      prev.includes(diffKey) ? prev.filter(d => d !== diffKey) : [...prev, diffKey]
    );
  };

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        !query || 
        event.title?.toLowerCase().includes(query) || 
        event.location_name?.toLowerCase().includes(query);

      const matchesCategory = 
        selectedCategories.length === 0 || 
        selectedCategories.includes(event.category);

      const matchesDifficulty = 
        selectedDifficulties.length === 0 || 
        selectedDifficulties.includes(event.difficulty);

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [events, searchQuery, selectedCategories, selectedDifficulties]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans">
      
      {/* Header Container */}
      <div className="bg-white border-b border-slate-200 pt-24 pb-12 px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-sm text-emerald-600 font-bold mb-3 flex items-center gap-2 tracking-wide uppercase">
              <Link href="/" className="hover:text-emerald-700">Ana Sayfa</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-slate-400">Keşfet</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">Yeni Maceralar Keşfet</h1>
            <p className="text-slate-500 font-medium max-w-xl text-lg">Doğa yürüyüşleri, arama kurtarma eğitimleri ve sosyal sorumluluk projeleri seni bekliyor.</p>
          </div>
          
          <div className="relative w-full md:w-[28rem] group">
            <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
            </div>
            <input 
              type="text" 
              placeholder="Etkinlik veya şehir ara..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-medium rounded-full py-4 pl-14 pr-6 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col lg:flex-row gap-10">
        
        {/* Left Sidebar: Filters */}
        <div className="w-full lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/50 sticky top-28">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                 <Filter className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Filtreler</h2>
            </div>
            
            <div className="space-y-10">
              {/* Category Filter */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 border-b border-slate-100 pb-3">Kategoriler</h3>
                <div className="space-y-4">
                  {Object.keys(categoryLabels).map(catKey => (
                    <label key={catKey} onClick={() => handleCategoryToggle(catKey)} className="flex items-center gap-4 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-md border-2 ${selectedCategories.includes(catKey) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-300'} flex items-center justify-center transition-all group-hover:border-emerald-400 shadow-sm`}>
                        {selectedCategories.includes(catKey) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-base font-medium ${selectedCategories.includes(catKey) ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        {categoryLabels[catKey]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Difficulty Filter */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5 border-b border-slate-100 pb-3">Zorluk Seviyesi</h3>
                <div className="space-y-4">
                  {Object.keys(difficultyLabels).map(diffKey => (
                    <label key={diffKey} onClick={() => handleDifficultyToggle(diffKey)} className="flex items-center gap-4 cursor-pointer group">
                      <div className={`w-6 h-6 rounded-md border-2 ${selectedDifficulties.includes(diffKey) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-300'} flex items-center justify-center transition-all group-hover:border-emerald-400 shadow-sm`}>
                        {selectedDifficulties.includes(diffKey) && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className={`text-base font-medium ${selectedDifficulties.includes(diffKey) ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                        {difficultyLabels[diffKey]}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedCategories.length > 0 || selectedDifficulties.length > 0 || searchQuery) && (
              <button 
                onClick={() => {
                  setSelectedCategories([]);
                  setSelectedDifficulties([]);
                  setSearchQuery("");
                }}
                className="w-full mt-10 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-sm font-bold transition-all shadow-sm active:scale-95"
              >
                Filtreleri Temizle
              </button>
            )}
          </div>
        </div>

        {/* Right Content: Event Grid */}
        <div className="flex-1">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg">{filteredEvents.length}</span> 
              <span className="text-slate-400 font-medium text-xl">etkinlik bulundu</span>
            </h2>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-24 text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm">
               <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-6" />
               <p className="font-bold animate-pulse text-lg">Zirve Rotaları Taranıyor...</p>
             </div>
          ) : filteredEvents.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-28 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-sm">
               <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center mb-6 shadow-inner border border-slate-100">
                 <Search className="w-10 h-10 text-slate-300" />
               </div>
               <h3 className="text-2xl font-bold text-slate-900 mb-3">Hiçbir Sonuç Bulunamadı</h3>
               <p className="text-slate-500 max-w-sm font-medium text-lg leading-relaxed">
                 Aradığınız kriterlere uygun açık bir etkinlik bulamadık. Daha geniş bir arama yapmayı deneyin.
               </p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredEvents.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => router.push(`/events/${event.id}`)}
                  className="rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-emerald-900/5 transition-all flex flex-col cursor-pointer group hover:-translate-y-1"
                >
                  <div className={`h-48 ${categoryBgColors[event.category] || "bg-slate-50"} flex items-center justify-center relative overflow-hidden transition-colors border-b border-slate-100`}>
                     {categoryIcons[event.category] || categoryIcons["other"]}
                     <span className="text-7xl drop-shadow-md z-10 relative group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                       {categoryEmojis[event.category] || "🏕️"}
                     </span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="mb-auto">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="inline-block px-3 py-1.5 rounded-full bg-slate-100 text-[11px] font-black text-slate-600 border border-slate-200 uppercase tracking-wide">
                          {categoryLabels[event.category] || event.category}
                        </span>
                        <span className="inline-block px-3 py-1.5 rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                          {difficultyLabels[event.difficulty] || event.difficulty}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xl text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-emerald-700 transition-colors">{event.title}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-2 mb-2 font-medium"><Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" /> <span className="truncate">{new Date(event.start_date).toLocaleDateString("tr-TR")}</span></p>
                      <p className="text-slate-500 text-sm mb-6 flex items-center gap-2 font-medium"><MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0" /> <span className="truncate">{event.location_name || "Konum Gizli"}</span></p>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-100">
                      <p className="text-sm font-bold text-slate-400">
                        {event.max_volunteers ? <><span className="text-emerald-600 text-base">{event.max_volunteers}</span> yer kaldı</> : "Sınırsız Katılım"}
                      </p>
                      <button className="px-6 py-2.5 rounded-full bg-slate-50 group-hover:bg-emerald-600 text-slate-700 group-hover:text-white text-sm font-bold border border-slate-200 group-hover:border-emerald-600 transition-all shadow-sm group-hover:shadow-md">
                        Göz At
                      </button>
                    </div>
                    {event.organization_name && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-xs text-slate-500 font-medium truncate">{event.organization_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
