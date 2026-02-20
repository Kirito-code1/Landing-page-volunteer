"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";
import { 
  Loader2, 
  MapPin, 
  Calendar, 
  ChevronLeft, 
  Share2, 
  Mail, 
  Info,
  AlertCircle
} from "lucide-react";

export default function EventPage() {
  const { id } = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchEvent() {
      try {
        setLoading(true);
        setError(null);

        // Самый простой и надежный запрос
        const { data, error: supabaseError } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .single();
        
        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        if (!data) {
          throw new Error("Событие не найдено в базе данных");
        }

        setEvent(data);
      } catch (err: any) {
        console.error("Ошибка при загрузке:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchEvent();
    }
  }, [id, supabase]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfdfd] gap-4">
        <Loader2 className="animate-spin text-[#10b981] w-12 h-12" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">Загружаем данные...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfdfd] p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-100 mb-6" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">Упс! Что-то пошло не так</h2>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-8">{error || "Событие не найдено"}</p>
        <button 
          onClick={() => router.push('/events')}
          className="px-8 py-4 bg-gray-900 text-white rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
        >
          Вернуться к списку
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfd] pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-8">
        
        {/* Кнопка назад */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#10b981] transition-all mb-8 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
          Назад к списку
        </button>

        <div className="bg-white rounded-[50px] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/40">
          
          {/* Блок с картинкой */}
          <div className="h-[400px] md:h-[550px] relative">
            <img 
              src={event.image_url || "https://images.unsplash.com/photo-1559027615-cd4451dff977?q=80&w=2069&auto=format&fit=crop"} 
              className="w-full h-full object-cover" 
              alt={event.title} 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-10 left-8 right-8 md:left-14 md:right-14">
              <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-none mb-6">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white/90 border border-white/10">
                  <MapPin size={16} className="text-[#10b981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{event.location}</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white/90 border border-white/10">
                  <Calendar size={16} className="text-[#10b981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {new Date(event.date).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Информация */}
          <div className="p-8 md:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
            
            <div className="lg:col-span-2">
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#10b981] mb-8 flex items-center gap-3">
                <Info size={16} /> Описание задачи
              </h2>
              
              {event.description ? (
                <div className="text-gray-600 font-medium leading-[1.8] text-lg whitespace-pre-wrap">
                  {event.description}
                </div>
              ) : (
                <div className="py-16 px-10 border-2 border-dashed border-gray-50 rounded-[40px] text-center bg-gray-50/30">
                   <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] italic">
                     Детальное описание проекта пока не добавлено
                   </p>
                </div>
              )}
            </div>

            {/* Правая колонка: Кнопки */}
            <div className="flex flex-col gap-4">
              <div className="p-10 bg-gray-900 rounded-[45px] text-white shadow-2xl shadow-gray-900/20">
                <h3 className="text-sm font-black uppercase italic mb-8 tracking-tighter text-center">
                  Нужна ваша помощь
                </h3>
                
                <div className="space-y-4">
                  <a 
                    href={`mailto:support@volohero.com?subject=Отклик: ${event.title}`}
                    className="w-full py-5 bg-[#10b981] text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-green-900/20 hover:bg-[#0da975] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                  >
                    Связаться <Mail size={18} />
                  </a>

                  <button 
                    onClick={handleShare}
                    className={`w-full py-5 rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] transition-all flex items-center justify-center gap-3 border ${
                      copied 
                      ? "bg-white text-gray-900 border-white scale-95" 
                      : "bg-transparent text-white border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {copied ? "Готово!" : "Поделиться"} <Share2 size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-4 px-6 text-center space-y-1">
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300">
                  ID: {event.id.toString().split('-')[0]}
                </p>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300">
                  Статус: Активно
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}