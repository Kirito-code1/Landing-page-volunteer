"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { User as SupabaseUser } from "@supabase/supabase-js"; // Тип для юзера
import { User, LogOut, ShieldCheck, Camera, Loader2, Mail, Phone } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  
  // Указываем тип <SupabaseUser | null>, чтобы TS понимал структуру user_metadata
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
      // Используем getSession, так как на одном домене он надежнее подтягивает куки
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
        // Редирект на локальную страницу логина
        router.push("/login");
        return;
      }

      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        router.push("/login");
        return;
      }

      setUser(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUser, router, supabase.auth]);

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
    } catch (error) {
      alert("Ошибка при загрузке фото");
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
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#10b981]" />
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Загрузка профиля...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-10">
      <div className="max-w-3xl mx-auto py-12 px-4 animate-in fade-in duration-500">
        <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="h-40 bg-gradient-to-br from-[#10b981] to-[#3b82f6]" />
          <div className="px-10 pb-10">
            <div className="relative -mt-20 mb-6 flex justify-between items-end">
              <div className="w-40 h-40 bg-white rounded-[38px] p-1.5 shadow-2xl overflow-hidden relative group">
                {user.user_metadata?.avatar_url ? (
                  <img 
                    src={user.user_metadata.avatar_url} 
                    className="w-full h-full object-cover rounded-[32px]" 
                    alt="Профиль" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 rounded-[32px]">
                    <User className="w-20 h-20 text-gray-200" />
                  </div>
                )}
                <label className="absolute bottom-2 right-2 p-3 bg-[#10b981] text-white rounded-2xl cursor-pointer hover:scale-110 transition-transform shadow-lg">
                  {uploading ? <Loader2 className="animate-spin w-5 h-5" /> : <Camera className="w-5 h-5" />}
                  <input 
                    type="file" 
                    className="hidden" 
                    onChange={handleAvatarUpload} 
                    disabled={uploading} 
                    accept="image/*"
                  />
                </label>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(true)} 
                className="px-8 py-4 bg-gray-900 text-white rounded-[22px] font-black hover:bg-black transition-all active:scale-95 shadow-lg"
              >
                Настроить
              </button>
            </div>
            <h1 className="text-4xl font-black text-gray-900 flex items-center gap-3">
              {user.user_metadata?.full_name || "Участник"}
              <ShieldCheck className="w-6 h-6 text-[#10b981]" />
            </h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">ID: {user.id.slice(0, 8)}</p>
          </div>
        </div>

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
          <div className="bg-white p-8 rounded-[35px] border border-gray-100 shadow-sm flex items-center">
             <button 
              onClick={handleLogout} 
              className="w-full py-4 bg-gray-50 text-gray-900 rounded-[22px] font-black hover:bg-red-50 hover:text-red-600 transition-all flex items-center justify-center gap-2"
             >
               <LogOut className="w-5 h-5" /> Выйти из аккаунта
             </button>
          </div>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-6 text-gray-900">Редактировать профиль</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-2">Имя</label>
                <input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="w-full p-5 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold" 
                  placeholder="Ваше имя" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase text-gray-400 ml-2">Телефон</label>
                <input 
                  value={newPhone} 
                  onChange={(e) => setNewPhone(e.target.value)} 
                  className="w-full p-5 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold" 
                  placeholder="+7 (___) ___ __ __" 
                />
              </div>
              <div className="pt-4 space-y-3">
                <button 
                  type="submit"
                  disabled={isSaving} 
                  className="w-full py-5 bg-[#10b981] text-white rounded-2xl font-black shadow-lg hover:bg-[#0da975] transition-all disabled:opacity-50"
                >
                  {isSaving ? "Сохранение..." : "Сохранить изменения"}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="w-full text-gray-400 font-bold py-2 hover:text-gray-600 transition-colors"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}