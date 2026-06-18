"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { User, ShieldCheck, Crown, Camera, Loader2, Mail, Phone, AlertTriangle, Trophy, CalendarCheck2, Users } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { normalizeVolunteerCount } from "@/components/events/eventMeta";
import { getPremiumAccessType, getPremiumExpiresAt, hasPremiumAccess } from "@/lib/auth/premium";
import { syncPremiumSessionUser } from "@/lib/auth/premium-session";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

export default function ProfilePage() {
  const { pick, locale } = useLanguage();
  const router = useRouter();
  
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const supabaseUnavailableMessage = pick({
    ru: "Сервис временно недоступен. Попробуйте позже.",
    en: "The service is temporarily unavailable. Please try again later.",
    uz: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  const fetchUser = useCallback(async () => {
    try {
      if (!supabase) {
        setError(supabaseUnavailableMessage);
        return false;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      const currentUser = await syncPremiumSessionUser(supabase, session?.user || null);

      setUser(currentUser);
      if (currentUser) {
        setNewName(currentUser.user_metadata?.full_name || "");
        setNewPhone(currentUser.user_metadata?.phone || "");
        const { data: eventRows } = await supabase
          .from("events")
          .select("date, volunteers_needed")
          .eq("user_id", currentUser.id);

        const rows = (eventRows ?? []) as Array<{ date: string; volunteers_needed: number | null }>;
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
      setError(
        error instanceof Error
          ? error.message
          : pick({ ru: "Не удалось загрузить профиль.", en: "Could not load the profile.", uz: "Profilni yuklab bo'lmadi." }),
      );
      return false;
    }
  }, [supabase, supabaseUnavailableMessage, pick]);

  const showAlertModal = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      const hasUser = await fetchUser();
      if (!isMounted) return;
      if (!supabase) {
        setLoading(false);
        return;
      }
      if (!hasUser) {
        router.push("/auth/login");
        return;
      }
      setLoading(false);
    };
    init();
    return () => { isMounted = false; };
  }, [fetchUser, router, supabase]);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        return;
      }
      void fetchUser();
    });
    return () => { subscription.unsubscribe(); };
  }, [fetchUser, supabase]);

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
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 gap-3">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
        <p className="text-sm text-slate-500">{pick({ ru: "Загрузка профиля...", en: "Loading profile...", uz: "Profil yuklanmoqda..." })}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-4">
        <AlertTriangle className="h-12 w-12 text-amber-500" />
        <h1 className="text-xl font-bold text-slate-900">{pick({ ru: "Профиль временно недоступен", en: "Profile is temporarily unavailable", uz: "Profil vaqtincha mavjud emas" })}</h1>
        <p className="max-w-md text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  if (!user) return null;

  const isPremium = hasPremiumAccess(user);
  const premiumAccessType = getPremiumAccessType(user);
  const isTrialActive = isPremium && premiumAccessType === "trial";
  const premiumExpiresAt = getPremiumExpiresAt(user);
  const premiumEndsLabel =
    premiumExpiresAt
      ? new Date(premiumExpiresAt).toLocaleDateString(
          locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
          { day: "2-digit", month: "short", year: "numeric" },
        )
      : null;

  const achievements = [
    {
      id: "first_post",
      title: pick({ ru: "Первый анонс", en: "First post", uz: "Birinchi e'lon" }),
      description: pick({ ru: "Создайте 1 событие", en: "Create 1 event", uz: "1 ta tadbir yarating" }),
      unlocked: activityStats.createdEvents >= 1,
    },
    {
      id: "active_organizer",
      title: pick({ ru: "Активный организатор", en: "Active organizer", uz: "Faol tashkilotchi" }),
      description: pick({ ru: "Создайте 5 событий", en: "Create 5 events", uz: "5 ta tadbir yarating" }),
      unlocked: activityStats.createdEvents >= 5,
    },
    {
      id: "upcoming_owner",
      title: pick({ ru: "Календарь в работе", en: "Upcoming schedule", uz: "Rejadagi tadbirlar" }),
      description: pick({ ru: "Иметь хотя бы 1 будущее событие", en: "Have at least 1 upcoming event", uz: "Kamida 1 ta kutilayotgan tadbirga ega bo'ling" }),
      unlocked: activityStats.upcomingEvents >= 1,
    },
    {
      id: "community_scale",
      title: pick({ ru: "Масштаб сообщества", en: "Community scale", uz: "Hamjamiyat masshtabi" }),
      description: pick({ ru: "Набрать 50+ мест для волонтёров", en: "Reach 50+ volunteer spots", uz: "50+ volontyor o'rni yarating" }),
      unlocked: activityStats.volunteersNeeded >= 50,
    },
    {
      id: "premium_owner",
      title: pick({ ru: "Premium статус", en: "Premium status", uz: "Premium status" }),
      description: pick({ ru: "Активируйте Premium", en: "Activate Premium", uz: "Premium yoqing" }),
      unlocked: isPremium,
    },
  ];
  
  const unlockedAchievementsCount = achievements.filter((item) => item.unlocked).length;
  const profileCompletion = [user.user_metadata?.full_name, user.email, user.user_metadata?.phone, user.user_metadata?.avatar_url].filter(Boolean).length * 25;
  const nextAchievement = achievements.find((item) => !item.unlocked) ?? null;
  const createdAt = new Date(user.created_at);
  const memberSince = Number.isNaN(createdAt.getTime())
    ? "—"
    : createdAt.toLocaleDateString(
        locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
        { month: "short", year: "numeric" },
      );

  const overviewStats = [
    { label: pick({ ru: "Заполненность", en: "Completeness", uz: "To'liqlik" }), value: `${profileCompletion}%`, icon: ShieldCheck },
    { label: pick({ ru: "Достижения", en: "Achievements", uz: "Yutuqlar" }), value: `${unlockedAchievementsCount}/${achievements.length}`, icon: Trophy },
    { label: pick({ ru: "Событий создано", en: "Created events", uz: "Yaratilgan tadbirlar" }), value: `${activityStats.createdEvents}`, icon: CalendarCheck2 },
    { label: pick({ ru: "Мест для волонтёров", en: "Volunteer spots", uz: "Volontyor o'rinlari" }), value: `${activityStats.volunteersNeeded}`, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-10">
      <div className="mx-auto max-w-5xl py-8 md:py-12 space-y-6">
        
        {/* Header Section */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <Image
                    src={user.user_metadata.avatar_url}
                    width={128}
                    height={128}
                    className="h-full w-full object-cover"
                    alt={pick({ ru: "Профиль", en: "Profile", uz: "Profil" })}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                <label className="absolute bottom-1.5 right-1.5 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input type="file" className="hidden" onChange={handleAvatarUpload} disabled={uploading} accept="image/*" />
                </label>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {user.user_metadata?.full_name || pick({ ru: "Участник", en: "Member", uz: "Ishtirokchi" })}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  {pick({ ru: "Основная информация об аккаунте и активности.", en: "Main account details and activity.", uz: "Akkaunt va faollik bo'yicha asosiy ma'lumotlar." })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                    <Mail className="h-3 w-3" /> {user.email}
                  </span>
                  <span className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {pick({ ru: "С нами с", en: "Since", uz: "Biz bilan" })} {memberSince}
                  </span>
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-medium ${
                    isPremium ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-600"
                  }`}>
                    {isPremium
                      ? premiumEndsLabel
                        ? `${isTrialActive ? "Trial" : "Premium"} · ${premiumEndsLabel}`
                        : isTrialActive ? "Trial" : "Premium"
                      : "Free"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row shrink-0">
              {/* <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                {pick({ ru: "Настроить профиль", en: "Edit profile", uz: "Profilni sozlash" })}
              </button> */}
              <button
                onClick={() => router.push("/premium")}
                className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isPremium ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Crown className="mr-2 h-4 w-4" />
                {isPremium ? pick({ ru: "Premium", en: "Premium", uz: "Premium" }) : pick({ ru: "Подключить Premium", en: "Get Premium", uz: "Premium olish" })}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {overviewStats.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{item.value}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Middle Grid */}
        <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Contacts Card */}
            <article className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">{pick({ ru: "Контакты и статус", en: "Contacts and status", uz: "Kontaktlar va status" })}</h2>
              <div className="space-y-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"><Mail className="h-3.5 w-3.5" /> {pick({ ru: "Почта", en: "Email", uz: "Email" })}</p>
                  <p className="text-sm font-medium text-slate-900 break-all">{user.email}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"><Phone className="h-3.5 w-3.5" /> {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}</p>
                  <p className="text-sm font-medium text-slate-900">{user.user_metadata?.phone || pick({ ru: "Не указан", en: "Not set", uz: "Kiritilmagan" })}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"><Crown className="h-3.5 w-3.5" /> {pick({ ru: "Тариф", en: "Plan", uz: "Tarif" })}</p>
                  <p className={`text-sm font-medium ${isPremium ? "text-amber-700" : "text-slate-900"}`}>
                    {isPremium
                      ? premiumEndsLabel
                        ? pick({
                            ru: isTrialActive ? `Пробная версия активна до ${premiumEndsLabel}` : `Premium активен до ${premiumEndsLabel}`,
                            en: isTrialActive ? `Trial is active until ${premiumEndsLabel}` : `Premium active until ${premiumEndsLabel}`,
                            uz: isTrialActive ? `Sinov ${premiumEndsLabel} gacha faol` : `Premium ${premiumEndsLabel} gacha faol`,
                          })
                        : pick({ ru: isTrialActive ? "Пробная версия активна" : "Premium активен", en: isTrialActive ? "Trial is active" : "Premium active", uz: isTrialActive ? "Sinov faol" : "Premium faol" })
                      : pick({ ru: "Free план", en: "Free plan", uz: "Free tarif" })}
                  </p>
                </div>
              </div>
            </article>

            {/* Activity Card */}
            <article className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">{pick({ ru: "Активность", en: "Activity", uz: "Faollik" })}</h2>
              <div className="space-y-4">
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"><CalendarCheck2 className="h-3.5 w-3.5" /> {pick({ ru: "Создано событий", en: "Created events", uz: "Yaratilgan tadbirlar" })}</p>
                  <p className="text-2xl font-bold text-slate-900">{activityStats.createdEvents}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"><Users className="h-3.5 w-3.5" /> {pick({ ru: "Мест для волонтёров", en: "Volunteer spots", uz: "Volontyor o'rinlari" })}</p>
                  <p className="text-2xl font-bold text-slate-900">{activityStats.volunteersNeeded}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"><Trophy className="h-3.5 w-3.5" /> {pick({ ru: "Открыто достижений", en: "Unlocked achievements", uz: "Ochilgan yutuqlar" })}</p>
                  <p className="text-2xl font-bold text-slate-900">{unlockedAchievementsCount}</p>
                </div>
              </div>
            </article>
          </div>

          {/* Actions & Next Step */}
          <div className="space-y-6">
            <aside className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-5">{pick({ ru: "Действия", en: "Actions", uz: "Amallar" })}</h2>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                >
                  {pick({ ru: "Редактировать профиль", en: "Edit profile", uz: "Profilni tahrirlash" })}
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {pick({ ru: "Выйти", en: "Logout", uz: "Chiqish" })}
                </button>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="w-full rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
                >
                  {pick({ ru: "Удалить аккаунт", en: "Delete account", uz: "Akkountni o'chirish" })}
                </button>
              </div>
            </aside>

            <aside className="bg-white border border-slate-200 rounded-2xl p-6">
              <p className="text-xs font-medium text-slate-500">{pick({ ru: "Следующий шаг", en: "Next step", uz: "Keyingi qadam" })}</p>
              <h2 className="mt-2 text-base font-bold text-slate-900">
                {nextAchievement?.title || pick({ ru: "Все ключевые этапы открыты", en: "All key milestones unlocked", uz: "Barcha asosiy bosqichlar ochilgan" })}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {nextAchievement?.description || pick({ ru: "Публикуйте больше событий и усиливайте видимость через Premium.", en: "Publish more events and improve visibility through Premium.", uz: "Ko'proq tadbir joylab, Premium orqali ko'rinishni kuchaytirishingiz mumkin." })}
              </p>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.max((unlockedAchievementsCount / achievements.length) * 100, 8)}%` }}
                />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">
                {pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })}: {unlockedAchievementsCount}/{achievements.length}
              </p>
            </aside>
          </div>
        </section>

        {/* Achievements Section */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-lg font-bold text-slate-900">{pick({ ru: "Достижения", en: "Achievements", uz: "Yutuqlar" })}</h2>
            <p className="text-sm text-slate-500">
              {pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })}: {unlockedAchievementsCount}/{achievements.length}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement) => (
              <article
                key={achievement.id}
                className={`rounded-xl border px-4 py-3 ${
                  achievement.unlocked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className={`text-xs font-medium mb-1.5 ${
                  achievement.unlocked ? "text-emerald-700" : "text-slate-400"
                }`}>
                  {achievement.unlocked ? pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" }) : pick({ ru: "В процессе", en: "In progress", uz: "Jarayonda" })}
                </p>
                <h3 className="text-sm font-bold text-slate-900">{achievement.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{achievement.description}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-6">{pick({ ru: "Редактировать профиль", en: "Edit Profile", uz: "Profilni tahrirlash" })}</h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Имя", en: "Name", uz: "Ism" })}</label>
                <input 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}</label>
                <input 
                  value={newPhone} 
                  onChange={(e) => setNewPhone(e.target.value)} 
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" 
                />
              </div>
              <div className="pt-4 space-y-3">
                <button 
                  type="submit" 
                  disabled={isSaving} 
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : pick({ ru: "Сохранить изменения", en: "Save changes", uz: "O'zgarishlarni saqlash" })}
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)} 
                  className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm font-medium transition-colors"
                >
                  {pick({ ru: "Отмена", en: "Cancel", uz: "Bekor qilish" })}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{pick({ ru: "Удалить аккаунт?", en: "Delete account?", uz: "Akkountni o'chirasizmi?" })}</h3>
            <p className="text-sm text-slate-500 mb-6">
              {pick({ ru: "Это действие удалит вашу учетную запись и все посты навсегда.", en: "This action will permanently delete your account and all posts.", uz: "Bu amal akkountingiz va barcha postlarni butunlay o'chiradi." })}
            </p>
            <div className="space-y-3">
              <button 
                disabled={isSaving}
                onClick={handleDeleteAccount} 
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : pick({ ru: "Удалить навсегда", en: "Delete Forever", uz: "Butunlay o'chirish" })}
              </button>
              <button 
                onClick={() => setConfirmDeleteOpen(false)} 
                className="w-full text-slate-500 hover:text-slate-700 py-2 text-sm font-medium transition-colors"
              >
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