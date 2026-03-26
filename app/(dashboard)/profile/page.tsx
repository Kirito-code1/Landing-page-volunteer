"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { User, LogOut, ShieldCheck, Crown, Camera, Loader2, Mail, Phone, Trash2, AlertTriangle, Trophy, CalendarCheck2, Users } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { normalizeVolunteerCount } from "@/components/events/eventMeta";

export default function ProfilePage() {
  const { pick } = useLanguage();
  const router = useRouter();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false); 
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activityStats, setActivityStats] = useState({
    createdEvents: 0,
    upcomingEvents: 0,
    volunteersNeeded: 0,
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    tone: AlertTone;
  }>({
    isOpen: false,
    title: "",
    message: "",
    tone: "info",
  });

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
        const { data: eventRows } = await supabase
          .from("events")
          .select("date, volunteers_needed")
          .eq("user_id", currentUser.id);

        const rows = eventRows ?? [];
        const now = Date.now();
        const upcomingEvents = rows.filter((row) => {
          const eventDate = new Date(row.date).getTime();
          return !Number.isNaN(eventDate) && eventDate >= now;
        }).length;
        const volunteersNeeded = rows.reduce((sum, row) => {
          return sum + (normalizeVolunteerCount(row.volunteers_needed) ?? 0);
        }, 0);

        setActivityStats({
          createdEvents: rows.length,
          upcomingEvents,
          volunteersNeeded,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error fetching user:", error);
      return false;
    }
  }, [supabase]);

  const showAlertModal = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

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
    } catch (error: unknown) {
      const message = error instanceof Error
        ? error.message
        : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      console.error("Delete account error:", error);
      showAlertModal(
        pick({ ru: "Ошибка при удалении", en: "Delete error", uz: "O'chirish xatosi" }),
        message,
        "error",
      );
    } finally {
      setIsSaving(false);
      setConfirmDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#10b981]" />
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest text-center">
          {pick({ ru: "Загрузка профиля...", en: "Loading profile...", uz: "Profil yuklanmoqda..." })}
        </p>
      </div>
    );
  }

  if (!user) return null;

  const isPremium =
    user.user_metadata?.is_premium === true ||
    user.user_metadata?.subscription_plan === "premium";

  const achievements = [
    {
      id: "first_post",
      title: pick({ ru: "Первый анонс", en: "First post", uz: "Birinchi e'lon" }),
      description: pick({
        ru: "Создайте 1 событие",
        en: "Create 1 event",
        uz: "1 ta tadbir yarating",
      }),
      unlocked: activityStats.createdEvents >= 1,
    },
    {
      id: "active_organizer",
      title: pick({ ru: "Активный организатор", en: "Active organizer", uz: "Faol tashkilotchi" }),
      description: pick({
        ru: "Создайте 5 событий",
        en: "Create 5 events",
        uz: "5 ta tadbir yarating",
      }),
      unlocked: activityStats.createdEvents >= 5,
    },
    {
      id: "upcoming_owner",
      title: pick({ ru: "Календарь в работе", en: "Upcoming schedule", uz: "Rejadagi tadbirlar" }),
      description: pick({
        ru: "Иметь хотя бы 1 будущее событие",
        en: "Have at least 1 upcoming event",
        uz: "Kamida 1 ta kutilayotgan tadbirga ega bo'ling",
      }),
      unlocked: activityStats.upcomingEvents >= 1,
    },
    {
      id: "community_scale",
      title: pick({ ru: "Масштаб сообщества", en: "Community scale", uz: "Hamjamiyat masshtabi" }),
      description: pick({
        ru: "Набрать 50+ мест для волонтёров",
        en: "Reach 50+ volunteer spots",
        uz: "50+ volontyor o'rni yarating",
      }),
      unlocked: activityStats.volunteersNeeded >= 50,
    },
    {
      id: "premium_owner",
      title: pick({ ru: "Premium статус", en: "Premium status", uz: "Premium status" }),
      description: pick({
        ru: "Активируйте Premium",
        en: "Activate Premium",
        uz: "Premium yoqing",
      }),
      unlocked: isPremium,
    },
  ];

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
                  <Image src={user.user_metadata.avatar_url} width={160} height={160} className="w-full h-full object-cover rounded-[24px] md:rounded-[32px]" alt={pick({ ru: "Профиль", en: "Profile", uz: "Profil" })} unoptimized />
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
                {pick({ ru: "Настроить", en: "Edit", uz: "Sozlash" })}
              </button>
            </div>
            
            <div className="text-center sm:text-left">
              <h1 className="text-2xl md:text-4xl font-black text-gray-900 flex items-center justify-center sm:justify-start gap-2 md:gap-3">
                {user.user_metadata?.full_name || pick({ ru: "Участник", en: "Member", uz: "Ishtirokchi" })}
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
                <Mail className="w-3 h-3" /> {pick({ ru: "Почта", en: "Email", uz: "Email" })}
              </p>
              <p className="font-bold text-gray-900 text-sm md:text-base break-all">{user.email}</p>
            </div>
            <div>
              <p className="text-gray-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-1 flex items-center gap-2">
                <Phone className="w-3 h-3" /> {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
              </p>
              <p className="font-bold text-gray-900 text-sm md:text-base">
                {user.user_metadata?.phone || pick({ ru: "Не указан", en: "Not set", uz: "Kiritilmagan" })}
              </p>
            </div>
            <div>
              <p className="text-gray-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest mb-1 flex items-center gap-2">
                <Crown className="w-3 h-3" /> {pick({ ru: "Тариф", en: "Plan", uz: "Tarif" })}
              </p>
              <p className={`font-black text-sm md:text-base ${isPremium ? "text-amber-600" : "text-gray-900"}`}>
                {isPremium
                  ? pick({ ru: "PREMIUM", en: "PREMIUM", uz: "PREMIUM" })
                  : pick({ ru: "FREE", en: "FREE", uz: "FREE" })}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 md:gap-4">
             <button
               onClick={() => router.push("/premium")}
               className={`w-full py-4 md:py-5 rounded-[20px] md:rounded-[22px] font-black transition-all flex items-center justify-center gap-2 text-sm md:text-base ${
                 isPremium
                   ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                   : "bg-gray-900 text-white hover:bg-black"
               }`}
             >
               <Crown className="w-4 h-4 md:w-5 md:h-5" />
               {isPremium
                 ? pick({ ru: "Управлять Premium", en: "Manage Premium", uz: "Premiumni boshqarish" })
                 : pick({ ru: "Оформить Premium", en: "Get Premium", uz: "Premium olish" })}
             </button>
             <button onClick={handleLogout} className="w-full py-4 md:py-5 bg-white text-gray-900 border border-gray-100 rounded-[20px] md:rounded-[22px] font-black hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-sm md:text-base">
               <LogOut className="w-4 h-4 md:w-5 md:h-5" /> {pick({ ru: "Выйти", en: "Logout", uz: "Chiqish" })}
             </button>
             <button onClick={() => setConfirmDeleteOpen(true)} className="w-full py-4 md:py-5 bg-red-50 text-red-500 rounded-[20px] md:rounded-[22px] font-black hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 text-sm md:text-base">
               <Trash2 className="w-4 h-4 md:w-5 md:h-5" /> {pick({ ru: "Удалить аккаунт", en: "Delete account", uz: "Akkountni o'chirish" })}
             </button>
          </div>
        </div>

        <div className="mt-6 md:mt-8 bg-white rounded-[25px] md:rounded-[35px] border border-gray-100 shadow-sm p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
              {pick({ ru: "Достижения и прогресс", en: "Achievements & progress", uz: "Yutuqlar va progress" })}
            </h2>
            <p className="text-[10px] md:text-[11px] uppercase tracking-widest font-black text-gray-400">
              {pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })}: {achievements.filter((item) => item.unlocked).length}/{achievements.length}
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                {pick({ ru: "Событий создано", en: "Created events", uz: "Yaratilgan tadbirlar" })}
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">{activityStats.createdEvents}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 flex items-center gap-1.5">
                <CalendarCheck2 className="w-3.5 h-3.5" />
                {pick({ ru: "Предстоящие", en: "Upcoming", uz: "Kutilayotgan" })}
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">{activityStats.upcomingEvents}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] uppercase tracking-widest font-black text-gray-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {pick({ ru: "План мест", en: "Planned spots", uz: "Rejalangan o'rinlar" })}
              </p>
              <p className="text-2xl font-black text-gray-900 mt-1">{activityStats.volunteersNeeded}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {achievements.map((achievement) => (
              <article
                key={achievement.id}
                className={`rounded-2xl border px-4 py-4 ${
                  achievement.unlocked
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-gray-100 bg-white"
                }`}
              >
                <p className={`text-[10px] uppercase tracking-widest font-black ${
                  achievement.unlocked ? "text-emerald-600" : "text-gray-400"
                }`}>
                  {achievement.unlocked
                    ? pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })
                    : pick({ ru: "В процессе", en: "In progress", uz: "Jarayonda" })}
                </p>
                <h3 className="mt-2 text-base font-black text-gray-900">{achievement.title}</h3>
                <p className="mt-1 text-sm font-semibold text-gray-500">{achievement.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Модалка редактирования */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4">
          <div className="bg-white w-full max-w-md rounded-[30px] md:rounded-[40px] p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl md:text-2xl font-black mb-4 md:mb-6 text-gray-900">
              {pick({ ru: "Редактировать профиль", en: "Edit Profile", uz: "Profilni tahrirlash" })}
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
                  {pick({ ru: "Имя", en: "Name", uz: "Ism" })}
                </label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-4 md:p-5 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold text-sm md:text-base" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-2 tracking-widest">
                  {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
                </label>
                <input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="w-full p-4 md:p-5 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-100 outline-none focus:border-[#10b981] font-bold text-sm md:text-base" />
              </div>
              <div className="pt-2 md:pt-4 space-y-2 md:space-y-3">
                <button type="submit" disabled={isSaving} className="w-full py-4 md:py-5 bg-[#10b981] text-white rounded-xl md:rounded-2xl font-black shadow-lg hover:bg-[#0da975] transition-all disabled:opacity-50 text-sm md:text-base">
                  {isSaving
                    ? pick({ ru: "Сохранение...", en: "Saving...", uz: "Saqlanmoqda..." })
                    : pick({ ru: "Сохранить изменения", en: "Save changes", uz: "O'zgarishlarni saqlash" })}
                </button>
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="w-full text-gray-400 font-bold py-2 text-sm md:text-base">
                  {pick({ ru: "Отмена", en: "Cancel", uz: "Bekor qilish" })}
                </button>
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
            <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2">
              {pick({ ru: "Удалить аккаунт?", en: "Delete account?", uz: "Akkountni o'chirasizmi?" })}
            </h3>
            <p className="text-gray-400 text-xs md:text-sm font-bold mb-6 md:mb-8 italic uppercase tracking-widest leading-relaxed">
              {pick({
                ru: "Это действие удалит вашу учетную запись и все посты навсегда.",
                en: "This action will permanently delete your account and all posts.",
                uz: "Bu amal akkountingiz va barcha postlarni butunlay o'chiradi.",
              })}
            </p>
            <div className="space-y-2 md:space-y-3">
              <button 
                disabled={isSaving}
                onClick={handleDeleteAccount} 
                className="w-full py-4 md:py-5 bg-red-500 text-white rounded-xl md:rounded-[22px] font-black shadow-lg hover:bg-red-600 transition-all flex items-center justify-center text-sm md:text-base"
              >
                {isSaving
                  ? <Loader2 className="animate-spin w-5 h-5" />
                  : pick({ ru: "Удалить навсегда", en: "Delete Forever", uz: "Butunlay o'chirish" })}
              </button>
              <button onClick={() => setConfirmDeleteOpen(false)} className="w-full py-2 md:py-4 text-gray-400 font-bold text-sm md:text-base">
                {pick({ ru: "Отмена", en: "Cancel", uz: "Bekor qilish" })}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        tone={alertModal.tone}
        closeLabel={pick({ ru: "Понятно", en: "Got it", uz: "Tushunarli" })}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
