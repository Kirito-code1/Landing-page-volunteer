"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  Loader2, 
  MapPin, 
  Heart, 
  X,
  Calendar,
  Trash2,
  Edit3,
  ImageIcon,
  AlignLeft
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    location: "",
    date: "",
    time: "",
    description: ""
  });

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ), []);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      setUser(session.user);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      if (eventsData) setMyEvents(eventsData);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Вы уверены, что хотите удалить это объявление?")) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      setMyEvents(myEvents.filter(event => event.id !== id));
    } catch (err: any) {
      alert("Ошибка при удалении: " + err.message);
    }
  };

  const openEditModal = (event: any) => {
    const eventDate = new Date(event.date);
    setEditingId(event.id);
    setFormData({
      title: event.title,
      location: event.location,
      date: eventDate.toISOString().split('T')[0],
      time: eventDate.toTimeString().slice(0, 5),
      description: event.description || ""
    });
    setImagePreview(event.image_url);
    setIsModalOpen(true);
  };

  const closeAndReset = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({ title: "", location: "", date: "", time: "", description: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = imagePreview;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const combinedDateTime = `${formData.date}T${formData.time}:00`;
      const payload = {
        title: formData.title,
        location: formData.location,
        date: combinedDateTime,
        image_url: finalImageUrl,
        description: formData.description,
        user_id: user.id,
      };

      if (editingId) {
        const { error } = await supabase.from("events").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert([payload]);
        if (error) throw error;
      }

      closeAndReset();
      fetchData(); 
    } catch (err: any) {
      alert("Ошибка: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#10b981]" />
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest italic">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfd] font-sans overflow-x-hidden">
      
      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-[600px] rounded-[30px] md:rounded-[40px] shadow-2xl animate-in zoom-in-95 border border-gray-100 my-auto">
            <div className="p-6 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
                  {editingId ? "Изменить" : "Создать"}
                </h2>
                <button onClick={closeAndReset} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Фотография */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Фотография</label>
                  <div className="relative h-32 w-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:border-[#10b981]/50 transition-colors cursor-pointer group">
                    {imagePreview ? (
                      <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400 group-hover:text-[#10b981]">
                        <ImageIcon size={24} className="mb-2" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Выбрать файл</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* Название */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Название</label>
                  <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] outline-none font-bold text-gray-900" placeholder="Название события" />
                </div>

                {/* Дата и Время */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Дата</label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Время</label>
                    <input required type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900" />
                  </div>
                </div>

                {/* Место */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Место</label>
                  <input required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900" placeholder="Локация" />
                </div>

                {/* Описание (Добавлено) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">Описание</label>
                  <textarea 
                    rows={4}
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none resize-none" 
                    placeholder="Расскажите подробнее о задаче..."
                  />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-[#10b981] text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-green-200 mt-2 hover:bg-[#0da975] transition-all disabled:bg-gray-200">
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : editingId ? "Обновить" : "Опубликовать"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                <Heart className="w-7 h-7 fill-current" />
             </div>
             <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">VoloHero</h1>
                <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] mt-2">Личный кабинет героя: {user?.user_metadata?.full_name?.split(" ")[0]}</p>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-[#10b981] text-white rounded-[22px] font-black italic uppercase text-[10px] tracking-widest shadow-xl shadow-green-100/50 hover:bg-[#0da975] hover:scale-105 transition-all"
            >
              <PlusCircle size={18} /> Создать пост
            </button>
          </div>
        </header>

        <div className="mb-20">
          <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
            Ваши публикации
            <span className="text-[#10b981] text-sm not-italic font-bold bg-green-50 px-3 py-1 rounded-full">{myEvents.length}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {myEvents.length > 0 ? (
              myEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group">
                  <div className="w-full h-52 relative overflow-hidden">
                    <img src={event.image_url || "/api/placeholder/400/400"} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                  </div>
                  <div className="p-8 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-black text-gray-900 text-xl italic uppercase tracking-tighter line-clamp-2 min-h-[3.5rem]">{event.title}</h3>
                      <div className="space-y-2 mt-4">
                        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#10b981]" /> {event.location}
                        </p>
                        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#10b981]" /> {new Date(event.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-6 mt-8 border-t border-gray-50 pt-6">
                        <button onClick={() => openEditModal(event)} className="text-[10px] font-black uppercase text-[#10b981] flex items-center gap-1.5 hover:tracking-widest transition-all">
                          <Edit3 size={14} /> Изменить
                        </button>
                        <button onClick={() => handleDelete(event.id)} className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1.5 hover:tracking-widest transition-all">
                          <Trash2 size={14} /> Удалить
                        </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 bg-white rounded-[60px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center px-10">
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] mb-10 italic">Список пуст...</p>
                <button onClick={() => setIsModalOpen(true)} className="px-12 py-5 bg-gray-900 text-white rounded-[26px] font-black italic uppercase text-[10px] tracking-widest transition-all">
                  Создать объявление
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}