"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User } from "@supabase/supabase-js"; // Импортируем тип для юзера
import {
  User as UserIcon,
  Mail,
  LogOut,
  ShieldCheck,
  Camera,
  Loader2,
  Phone,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  
  // Явно указываем тип <User | null>, чтобы TS не ругался на user_metadata
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ), []);

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) throw error;

      if (session?.user) {
        setUser(session.user);
        setNewName(session.user.user_metadata?.full_name || "");
        setNewPhone(session.user.user_metadata?.phone || "");
        setLoading(false);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Auth error:", err);
      return false;
    }
  }, [supabase]);

  useEffect(() => {
    const checkAuth = async () => {
      const hasSession = await fetchUser();
      if (!hasSession) {
        router.push("/auth/login");
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        router.push("/auth/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchUser, router, supabase]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file || !user) return;

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      await supabase.auth.updateUser({ 
        data: { avatar_url: publicUrl } 
      });

      await fetchUser();
    } catch {
      alert("Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: newName, phone: newPhone },
    });
    
    if (!error) {
      await fetchUser();
      setIsEditModalOpen(false);
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#10b981]" />
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Загрузка...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500">
        
        {/* Profile Card */}
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="h-40 bg-gradient-to-br from-[#10b981] to-[#3b82f6]" />
          <div className="px-10 pb-10">
            <div className="relative -mt-20 mb-6 flex justify-between items-end">
              <div className="w-40 h-40 bg-white rounded-[38px] p-1.5 shadow-2xl overflow-hidden relative">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover rounded-[32px]"
                    alt="Avatar"
                    unoptimized
                  />
                ) : (
                   <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-[32px]">
                      <UserIcon className="w-16 h-16 text-gray-200" />
                   </div>
                )}
                <label className="absolute bottom-2 right-2 p-3 bg-[#10b981] text-white rounded-2xl cursor-pointer hover:scale-110 transition-transform shadow-lg">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                  <input type="file" className="hidden" onChange={handleAvatarUpload} disabled={uploading} accept="image/*" />
                </label>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)} 
                className="px-8 py-4 bg-gray-900 text-white rounded-[22px] font-black hover:bg-black transition-all active:scale-95 shadow-lg"
              >
                Настроить
              </button>
            </div>
            
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
                {user.user_metadata?.full_name || "Участник"}
                <ShieldCheck className="w-6 h-6 text-[#10b981]" />
              </h1>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">ID: {user.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm space-y-6">
            <div>
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Почта
              </p>
              <p className="font-bold text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1 flex items-center gap-2">
                <Phone className="w-3 h-3" /> Телефон
              </p>
              <p className="font-bold text-gray-900">{user.user_metadata?.phone || "Не указан"}</p>
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm flex flex-col justify-center">
             <button 
               onClick={handleLogout} 
               className="w-full py-4 bg-gray-50 text-gray-900 rounded-[22px] font-black hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
             >
               <LogOut className="w-5 h-5" /> Выйти
             </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95">
            <h2 className="text-2xl font-black mb-6">Редактировать</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <input 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)} 
                className="w-full p-5 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold" 
                placeholder="Имя" 
              />
              <input 
                value={newPhone} 
                onChange={(e) => setNewPhone(e.target.value)} 
                className="w-full p-5 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold" 
                placeholder="Телефон" 
              />
              <div className="pt-4 flex flex-col gap-2">
                <button 
                  type="submit"
                  disabled={isSaving} 
                  className="w-full py-5 bg-[#10b981] text-white rounded-2xl font-black shadow-lg hover:bg-[#0da975] transition-all"
                >
                  {isSaving ? "Загрузка..." : "Сохранить"}
                </button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full py-2 text-gray-400 font-bold">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
