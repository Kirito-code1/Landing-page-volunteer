"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { User, ShieldCheck, Crown, Camera, Loader2, Mail, Phone, AlertTriangle, Trophy, CalendarCheck2, Users } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { normalizeVolunteerCount } from "@/components/events/eventMeta";
import { getPremiumAccessType, getPremiumExpiresAt, hasPremiumAccess, needsPremiumStateSync } from "@/lib/auth/premium";

export default function ProfilePage() {
  const { pick, locale } = useLanguage();
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
      let currentUser = session?.user || null;

      if (currentUser && needsPremiumStateSync(currentUser)) {
        const response = await fetch("/api/premium/status", {
          cache: "no-store",
        });

        if (response.ok) {
          await supabase.auth.refreshSession();
          const { data: { session: refreshedSession } } = await supabase.auth.getSession();
          currentUser = refreshedSession?.user || currentUser;
        }
      }

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
  const unlockedAchievementsCount = achievements.filter((item) => item.unlocked).length;
  const profileCompletion =
    [user.user_metadata?.full_name, user.email, user.user_metadata?.phone, user.user_metadata?.avatar_url].filter(Boolean).length * 25;
  const nextAchievement = achievements.find((item) => !item.unlocked) ?? null;
  const createdAt = new Date(user.created_at);
  const memberSince = Number.isNaN(createdAt.getTime())
    ? "—"
    : createdAt.toLocaleDateString(
        locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
        { month: "short", year: "numeric" },
      );
  const overviewStats = [
    {
      label: pick({ ru: "Заполненность", en: "Profile completeness", uz: "Profil to'liqligi" }),
      value: `${profileCompletion}%`,
      icon: ShieldCheck,
    },
    {
      label: pick({ ru: "Достижения", en: "Achievements", uz: "Yutuqlar" }),
      value: `${unlockedAchievementsCount}/${achievements.length}`,
      icon: Trophy,
    },
    {
      label: pick({ ru: "Событий создано", en: "Created events", uz: "Yaratilgan tadbirlar" }),
      value: `${activityStats.createdEvents}`,
      icon: CalendarCheck2,
    },
    {
      label: pick({ ru: "План мест", en: "Planned spots", uz: "Rejalangan o'rinlar" }),
      value: `${activityStats.volunteersNeeded}`,
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-10">
      <div className="mx-auto max-w-5xl animate-in fade-in py-6 duration-500 md:py-10">
        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-28 w-28 overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 md:h-32 md:w-32">
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
                    <User className="h-12 w-12 text-slate-300 md:h-16 md:w-16" />
                  </div>
                )}
                <label className="absolute bottom-2 right-2 flex h-10 w-10 cursor-pointer items-center justify-center rounded-2xl bg-[#10b981] text-white transition-transform hover:scale-105">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input type="file" className="hidden" onChange={handleAvatarUpload} disabled={uploading} accept="image/*" />
                </label>
              </div>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#10b981]" />
                  {pick({ ru: "Профиль", en: "Profile", uz: "Profil" })}
                </div>
                <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
                  {user.user_metadata?.full_name || pick({ ru: "Участник", en: "Member", uz: "Ishtirokchi" })}
                </h1>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                  {pick({
                    ru: "Основная информация об аккаунте, статусе и активности.",
                    en: "Main account details, status, and activity in one place.",
                    uz: "Akkaunt, status va faollik bo'yicha asosiy ma'lumotlar bir joyda.",
                  })}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    ID: {user.id.slice(0, 8)}
                  </span>
                  <span className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {pick({ ru: "С нами с", en: "With us since", uz: "Biz bilan" })}: {memberSince}
                  </span>
                  <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                    isPremium ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-black"
              >
                {pick({ ru: "Настроить профиль", en: "Edit profile", uz: "Profilni sozlash" })}
              </button>
              <button
                onClick={() => router.push("/premium")}
                className={`inline-flex items-center justify-center rounded-2xl px-5 py-3.5 text-sm font-black transition-colors ${
                  isPremium ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Crown className="mr-2 h-4 w-4" />
                {isPremium
                  ? pick({ ru: "Premium", en: "Premium", uz: "Premium" })
                  : pick({ ru: "Подключить Premium", en: "Get Premium", uz: "Premium olish" })}
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {overviewStats.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-black text-slate-950">{item.value}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-6 md:grid-cols-2">
            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                {pick({ ru: "Контакты и статус", en: "Contacts and status", uz: "Kontaktlar va status" })}
              </h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Mail className="h-3.5 w-3.5" />
                    {pick({ ru: "Почта", en: "Email", uz: "Email" })}
                  </p>
                  <p className="break-all text-sm font-bold text-slate-950">{user.email}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Phone className="h-3.5 w-3.5" />
                    {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
                  </p>
                  <p className="text-sm font-bold text-slate-950">
                    {user.user_metadata?.phone || pick({ ru: "Не указан", en: "Not set", uz: "Kiritilmagan" })}
                  </p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Crown className="h-3.5 w-3.5" />
                    {pick({ ru: "Тариф", en: "Plan", uz: "Tarif" })}
                  </p>
                  <p className={`text-sm font-bold ${isPremium ? "text-amber-700" : "text-slate-950"}`}>
                    {isPremium
                      ? premiumEndsLabel
                        ? pick({
                            ru: isTrialActive
                              ? `Пробная версия активна до ${premiumEndsLabel}`
                              : `Premium активен до ${premiumEndsLabel}`,
                            en: isTrialActive
                              ? `Trial is active until ${premiumEndsLabel}`
                              : `Premium active until ${premiumEndsLabel}`,
                            uz: isTrialActive
                              ? `Sinov ${premiumEndsLabel} gacha faol`
                              : `Premium ${premiumEndsLabel} gacha faol`,
                          })
                        : pick({
                            ru: isTrialActive ? "Пробная версия активна" : "Premium активен",
                            en: isTrialActive ? "Trial is active" : "Premium active",
                            uz: isTrialActive ? "Sinov faol" : "Premium faol",
                          })
                      : pick({ ru: "Free план", en: "Free plan", uz: "Free tarif" })}
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                {pick({ ru: "Активность", en: "Activity", uz: "Faollik" })}
              </h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <CalendarCheck2 className="h-3.5 w-3.5" />
                    {pick({ ru: "Создано событий", en: "Created events", uz: "Yaratilgan tadbirlar" })}
                  </p>
                  <p className="text-3xl font-black text-slate-950">{activityStats.createdEvents}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Users className="h-3.5 w-3.5" />
                    {pick({ ru: "План мест", en: "Planned spots", uz: "Rejalangan o'rinlar" })}
                  </p>
                  <p className="text-3xl font-black text-slate-950">{activityStats.volunteersNeeded}</p>
                </div>
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    <Trophy className="h-3.5 w-3.5" />
                    {pick({ ru: "Открыто достижений", en: "Unlocked achievements", uz: "Ochilgan yutuqlar" })}
                  </p>
                  <p className="text-3xl font-black text-slate-950">{unlockedAchievementsCount}</p>
                </div>
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                {pick({ ru: "Действия", en: "Actions", uz: "Amallar" })}
              </h2>
              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white transition-colors hover:bg-black"
                >
                  {pick({ ru: "Редактировать профиль", en: "Edit profile", uz: "Profilni tahrirlash" })}
                </button>
                <button
                  onClick={handleLogout}
                  className="rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-black text-slate-700 transition-colors hover:bg-slate-50"
                >
                  {pick({ ru: "Выйти", en: "Logout", uz: "Chiqish" })}
                </button>
                <button
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-black text-red-600 transition-colors hover:bg-red-100"
                >
                  {pick({ ru: "Удалить аккаунт", en: "Delete account", uz: "Akkountni o'chirish" })}
                </button>
              </div>
            </aside>

            <aside className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {pick({ ru: "Следующий шаг", en: "Next step", uz: "Keyingi qadam" })}
              </p>
              <h2 className="mt-3 text-xl font-black text-slate-950">
                {nextAchievement?.title || pick({ ru: "Все ключевые этапы открыты", en: "All key milestones unlocked", uz: "Barcha asosiy bosqichlar ochilgan" })}
              </h2>
              <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                {nextAchievement?.description ||
                  pick({
                    ru: "Можно двигаться дальше: публиковать больше событий и усиливать видимость через Premium.",
                    en: "You can move further by publishing more events and improving visibility through Premium.",
                    uz: "Keyingi qadam sifatida ko'proq tadbir joylab, Premium orqali ko'rinishni kuchaytirishingiz mumkin.",
                  })}
              </p>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-[#10b981]"
                  style={{ width: `${Math.max((unlockedAchievementsCount / achievements.length) * 100, 8)}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">
                {pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })}: {unlockedAchievementsCount}/{achievements.length}
              </p>
            </aside>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-950">
              {pick({ ru: "Достижения", en: "Achievements", uz: "Yutuqlar" })}
            </h2>
            <p className="text-sm font-medium text-slate-500">
              {pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })}: {unlockedAchievementsCount}/{achievements.length}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {achievements.map((achievement) => (
              <article
                key={achievement.id}
                className={`rounded-[22px] border px-4 py-4 ${
                  achievement.unlocked ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                  achievement.unlocked ? "text-emerald-700" : "text-slate-400"
                }`}>
                  {achievement.unlocked
                    ? pick({ ru: "Открыто", en: "Unlocked", uz: "Ochildi" })
                    : pick({ ru: "В процессе", en: "In progress", uz: "Jarayonda" })}
                </p>
                <h3 className="mt-2 text-base font-black text-slate-950">{achievement.title}</h3>
                <p className="mt-1 text-sm font-medium leading-7 text-slate-500">{achievement.description}</p>
              </article>
            ))}
          </div>
        </section>
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
