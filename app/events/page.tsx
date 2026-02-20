"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, Search, MapPin, Calendar, ArrowRight, Heart } from "lucide-react";
import Link from "next/link";

export default function AllEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getEvents() {
      const { data } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (data) setEvents(data);
      setLoading(false);
    }
    getEvents();
  }, []);

  // Фильтрация для поиска
  const filteredEvents = events.filter(event => 
    event.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcfdfd]">
      <Loader2 className="animate-spin text-[#10b981] w-10 h-10" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fcfdfd] py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-8">
            <div className="text-center md:text-left">
                <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter text-gray-900 leading-none">
                    Найти <span className="text-[#10b981]">Героя</span>
                </h1>
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3 ml-1">Все актуальные задачи города</p>
            </div>
            
            <div className="relative w-full max-w-md">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ПОИСК ПО КЛЮЧЕВЫМ СЛОВАМ..." 
                    className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[30px] shadow-sm outline-none focus:border-[#10b981] transition-all font-bold uppercase text-[10px] tracking-widest"
                />
            </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredEvents.map((event) => (
                <Link 
                  href={`/events/${event.id}`} 
                  key={event.id} 
                  className="group bg-white rounded-[45px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl hover:shadow-green-100/40 transition-all duration-500 flex flex-col"
                >
                    <div className="h-64 overflow-hidden relative">
                        <img 
                          src={event.image_url || "/placeholder.jpg"} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                          alt={event.title} 
                        />
                        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest text-gray-900 shadow-sm">
                            {event.location?.split(',')[0] || "Локация"}
                        </div>
                    </div>
                    
                    <div className="p-8 flex-1 flex flex-col">
                        <div className="flex-1">
                            <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tighter mb-4 leading-tight group-hover:text-[#10b981] transition-colors line-clamp-2">
                                {event.title}
                            </h3>
                            
                            <div className="flex flex-col gap-2 mb-6">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <MapPin size={14} className="text-[#10b981]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-2 text-gray-400">
                                    <Calendar size={14} className="text-[#10b981]" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">
                                        {new Date(event.date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 py-5 border-t border-gray-50">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 group-hover:translate-x-1 transition-transform flex items-center gap-2">
                                Подробнее <ArrowRight size={14} />
                            </span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 font-black uppercase text-xs tracking-widest italic">Ничего не найдено...</p>
          </div>
        )}
      </div>
    </div>
  );
}