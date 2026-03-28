"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faCircleUser } from "@fortawesome/free-regular-svg-icons";
import { 
  faChevronDown, 
  faTableColumns, 
  faCalendarAlt,
  faHandHoldingHeart,
  faCrown,
  IconDefinition 
} from "@fortawesome/free-solid-svg-icons";
import { LogOut, Heart, Bell, Clock3, CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";
import { getPremiumAccessType, hasPremiumAccess, needsPremiumStateSync } from "@/lib/auth/premium";
import { useLanguage, type Locale } from "@/components/providers/LanguageProvider";

// 1. Определяем интерфейс для пунктов меню, чтобы TS не ругался на отсутствие icon
interface MenuItem {
  href: string;
  label: string;
  icon?: IconDefinition; // Знак вопроса делает поле необязательным
}

type NotificationType =
  | "incoming"
  | "application_approved"
  | "application_rejected"
  | "payment_approved"
  | "payment_rejected";

interface NavbarNotification {
  id: string;
  label: string;
  happenedAt: string;
  type: NotificationType;
  href: string;
}

function parseLastSeen(value: unknown) {
  if (typeof value !== "string") return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function isMissingApplicationsTableError(message: string) {
  const hasTableMention = /event_applications/i.test(message);
  const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
  return hasTableMention && hasSchemaMention;
}

function isMissingManualPaymentsTableError(message: string) {
  const hasTableMention = /manual_payment_requests/i.test(message);
  const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
  return hasTableMention && hasSchemaMention;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [notifications, setNotifications] = useState<NavbarNotification[]>([]);
  const [lastSeenMs, setLastSeenMs] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(() =>
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
  const userRef = useRef<SupabaseUser | null>(null);
  const notificationsRef = useRef<NavbarNotification[]>([]);
  const langAreaRef = useRef<HTMLDivElement | null>(null);
  const moreAreaRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuAreaRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const notificationsAreaRef = useRef<HTMLDivElement | null>(null);
  const hasNotificationsFetchedRef = useRef(false);
  const hasNotificationDetailsRef = useRef(false);
  const { locale, setLocale, pick } = useLanguage();

  const supabase = useMemo(
    () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!url || !anonKey) {
        return null;
      }

      return createBrowserClient(url, anonKey);
    },
    [],
  );

  const fetchNotifications = useCallback(
    async (
      sessionUser: SupabaseUser | null,
      options?: { includeTitles?: boolean; showLoader?: boolean },
    ) => {
      if (!supabase || !sessionUser) {
        setNotifications([]);
        notificationsRef.current = [];
        setLastSeenMs(0);
        setNotificationsSupported(true);
        hasNotificationsFetchedRef.current = false;
        hasNotificationDetailsRef.current = false;
        setNotificationsLoading(false);
        return;
      }

      const includeTitles = options?.includeTitles === true;
      const shouldShowLoader =
        options?.showLoader === true &&
        (!hasNotificationsFetchedRef.current || !hasNotificationDetailsRef.current);
      if (shouldShowLoader) {
        setNotificationsLoading(true);
      }
      const metadata = sessionUser.user_metadata ?? {};
      setLastSeenMs(parseLastSeen(metadata.last_notifications_seen));

      const [incomingRes, decisionRes, paymentDecisionRes] = await Promise.all([
        supabase
          .from("event_applications")
          .select("id, event_id, created_at")
          .eq("organizer_id", sessionUser.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("event_applications")
          .select("id, event_id, status, reviewed_at")
          .eq("volunteer_id", sessionUser.id)
          .in("status", ["approved", "rejected"])
          .not("reviewed_at", "is", null)
          .order("reviewed_at", { ascending: false })
          .limit(20),
        supabase
          .from("manual_payment_requests")
          .select("id, kind, status, reviewed_at")
          .eq("user_id", sessionUser.id)
          .in("status", ["approved", "rejected"])
          .not("reviewed_at", "is", null)
          .order("reviewed_at", { ascending: false })
          .limit(20),
      ]);

      const appError = incomingRes.error || decisionRes.error;
      if (appError) {
        if (isMissingApplicationsTableError(appError.message)) {
          setNotificationsSupported(false);
          setNotifications([]);
          notificationsRef.current = [];
        } else {
          setNotificationsSupported(true);
          console.error("Notifications load error:", appError.message);
        }
        hasNotificationsFetchedRef.current = true;
        setNotificationsLoading(false);
        return;
      }

      setNotificationsSupported(true);
      const incomingRows = incomingRes.data ?? [];
      const decisionRows = decisionRes.data ?? [];
      const paymentDecisionRows = paymentDecisionRes.error
        ? (() => {
            if (!isMissingManualPaymentsTableError(paymentDecisionRes.error.message)) {
              console.error("Manual payment notifications load error:", paymentDecisionRes.error.message);
            }
            return [];
          })()
        : (paymentDecisionRes.data ?? []);
      const eventIds = Array.from(
        new Set(
          [...incomingRows, ...decisionRows]
            .map((row) => row.event_id as string)
            .filter(Boolean),
        ),
      );

      const eventTitleMap: Record<string, string> = {};
      if (includeTitles && eventIds.length > 0) {
        const { data: eventRows, error: eventsError } = await supabase
          .from("events")
          .select("id, title")
          .in("id", eventIds);

        if (!eventsError) {
          (eventRows ?? []).forEach((event) => {
            eventTitleMap[event.id] = event.title;
          });
        }
      }

      const nextNotifications: NavbarNotification[] = [
        ...incomingRows.map((row) => ({
          id: `incoming-${row.id}`,
          label:
            eventTitleMap[row.event_id] ??
            pick({ ru: "Событие", en: "Event", uz: "Tadbir" }),
          happenedAt: row.created_at,
          type: "incoming" as NotificationType,
          href: "/dashboard",
        })),
        ...decisionRows.map((row) => ({
          id: `decision-${row.id}`,
          label:
            eventTitleMap[row.event_id] ??
            pick({ ru: "Событие", en: "Event", uz: "Tadbir" }),
          happenedAt: row.reviewed_at as string,
          type:
            row.status === "approved"
              ? ("application_approved" as NotificationType)
              : ("application_rejected" as NotificationType),
          href: "/applications",
        })),
        ...paymentDecisionRows.map((row) => ({
          id: `payment-${row.id}`,
          label:
            row.kind === "premium"
              ? pick({ ru: "Premium", en: "Premium", uz: "Premium" })
              : pick({ ru: "Пожертвование", en: "Donation", uz: "Xayriya" }),
          happenedAt: row.reviewed_at as string,
          type:
            row.status === "approved"
              ? ("payment_approved" as NotificationType)
              : ("payment_rejected" as NotificationType),
          href:
            row.kind === "premium"
              ? `/premium/success?request=${encodeURIComponent(row.id)}`
              : `/donate/success?request=${encodeURIComponent(row.id)}`,
        })),
      ]
        .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
        .slice(0, 20);

      setNotifications(nextNotifications);
      notificationsRef.current = nextNotifications;
      hasNotificationsFetchedRef.current = true;
      hasNotificationDetailsRef.current = includeTitles;
      setNotificationsLoading(false);
    },
    [supabase, pick],
  );

  const syncPremiumSession = useCallback(
    async (sessionUser: SupabaseUser | null) => {
      if (!supabase || !sessionUser || !needsPremiumStateSync(sessionUser)) {
        return sessionUser;
      }

      try {
        const response = await fetch("/api/premium/status", {
          cache: "no-store",
        });

        if (!response.ok) {
          return sessionUser;
        }

        await supabase.auth.refreshSession();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        return session?.user ?? sessionUser;
      } catch (error) {
        console.error("Premium sync error:", error);
        return sessionUser;
      }
    },
    [supabase],
  );

  useEffect(() => {
    let mounted = true;
    let lazyFetchTimer: NodeJS.Timeout | null = null;

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      const nextUser = await syncPremiumSession(session?.user ?? null);
      userRef.current = nextUser;
      setUser(nextUser);
      setIsLoggedIn(Boolean(nextUser));
      setLastSeenMs(parseLastSeen(nextUser?.user_metadata?.last_notifications_seen));
      if (nextUser) {
        lazyFetchTimer = setTimeout(() => {
          if (!mounted) return;
          void fetchNotifications(nextUser);
        }, 1200);
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = await syncPremiumSession(session?.user ?? null);
      userRef.current = nextUser;
      setUser(nextUser);
      setIsLoggedIn(Boolean(nextUser));
      setLastSeenMs(parseLastSeen(nextUser?.user_metadata?.last_notifications_seen));
      if (event === "USER_UPDATED") {
        return;
      }
      hasNotificationDetailsRef.current = false;
      if (lazyFetchTimer) clearTimeout(lazyFetchTimer);
      if (nextUser) {
        lazyFetchTimer = setTimeout(() => {
          void fetchNotifications(nextUser);
        }, 800);
      } else {
        await fetchNotifications(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (lazyFetchTimer) clearTimeout(lazyFetchTimer);
    };
  }, [supabase, fetchNotifications, syncPremiumSession]);

  useEffect(() => {
    if (!isNotificationsOpen && !isLangOpen && !isMoreOpen && !isMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;

      if (isNotificationsOpen && !notificationsAreaRef.current?.contains(target)) {
        setIsNotificationsOpen(false);
      }
      if (isLangOpen && !langAreaRef.current?.contains(target)) {
        setIsLangOpen(false);
      }
      if (isMoreOpen && !moreAreaRef.current?.contains(target)) {
        setIsMoreOpen(false);
      }
      if (
        isMenuOpen &&
        !mobileMenuAreaRef.current?.contains(target) &&
        !mobileMenuPanelRef.current?.contains(target)
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isNotificationsOpen, isLangOpen, isMoreOpen, isMenuOpen]);

  const markNotificationsAsSeen = async () => {
    if (!supabase || !user || notifications.length === 0) return;

    const now = new Date();
    const nowIso = now.toISOString();
    const metadata = user.user_metadata ?? {};
    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        last_notifications_seen: nowIso,
      },
    });

    if (!error) {
      setLastSeenMs(now.getTime());
    }
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setIsMenuOpen(false);
    setIsNotificationsOpen(false);
    setIsMoreOpen(false);
    userRef.current = null;
    setUser(null);
    setNotifications([]);
    notificationsRef.current = [];
    hasNotificationsFetchedRef.current = false;
    hasNotificationDetailsRef.current = false;
    setLastSeenMs(0);
    router.push("/");
    router.refresh();
  };

  const handleNotificationsToggle = async () => {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);
    if (!nextOpen) return;

    await Promise.all([
      fetchNotifications(userRef.current, {
        includeTitles: true,
        showLoader: notificationsRef.current.length === 0 || !hasNotificationDetailsRef.current,
      }),
      markNotificationsAsSeen(),
    ]);
  };

  const languages: Array<{ locale: Locale; name: string; code: string; flag: string }> = [
    {
      locale: "ru",
      name: "Русский",
      code: "RU",
      flag: "https://upload.wikimedia.org/wikipedia/commons/f/f3/Flag_of_Russia.svg",
    },
    {
      locale: "uz",
      name: "O'zbek",
      code: "UZ",
      flag: "https://upload.wikimedia.org/wikipedia/commons/8/84/Flag_of_Uzbekistan.svg",
    },
    {
      locale: "en",
      name: "English (US)",
      code: "EN",
      flag: "https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg",
    },
  ];

  const selectedLanguage = languages.find((item) => item.locale === locale) || languages[0];
  const isPremiumUser = hasPremiumAccess(user);
  const premiumAccessType = getPremiumAccessType(user);
  const isTrialUser = isPremiumUser && premiumAccessType === "trial";
  const premiumBadgeLabel = isTrialUser
    ? pick({ ru: "Trial", en: "Trial", uz: "Sinov" })
    : pick({ ru: "Premium", en: "Premium", uz: "Premium" });
  const premiumBadgeClasses = isTrialUser
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

  const unreadCount = useMemo(() => {
    return notifications.filter((item) => {
      const ts = new Date(item.happenedAt).getTime();
      if (Number.isNaN(ts)) return false;
      return ts > lastSeenMs;
    }).length;
  }, [notifications, lastSeenMs]);

  const formatNotificationDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleDateString(
      locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
      { day: "2-digit", month: "short" },
    );
  };

  const getNotificationText = (item: NavbarNotification) => {
    if (item.type === "incoming") {
      return pick({
        ru: `Новый отклик: ${item.label}`,
        en: `New application: ${item.label}`,
        uz: `Yangi ariza: ${item.label}`,
      });
    }
    if (item.type === "application_approved") {
      return pick({
        ru: `Заявка принята: ${item.label}`,
        en: `Application approved: ${item.label}`,
        uz: `Ariza tasdiqlandi: ${item.label}`,
      });
    }
    if (item.type === "application_rejected") {
      return pick({
        ru: `Заявка отклонена: ${item.label}`,
        en: `Application rejected: ${item.label}`,
        uz: `Ariza rad etildi: ${item.label}`,
      });
    }
    if (item.type === "payment_approved") {
      return pick({
        ru: `Оплата подтверждена: ${item.label}`,
        en: `Payment confirmed: ${item.label}`,
        uz: `To'lov tasdiqlandi: ${item.label}`,
      });
    }
    return pick({
      ru: `Оплата отклонена: ${item.label}`,
      en: `Payment rejected: ${item.label}`,
      uz: `To'lov rad etildi: ${item.label}`,
    });
  };

  // 2. Явно указываем тип MenuItem[]
  const menuItems: MenuItem[] = isLoggedIn
    ? [
        {
          href: "/events",
          label: pick({ ru: "Все события", en: "All Events", uz: "Barcha tadbirlar" }),
          icon: faCalendarAlt,
        },
        {
          href: "/donate",
          label: pick({ ru: "Пожертвовать", en: "Donate", uz: "Xayriya" }),
          icon: faHandHoldingHeart,
        },
        {
          href: "/dashboard",
          label: pick({ ru: "Кабинет", en: "Dashboard", uz: "Kabinet" }),
          icon: faTableColumns,
        },
        {
          href: "/applications",
          label: pick({ ru: "Отклики", en: "Applications", uz: "Arizalar" }),
          icon: faCalendarAlt,
        },
        {
          href: "/premium",
          label: pick({ ru: "Премиум", en: "Premium", uz: "Premium" }),
          icon: faCrown,
        },
        {
          href: "/profile",
          label: pick({ ru: "Профиль", en: "Profile", uz: "Profil" }),
          icon: faCircleUser,
        },
      ]
    : [
        { href: "/", label: pick({ ru: "Главная", en: "Home", uz: "Bosh sahifa" }) },
        { href: "/events", label: pick({ ru: "События", en: "Events", uz: "Tadbirlar" }) },
        { href: "/donate", label: pick({ ru: "Пожертвовать", en: "Donate", uz: "Xayriya" }) },
        { href: "/premium", label: pick({ ru: "Премиум", en: "Premium", uz: "Premium" }) },
        { href: "/#about", label: pick({ ru: "О нас", en: "About", uz: "Biz haqimizda" }) },
      ];
  const primaryMenuItems = menuItems.slice(0, 3);
  const secondaryMenuItems = menuItems.slice(3);
  const isActiveMenuItem = (href: string) => {
    if (href === "/#about") return pathname === "/";
    return pathname === href;
  };
  const hasActiveSecondaryItem = secondaryMenuItems.some((item) => isActiveMenuItem(item.href));

  return (
    <nav className="sticky top-0 z-[100] w-full border-b border-slate-200/70 bg-white/82 backdrop-blur-xl">
      <div className="mx-auto max-w-screen-xl px-4 py-3 md:px-6">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/" className="group inline-flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#10b981] text-white shadow-lg shadow-emerald-100 transition-transform group-hover:scale-105">
              <Heart className="h-6 w-6 fill-current" />
            </div>
            <div>
              <span className="block text-lg font-black uppercase italic tracking-tighter text-slate-950 md:text-xl">
                Volo<span className="text-[#10b981]">Hero</span>
              </span>
              <span className="hidden text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 xl:block">
                {pick({ ru: "Volunteer Platform", en: "Volunteer Platform", uz: "Volunteer Platform" })}
              </span>
            </div>
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/95 p-1.5 shadow-sm">
              {primaryMenuItems.map((item) => {
                const isActive = isActiveMenuItem(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                      isActive
                        ? "bg-emerald-50 text-[#10b981] shadow-sm"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}

              {secondaryMenuItems.length > 0 ? (
                <div ref={moreAreaRef} className="relative">
                  <button
                    onClick={() => setIsMoreOpen((prev) => !prev)}
                    className={`inline-flex items-center rounded-full px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] transition-all ${
                      hasActiveSecondaryItem || isMoreOpen
                        ? "bg-slate-100 text-slate-950"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                  >
                    {pick({ ru: "Ещё", en: "More", uz: "Yana" })}
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`ms-2 h-2 w-2 transition-transform ${isMoreOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isMoreOpen ? (
                    <div className="absolute right-0 z-50 mt-2 min-w-[220px] overflow-hidden rounded-[24px] border border-slate-100 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95">
                      {secondaryMenuItems.map((item) => {
                        const isActive = isActiveMenuItem(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsMoreOpen(false)}
                            className={`mb-1 flex items-center rounded-[18px] px-3 py-3 text-[11px] font-black uppercase tracking-[0.12em] transition-colors last:mb-0 ${
                              isActive ? "bg-emerald-50 text-[#10b981]" : "text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            {item.icon ? <FontAwesomeIcon icon={item.icon} className="me-3 h-3 w-3" /> : null}
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {isLoggedIn && isPremiumUser ? (
              <Link
                href="/premium"
                className={`hidden items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] xl:inline-flex ${premiumBadgeClasses}`}
              >
                <Crown className="h-3.5 w-3.5" />
                {premiumBadgeLabel}
              </Link>
            ) : null}

            <div ref={langAreaRef} className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 transition-colors hover:bg-slate-50"
              >
                <Image
                  src={selectedLanguage.flag}
                  width={18}
                  height={18}
                  className="me-2 rounded-full border border-slate-100 object-cover"
                  alt={selectedLanguage.name}
                  unoptimized
                />
                {selectedLanguage.code}
                <FontAwesomeIcon icon={faChevronDown} className={`ms-2 h-2 w-2 transition-transform ${isLangOpen ? "rotate-180" : ""}`} />
              </button>

              {isLangOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-xl animate-in fade-in zoom-in-95">
                  <ul className="p-2 text-[12px] font-bold text-slate-700">
                    {languages.map((lang) => (
                      <li key={lang.name}>
                        <button
                          onClick={() => {
                            setLocale(lang.locale);
                            setIsLangOpen(false);
                          }}
                          className={`flex w-full items-center rounded-2xl px-3 py-3 transition-colors ${
                            lang.locale === locale ? "bg-emerald-50 text-[#10b981]" : "hover:bg-slate-50"
                          }`}
                        >
                          <Image src={lang.flag} width={16} height={16} className="me-3 rounded-full border border-slate-100" alt="" unoptimized />
                          {lang.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isLoggedIn && (
              <div ref={notificationsAreaRef} className="relative">
                <button
                  onClick={handleNotificationsToggle}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
                  aria-label={pick({ ru: "Уведомления", en: "Notifications", uz: "Bildirishnomalar" })}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationsOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-[340px] overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-xl animate-in fade-in zoom-in-95">
                    <div className="border-b border-slate-100 px-4 py-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {pick({ ru: "Уведомления", en: "Notifications", uz: "Bildirishnomalar" })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {unreadCount > 0
                          ? pick({
                              ru: `Новых уведомлений: ${unreadCount}`,
                              en: `New notifications: ${unreadCount}`,
                              uz: `Yangi bildirishnomalar: ${unreadCount}`,
                            })
                          : pick({
                              ru: "Вы в курсе последних обновлений",
                              en: "You're up to date",
                              uz: "Siz so'nggi yangilanishlardan xabardorsiz",
                            })}
                      </p>
                    </div>
                    <div className="max-h-[340px] overflow-y-auto p-2">
                      {!notificationsSupported ? (
                        <div className="rounded-[22px] bg-amber-50 px-4 py-6 text-center text-xs font-bold text-amber-700">
                          {pick({
                            ru: "Для уведомлений выполните SQL из database/event_applications.sql",
                            en: "Run SQL from database/event_applications.sql to enable notifications",
                            uz: "Bildirishnomalar uchun database/event_applications.sql ni ishga tushiring",
                          })}
                        </div>
                      ) : notificationsLoading ? (
                        <div className="flex items-center justify-center px-4 py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-[#10b981]" />
                        </div>
                      ) : notifications.length === 0 ? (
                        <div className="px-4 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {pick({ ru: "Пока пусто", en: "No notifications", uz: "Hali bo'sh" })}
                        </div>
                      ) : (
                        notifications.slice(0, 8).map((item) => {
                          const isUnread = new Date(item.happenedAt).getTime() > lastSeenMs;
                          return (
                            <Link
                              key={item.id}
                              href={item.href}
                              onClick={() => setIsNotificationsOpen(false)}
                              className="mb-2 flex items-start gap-3 rounded-[22px] px-4 py-3 transition-colors hover:bg-slate-50"
                            >
                              <div className="mt-0.5">
                                {item.type === "incoming" ? (
                                  <Clock3 className="h-4 w-4 text-amber-500" />
                                ) : item.type === "application_approved" || item.type === "payment_approved" ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[11px] font-bold leading-snug ${isUnread ? "text-slate-950" : "text-slate-600"}`}>
                                  {getNotificationText(item)}
                                </p>
                                <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-300">
                                  {formatNotificationDate(item.happenedAt)}
                                </p>
                              </div>
                            </Link>
                          );
                        })
                      )}
                    </div>
                    <div className="border-t border-slate-100 px-4 py-3">
                      <Link
                        href="/dashboard"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-[#10b981] transition-colors hover:text-emerald-700"
                      >
                        {pick({ ru: "Открыть кабинет", en: "Open dashboard", uz: "Kabinetni ochish" })}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="hidden items-center rounded-full bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-500 sm:inline-flex"
              >
                <LogOut className="me-2 h-4 w-4" />
                {pick({ ru: "Выйти", en: "Logout", uz: "Chiqish" })}
              </button>
            ) : (
              <Link
                href="/auth/login"
                className="hidden items-center rounded-full bg-[#10b981] px-6 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-all hover:bg-[#0da975] hover:shadow-lg hover:shadow-green-100 sm:inline-flex"
              >
                <FontAwesomeIcon icon={faUser} className="me-2" />
                {pick({ ru: "Войти", en: "Login", uz: "Kirish" })}
              </Link>
            )}

            <div ref={mobileMenuAreaRef} className="relative lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-5 w-5 flex-col items-center justify-between">
                  <span className={`h-0.5 w-full rounded-full bg-slate-900 transition-all ${isMenuOpen ? "translate-y-2 rotate-45" : ""}`} />
                  <span className={`h-0.5 w-full rounded-full bg-slate-900 transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
                  <span className={`h-0.5 w-full rounded-full bg-slate-900 transition-all ${isMenuOpen ? "-translate-y-2.5 -rotate-45" : ""}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div ref={mobileMenuPanelRef} className="mt-3 rounded-[28px] border border-slate-100 bg-white p-3 shadow-xl md:hidden">
            {isLoggedIn && isPremiumUser ? (
              <Link
                href="/premium"
                onClick={() => setIsMenuOpen(false)}
                className={`mb-3 flex items-center justify-between rounded-[22px] border px-4 py-3 ${premiumBadgeClasses}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                      {pick({ ru: "Текущий доступ", en: "Current access", uz: "Joriy kirish" })}
                    </p>
                    <p className="mt-1 text-sm font-black">
                      {premiumBadgeLabel}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em]">
                  {pick({ ru: "Открыть", en: "Open", uz: "Ochish" })}
                </span>
              </Link>
            ) : null}

            <ul className="grid gap-1">
              {menuItems.map((item) => {
                const isActive = isActiveMenuItem(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={`flex items-center rounded-[20px] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] transition-colors ${
                        isActive ? "bg-emerald-50 text-[#10b981]" : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {item.icon ? <FontAwesomeIcon icon={item.icon} className="me-3 h-3 w-3" /> : null}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 border-t border-slate-100 pt-3">
              {isLoggedIn ? (
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center rounded-[20px] bg-slate-950 px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-500"
                >
                  <LogOut className="me-2 h-4 w-4" />
                  {pick({ ru: "Выйти", en: "Logout", uz: "Chiqish" })}
                </button>
              ) : (
                <Link
                  href="/auth/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-[20px] bg-[#10b981] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#0da975]"
                >
                  <FontAwesomeIcon icon={faUser} className="me-2" />
                  {pick({ ru: "Войти", en: "Login", uz: "Kirish" })}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
