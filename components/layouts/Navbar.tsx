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
import { LogOut, Heart, Bell, Clock3, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useLanguage, type Locale } from "@/components/providers/LanguageProvider";

// 1. Определяем интерфейс для пунктов меню, чтобы TS не ругался на отсутствие icon
interface MenuItem {
  href: string;
  label: string;
  icon?: IconDefinition; // Знак вопроса делает поле необязательным
}

type NotificationType = "incoming" | "approved" | "rejected";

interface NavbarNotification {
  id: string;
  eventId: string;
  eventTitle: string;
  happenedAt: string;
  type: NotificationType;
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

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [notifications, setNotifications] = useState<NavbarNotification[]>([]);
  const [lastSeenMs, setLastSeenMs] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(true);
  const userRef = useRef<SupabaseUser | null>(null);
  const notificationsRef = useRef<NavbarNotification[]>([]);
  const hasNotificationsFetchedRef = useRef(false);
  const { locale, setLocale, pick } = useLanguage();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  const fetchNotifications = useCallback(
    async (sessionUser: SupabaseUser | null) => {
      if (!sessionUser) {
        setNotifications([]);
        notificationsRef.current = [];
        setLastSeenMs(0);
        setNotificationsSupported(true);
        hasNotificationsFetchedRef.current = false;
        setNotificationsLoading(false);
        return;
      }

      const shouldShowLoader =
        !hasNotificationsFetchedRef.current && notificationsRef.current.length === 0;
      if (shouldShowLoader) {
        setNotificationsLoading(true);
      }
      const metadata = sessionUser.user_metadata ?? {};
      setLastSeenMs(parseLastSeen(metadata.last_notifications_seen));

      const [incomingRes, decisionRes] = await Promise.all([
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
      ]);

      const anyError = incomingRes.error || decisionRes.error;
      if (anyError) {
        if (isMissingApplicationsTableError(anyError.message)) {
          setNotificationsSupported(false);
          setNotifications([]);
          notificationsRef.current = [];
        } else {
          setNotificationsSupported(true);
          console.error("Notifications load error:", anyError.message);
        }
        hasNotificationsFetchedRef.current = true;
        setNotificationsLoading(false);
        return;
      }

      setNotificationsSupported(true);
      const incomingRows = incomingRes.data ?? [];
      const decisionRows = decisionRes.data ?? [];
      const eventIds = Array.from(
        new Set(
          [...incomingRows, ...decisionRows]
            .map((row) => row.event_id as string)
            .filter(Boolean),
        ),
      );

      const eventTitleMap: Record<string, string> = {};
      if (eventIds.length > 0) {
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
          eventId: row.event_id,
          eventTitle:
            eventTitleMap[row.event_id] ??
            pick({ ru: "Событие", en: "Event", uz: "Tadbir" }),
          happenedAt: row.created_at,
          type: "incoming" as NotificationType,
        })),
        ...decisionRows.map((row) => ({
          id: `decision-${row.id}`,
          eventId: row.event_id,
          eventTitle:
            eventTitleMap[row.event_id] ??
            pick({ ru: "Событие", en: "Event", uz: "Tadbir" }),
          happenedAt: row.reviewed_at as string,
          type: row.status === "approved" ? "approved" as NotificationType : "rejected" as NotificationType,
        })),
      ]
        .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
        .slice(0, 20);

      setNotifications(nextNotifications);
      notificationsRef.current = nextNotifications;
      hasNotificationsFetchedRef.current = true;
      setNotificationsLoading(false);
    },
    [supabase, pick],
  );

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      const nextUser = session?.user ?? null;
      userRef.current = nextUser;
      setUser(nextUser);
      setIsLoggedIn(Boolean(nextUser));
      await fetchNotifications(nextUser);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const nextUser = session?.user ?? null;
      userRef.current = nextUser;
      setUser(nextUser);
      setIsLoggedIn(Boolean(nextUser));
      if (event === "USER_UPDATED") {
        return;
      }
      await fetchNotifications(nextUser);
    });

    intervalId = setInterval(() => {
      fetchNotifications(userRef.current);
    }, 30000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (intervalId) clearInterval(intervalId);
    };
  }, [supabase, fetchNotifications]);

  const markNotificationsAsSeen = async () => {
    if (!user || notifications.length === 0) return;

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
    await supabase.auth.signOut();
    setIsMenuOpen(false);
    setIsNotificationsOpen(false);
    userRef.current = null;
    setUser(null);
    setNotifications([]);
    notificationsRef.current = [];
    hasNotificationsFetchedRef.current = false;
    setLastSeenMs(0);
    router.push("/");
    router.refresh();
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
        ru: `Новый отклик: ${item.eventTitle}`,
        en: `New application: ${item.eventTitle}`,
        uz: `Yangi ariza: ${item.eventTitle}`,
      });
    }
    if (item.type === "approved") {
      return pick({
        ru: `Заявка принята: ${item.eventTitle}`,
        en: `Application approved: ${item.eventTitle}`,
        uz: `Ariza tasdiqlandi: ${item.eventTitle}`,
      });
    }
    return pick({
      ru: `Заявка отклонена: ${item.eventTitle}`,
      en: `Application rejected: ${item.eventTitle}`,
      uz: `Ariza rad etildi: ${item.eventTitle}`,
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

  return (
    <nav className="bg-white/80 sticky w-full z-[100] top-0 border-b border-gray-100 backdrop-blur-md">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4 md:px-6">
        
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 bg-[#10b981] rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-lg shadow-green-100">
            <Heart className="w-6 h-6 text-white fill-current" />
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tighter uppercase italic">
            Volo<span className="text-[#10b981]">Hero</span>
          </span>
        </Link>

        {/* Right Side Tools */}
        <div className="flex items-center md:order-2 space-x-2">
          
          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="inline-flex items-center font-black text-[11px] px-3 py-2 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors uppercase tracking-widest"
            >
              <Image 
                src={selectedLanguage.flag} 
                width={18} height={18} 
                className="rounded-full me-2 object-cover border border-gray-100" 
                alt={selectedLanguage.name} 
                unoptimized 
              />
              {selectedLanguage.code}
              <FontAwesomeIcon icon={faChevronDown} className={`ms-2 w-2 h-2 transition-transform ${isLangOpen ? "rotate-180" : ""}`} />
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl w-44 overflow-hidden animate-in fade-in zoom-in-95">
                <ul className="py-2 text-[12px] font-bold text-gray-700">
                  {languages.map((lang) => (
                    <li key={lang.name}>
                      <button
                        onClick={() => { setLocale(lang.locale); setIsLangOpen(false); }}
                        className="flex items-center w-full px-4 py-3 hover:bg-green-50 hover:text-[#10b981] transition-colors"
                      >
                        <Image src={lang.flag} width={16} height={16} className="me-3 rounded-full border border-gray-100" alt="" unoptimized />
                        {lang.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {isLoggedIn && (
            <div className="relative">
              <button
                onClick={async () => {
                  const nextOpen = !isNotificationsOpen;
                  setIsNotificationsOpen(nextOpen);
                  if (nextOpen) {
                    await markNotificationsAsSeen();
                  }
                }}
                className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
                aria-label={pick({ ru: "Уведомления", en: "Notifications", uz: "Bildirishnomalar" })}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 z-50 bg-white border border-gray-100 rounded-2xl shadow-xl w-[320px] overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-[10px] uppercase tracking-widest font-black text-gray-400">
                      {pick({ ru: "Уведомления", en: "Notifications", uz: "Bildirishnomalar" })}
                    </p>
                  </div>
                  <div className="max-h-[320px] overflow-y-auto">
                    {!notificationsSupported ? (
                      <div className="px-4 py-6 text-center text-xs font-bold text-amber-700 bg-amber-50">
                        {pick({
                          ru: "Для уведомлений выполните SQL из database/event_applications.sql",
                          en: "Run SQL from database/event_applications.sql to enable notifications",
                          uz: "Bildirishnomalar uchun database/event_applications.sql ni ishga tushiring",
                        })}
                      </div>
                    ) : notificationsLoading ? (
                      <div className="px-4 py-8 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-[#10b981]" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-[10px] uppercase tracking-widest font-black text-gray-400">
                        {pick({ ru: "Пока пусто", en: "No notifications", uz: "Hali bo'sh" })}
                      </div>
                    ) : (
                      notifications.slice(0, 8).map((item) => {
                        const isUnread = new Date(item.happenedAt).getTime() > lastSeenMs;
                        return (
                          <Link
                            key={item.id}
                            href={item.type === "incoming" ? "/dashboard" : "/applications"}
                            onClick={() => setIsNotificationsOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50"
                          >
                            <div className="mt-0.5">
                              {item.type === "incoming" ? (
                                <Clock3 className="w-4 h-4 text-amber-500" />
                              ) : item.type === "approved" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[11px] font-bold leading-snug ${isUnread ? "text-gray-900" : "text-gray-600"}`}>
                                {getNotificationText(item)}
                              </p>
                              <p className="text-[9px] uppercase tracking-widest font-black text-gray-300 mt-1">
                                {formatNotificationDate(item.happenedAt)}
                              </p>
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100">
                    <Link
                      href="/applications"
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-[10px] uppercase tracking-widest font-black text-[#10b981] hover:text-emerald-700 transition-colors"
                    >
                      {pick({ ru: "Открыть мои отклики", en: "Open my applications", uz: "Mening arizalarimni ochish" })}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Auth Button */}
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center bg-gray-900 text-white px-5 py-2.5 rounded-[14px] font-black text-[11px] uppercase tracking-widest hover:bg-red-500 transition-all active:scale-95 shadow-md"
            >
              <LogOut className="w-4 h-4 me-2" />
              {pick({ ru: "Выйти", en: "Logout", uz: "Chiqish" })}
            </button>
          ) : (
            <Link href="/auth/login">
              <button className="hidden sm:flex items-center bg-[#10b981] text-white px-6 py-2.5 rounded-[14px] font-black text-[11px] uppercase tracking-widest hover:bg-[#0da975] transition-all hover:shadow-lg hover:shadow-green-100 active:scale-95">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                {pick({ ru: "Войти", en: "Login", uz: "Kirish" })}
              </button>
            </Link>
          )}

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center p-2 w-10 h-10 justify-center text-gray-500 rounded-xl md:hidden hover:bg-gray-50"
          >
            <div className="w-5 h-5 flex flex-col justify-between items-center">
              <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all ${isMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all ${isMenuOpen ? "opacity-0" : ""}`} />
              <span className={`w-full h-0.5 bg-gray-900 rounded-full transition-all ${isMenuOpen ? "-rotate-45 -translate-y-2.5" : ""}`} />
            </div>
          </button>
        </div>

        {/* Menu Links */}
        <div className={`${isMenuOpen ? "block" : "hidden"} w-full md:flex md:w-auto md:order-1`}>
          <ul className="flex flex-col p-4 md:p-0 mt-4 font-black text-[11px] uppercase tracking-widest md:space-x-8 md:flex-row md:mt-0 md:border-0">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center py-3 px-4 md:p-0 transition-colors ${
                      isActive ? "text-[#10b981]" : "text-gray-900 hover:text-[#10b981]"
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {/* Рендерим иконку только если она существует в объекте */}
                    {item.icon && <FontAwesomeIcon icon={item.icon} className="me-2 w-3 h-3" />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
}
