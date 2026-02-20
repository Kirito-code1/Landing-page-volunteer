"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { User as SupabaseUser } from "@supabase/supabase-js";
import { User, LogOut, ShieldCheck, Camera, Loader2, Mail, Phone, Trash2, X, AlertTriangle } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false); 
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const supabase = useMemo(() => 
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    ), 
  []);

  const fetchUser = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser) {
        setNewName(currentUser.user_metadata?.full_name || "");
        setNewPhone(currentUser.user_metadata?.phone || "");
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user:", error);
      return false;
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const hasUser = await fetchUser();
      if (!isMounted) return;
      if (!hasUser) {
        router.push("/auth/login");
        return;
      }
      setLoading(false);
    };
    init();
    return () => { isMounted = false; };
  }, [fetchUser, router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file || !user) return;
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      await fetchUser();
    } catch (error) {
        console.error("Upload error:", error);
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

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('delete_user_forever');
      if (error) throw error;
      await supabase.auth.signOut();
      router.push("/auth/login");
    } catch (error: any) {
      console.error("Delete account error:", error);
      alert("Ошибка при удалении: " + error.message);
    } finally {
      setIsSaving(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#10b981]" />
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest text-center">Загрузка профиля...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10 px-4">
      <div className="max-w-3xl mx-auto py-6 md:py-12 animate-in fade-in duration-500">
        
        {/* Карточка профиля */}
        <div className="bg-white rounded-[30px] md:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-6 md:mb-8">
          <div className="h-32 md:h-40 bg-gradient-to-br from-[#10b981] to-[#3b82f6]" />
          <div className="px-6 md:px-10 pb-8 md:pb-10">
            <div className="relative -mt-16 md:-mt-20 mb-4 md:mb-6 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4">
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-[28px] md:rounded-[38px] p-1 shadow-2xl overflow-hidden relative group">
                {user.user_metadata?.avatar_url ? (
                  <Image src={user.user_metadata.avatar_url} width={160} height={160} className="w-full h-full object-cover rounded-[24px] md:rounded-[32px]" alt="Профиль" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-[24px] md:rounded-[32px]">
                    <User className="w-12 h-12 md:w-20 md:h-20 text-gray-200" />
                  </div>
                )}
                <label className="absolute bottom-1 right-1 md:bottom-2 md:right-2 p-2.5 md:p-3 bg-[#10b981] text-white rounded-xl md:rounded-2xl cursor-pointer hover:scale-110 transition-transform shadow-lg">
                  {uploading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : <Camera className="w-4 h-4 md:w-5 md:h-5" />}
                  <input type="file" className="hidden" onChange={handleAvatarUpload} disabled={uploading} accept="image/*" />
                </label>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)} 
                className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-gray-900 text-white rounded-[18px] md:rounded-[22px] font-black hover:bg-black transition-all active:scale-95 shadow-lg text-sm md:text-base"
              >
                Настроить
              </button>
            </div>
            
            <div className="text-center sm:text-left">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 flex items-center justify-center sm:justify-start gap-2 md:gap-3">
                {user.user_metadata?.full_name || "Участник"}
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 text-[#10b981]" />
              </h1>
              <p className="text-gray-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest mt-1">ID: {user.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Инфо и Кнопки */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white p-6 md:p-8 rounded-[25px] md:rounded-[35px] border border-gray-100 shadow-sm space-y-4 md:space-y-6">
            <div>
              <p className="text-gray-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-1 flex items-center gap-2">
                <Mail className="w-3 h-3" /> Почта
              </p>
              <p className="font-bold text-gray-900 text-sm md:text-base break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-1 flex items-center gap-2">
                <Phone className="w-3 h-3" /> Телефон
              </p>
              <p className="font-bold text-gray-900 text-sm md:text-base">{user.user_metadata?.phone || "Не указан"}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-4">
             <button onClick={handleLogout} className="w-full py-4 md:py-5 bg-white text-gray-900 border border-gray-100 rounded-[20px] md:rounded-[22px] font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm md:text-base">
               <LogOut className="w-4 h-4 md:w-5 md:h-5" /> Выйти
             </button>
             <button onClick={() => setConfirmDeleteOpen(true)} className="w-full py-4 md:py-5 bg-red-50 text-red-500 rounded-[20px] md:rounded-[22px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm md:text-base">
               <Trash2 className="w-4 h-4 md:w-5 md:h-5" /> Удалить аккаунт
             </button>
          </div>
        </div>
      </div>

      {/* Модалка редактирования */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 text-gray-900">Редактировать профиль</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Имя</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-4 md:p-5 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold text-sm md:text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">Телефон</label>
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full p-4 md:p-5 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold text-sm md:text-base" />
              </div>
              <div className="pt-2 md:pt-4 space-y-2 md:space-y-3">
                <button type="submit" disabled={isSaving} className="w-full py-4 md:py-5 bg-[#10b981] text-white rounded-xl md:rounded-2xl font-black shadow-lg hover:bg-[#0da975] transition-all disabled:opacity-50 text-sm md:text-base">
                  {isSaving ? "Сохранение..." : "Сохранить изменения"}
                </button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full text-gray-400 font-bold py-2 text-sm md:text-base">Отмена</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка подтверждения удаления */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-sm rounded-[30px] md:rounded-[40px] p-8 md:p-10 text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-red-50 text-red-500 rounded-2xl md:rounded-[24px] flex items-center justify-center mx-auto mb-4 md:mb-6">
              <AlertTriangle className="w-8 h-8 md:w-10 md:h-10" />
            </div>
            <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2">Удалить аккаунт?</h3>
            <p className="text-gray-400 text-xs md:text-sm font-bold mb-6 md:mb-8 italic uppercase tracking-widest leading-relaxed">
                Это действие удалит вашу учетную запись и все посты навсегда.
            </p>
            <div className="space-y-2 md:space-y-3">
              <button 
                disabled={isSaving}
                onClick={handleDeleteAccount} 
                className="w-full py-4 md:py-5 bg-red-500 text-white rounded-xl md:rounded-[22px] font-black shadow-lg hover:bg-red-600 transition-all flex items-center justify-center text-sm md:text-base"
              >
                {isSaving ? <Loader2 className="animate-spin w-5 h-5" /> : "Удалить навсегда"}
              </button>
              <button onClick={() => setConfirmDeleteOpen(false)} className="w-full py-2 md:py-4 text-gray-400 font-bold text-sm md:text-base">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}