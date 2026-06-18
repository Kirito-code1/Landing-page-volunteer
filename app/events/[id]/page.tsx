"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  MapPin,
  Calendar,
  Clock3,
  Users,
  ChevronLeft,
  Share2,
  Mail,
  Info,
  AlertCircle,
  UserPlus,
  CheckCircle2,
  XCircle,
  Star,
  MessageSquare,
} from "lucide-react";
import EventVisual from "@/components/events/EventVisual";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getEventCategoryLabel,
  normalizeVolunteerCount,
} from "@/components/events/eventMeta";
import { hasRequiredPhone } from "@/lib/auth/phone";
import { buildCompleteProfilePath } from "@/lib/auth/redirect";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

interface EventDetails {
  id: string;
  user_id: string;
  title: string;
  location: string;
  date: string;
  created_at: string;
  category?: string | null;
  volunteers_needed?: number | null;
  description: string | null;
  image_url: string | null;
}

type ApplicationStatus = "pending" | "approved" | "rejected";

interface EventApplicationListItem {
  id: string;
  volunteer_id: string;
  status: ApplicationStatus;
}

interface OrganizerReview {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(locale);
}

export default function EventPage() {
  const { pick } = useLanguage();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [approvedCount, setApprovedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [myApplicationId, setMyApplicationId] = useState<string | null>(null);
  const [myApplicationStatus, setMyApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [participationSetupMissing, setParticipationSetupMissing] = useState(false);
  const [reviewsMissingSetup, setReviewsMissingSetup] = useState(false);
  const [organizerReviews, setOrganizerReviews] = useState<OrganizerReview[]>([]);
  const [isApplying, setIsApplying] = useState(false);

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

  const dateLocale = pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" });

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const supabaseUnavailableMessage = pick({
    ru: "Сервис временно недоступен. Попробуйте позже.",
    en: "The service is temporarily unavailable. Please try again later.",
    uz: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  const missingApplicationsHint = pick({
    ru: "Функция заявок не настроена. Выполните SQL из файла database/event_applications.sql.",
    en: "Applications feature is not configured. Run SQL from database/event_applications.sql.",
    uz: "Ariza funksiyasi sozlanmagan. database/event_applications.sql faylidagi SQL ni ishga tushiring.",
  });

  const showAlert = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  const isMissingApplicationsTableError = (message: string) => {
    const hasTableMention = /event_applications/i.test(message);
    const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const isMissingReviewsTableError = (message: string) => {
    const hasTableMention = /event_reviews/i.test(message);
    const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const loadParticipationData = useCallback(
    async (eventId: string, userId: string | null) => {
      const { data, error: supabaseError } = await supabase
        .from("event_applications")
        .select("id, volunteer_id, status")
        .eq("event_id", eventId);

      if (supabaseError) {
        if (isMissingApplicationsTableError(supabaseError.message)) {
          setParticipationSetupMissing(true);
          setApprovedCount(0);
          setPendingCount(0);
          setMyApplicationId(null);
          setMyApplicationStatus(null);
          return;
        }
        throw new Error(supabaseError.message);
      }

      const rows = (data ?? []) as EventApplicationListItem[];
      const approved = rows.filter((row) => row.status === "approved").length;
      const pending = rows.filter((row) => row.status === "pending").length;
      const myRow = userId ? rows.find((row) => row.volunteer_id === userId) : null;

      setParticipationSetupMissing(false);
      setApprovedCount(approved);
      setPendingCount(pending);
      setMyApplicationId(myRow?.id ?? null);
      setMyApplicationStatus(myRow?.status ?? null);
    },
    [supabase],
  );

  const loadOrganizerReviews = useCallback(
    async (organizerId: string) => {
      const { data, error: supabaseError } = await supabase
        .from("event_reviews")
        .select("id, rating, comment, created_at")
        .eq("target_id", organizerId)
        .eq("target_role", "organizer")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        if (isMissingReviewsTableError(supabaseError.message)) {
          setReviewsMissingSetup(true);
          setOrganizerReviews([]);
          return;
        }
        throw new Error(supabaseError.message);
      }

      setReviewsMissingSetup(false);
      setOrganizerReviews((data ?? []) as OrganizerReview[]);
    },
    [supabase],
  );

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);
        if (!supabase) {
          setError(supabaseUnavailableMessage);
          return;
        }

        const [{ data: sessionData }, { data, error: supabaseError }] = await Promise.all([
          supabase.auth.getSession(),
          supabase
            .from("events")
            .select("id, user_id, title, location, date, created_at, category, volunteers_needed, description, image_url")
            .eq("id", id)
            .single(),
        ]);

        if (supabaseError) throw new Error(supabaseError.message);

        if (!data) {
          throw new Error(pick({ ru: "Событие не найдено", en: "Event was not found", uz: "Tadbir topilmadi" }));
        }

        const user = sessionData.session?.user ?? null;
        setCurrentUser(user);
        setEvent(data as EventDetails);

        await Promise.all([
          loadParticipationData(data.id, user?.id ?? null),
          loadOrganizerReviews(data.user_id),
        ]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : pick({ ru: "Не удалось загрузить событие", en: "Failed to load event", uz: "Tadbirni yuklab bo'lmadi" });
        console.error(pick({ ru: "Ошибка при загрузке:", en: "Loading error:", uz: "Yuklash xatosi:" }), message);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchEvent();
  }, [id, supabase, pick, loadParticipationData, loadOrganizerReviews, supabaseUnavailableMessage]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApply = async () => {
    if (!event) return;

    if (!currentUser) {
      router.push(`/auth/login?next=/events/${event.id}`);
      return;
    }

    if (!hasRequiredPhone(currentUser)) {
      router.push(buildCompleteProfilePath(`/events/${event.id}`));
      return;
    }

    if (currentUser.id === event.user_id) {
      showAlert(pick({ ru: "Вы организатор", en: "You are the organizer", uz: "Siz tashkilotchisiz" }), pick({ ru: "Нельзя подать заявку на собственное событие.", en: "You cannot apply to your own event.", uz: "O'zingiz yaratgan tadbirga ariza yubora olmaysiz." }), "warning");
      return;
    }

    if (participationSetupMissing) {
      showAlert(pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }), missingApplicationsHint, "warning");
      return;
    }

    const volunteersNeeded = normalizeVolunteerCount(event.volunteers_needed);
    const seatsLeft = volunteersNeeded ? Math.max(0, volunteersNeeded - approvedCount) : null;

    if (seatsLeft !== null && seatsLeft <= 0 && myApplicationStatus !== "rejected") {
      showAlert(pick({ ru: "Места закончились", en: "No spots left", uz: "Bo'sh joy qolmadi" }), pick({ ru: "Набор уже закрыт по количеству волонтёров.", en: "Volunteer spots are already full.", uz: "Volontyor o'rinlari allaqachon to'lgan." }), "warning");
      return;
    }

    try {
      setIsApplying(true);
      const response = await fetch("/api/events/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, action: "submit" }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = result?.error || pick({ ru: "Не удалось отправить заявку", en: "Failed to send request", uz: "Arizani yuborib bo'lmadi" });

        if (isMissingApplicationsTableError(message)) {
          setParticipationSetupMissing(true);
          showAlert(pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }), missingApplicationsHint, "warning");
          return;
        }
        throw new Error(message);
      }

      await loadParticipationData(event.id, currentUser.id);
      showAlert(pick({ ru: "Заявка отправлена", en: "Request sent", uz: "Ariza yuborildi" }), pick({ ru: "Организатор рассмотрит вашу заявку в кабинете.", en: "The organizer will review your request in the dashboard.", uz: "Tashkilotchi arizangizni kabinetda ko'rib chiqadi." }), "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : pick({ ru: "Не удалось отправить заявку", en: "Failed to send request", uz: "Arizani yuborib bo'lmadi" });
      showAlert(pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }), message, "error");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelPendingRequest = async () => {
    if (!event || !currentUser || !myApplicationId || myApplicationStatus !== "pending") return;

    try {
      setIsApplying(true);
      const response = await fetch("/api/events/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, action: "cancel" }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        const message = result?.error || pick({ ru: "Не удалось отменить заявку", en: "Failed to cancel request", uz: "Arizani bekor qilib bo'lmadi" });

        if (isMissingApplicationsTableError(message)) {
          setParticipationSetupMissing(true);
          showAlert(pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }), missingApplicationsHint, "warning");
          return;
        }
        throw new Error(message);
      }

      await loadParticipationData(event.id, currentUser.id);
      showAlert(pick({ ru: "Заявка отменена", en: "Request canceled", uz: "Ariza bekor qilindi" }), pick({ ru: "Вы можете отправить заявку снова в любое время.", en: "You can submit a request again anytime.", uz: "Istalgan vaqtda arizani qayta yuborishingiz mumkin." }), "info");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : pick({ ru: "Не удалось отменить заявку", en: "Failed to cancel request", uz: "Arizani bekor qilib bo'lmadi" });
      showAlert(pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }), message, "error");
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {pick({ ru: "Упс! Что-то пошло не так", en: "Oops! Something went wrong", uz: "Voy! Nimadir xato ketdi" })}
        </h2>
        <p className="text-sm text-slate-500 mb-6">{error || pick({ ru: "Событие не найдено", en: "Event not found", uz: "Tadbir topilmadi" })}</p>
        <button onClick={() => router.push("/events")} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">
          {pick({ ru: "Вернуться к списку", en: "Back to list", uz: "Ro'yxatga qaytish" })}
        </button>
      </div>
    );
  }

  const volunteersNeeded = normalizeVolunteerCount(event.volunteers_needed);
  const seatsLeft = volunteersNeeded ? Math.max(0, volunteersNeeded - approvedCount) : null;
  const isEventOwner = Boolean(currentUser && currentUser.id === event.user_id);
  const isEventFull = seatsLeft !== null && seatsLeft <= 0;
  const organizerReviewCount = organizerReviews.length;
  const organizerRating = organizerReviewCount > 0 ? Math.round((organizerReviews.reduce((sum, review) => sum + review.rating, 0) / organizerReviewCount) * 10) / 10 : null;
  const recentOrganizerReviews = organizerReviews.slice(0, 3);
  const eventDateLabel = formatDate(event.date, dateLocale);
  const publishedLabel = formatDate(event.created_at, dateLocale);
  const categoryLabel = getEventCategoryLabel(event.category, pick);
  const participationProgress = volunteersNeeded && volunteersNeeded > 0 ? Math.min(100, Math.round((approvedCount / volunteersNeeded) * 100)) : null;
  const descriptionPreview = event.description?.trim() || pick({
    ru: "Организатор пока не добавил подробное описание.",
    en: "The organizer has not added a detailed description yet.",
    uz: "Tashkilotchi hali batafsil tavsif qoldirmagan.",
  });
  const requiresPhoneCompletion = Boolean(currentUser && !hasRequiredPhone(currentUser));

  const renderParticipationActions = () => {
    const baseBtn = "w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60";

    if (!currentUser) {
      return (
        <button onClick={handleApply} className={`${baseBtn} bg-slate-900 text-white hover:bg-slate-800`}>
          {pick({ ru: "Войти и участвовать", en: "Sign in to join", uz: "Qatnashish uchun kiring" })}
          <UserPlus size={16} />
        </button>
      );
    }

    if (isEventOwner) {
      return <button disabled className={`${baseBtn} border border-slate-200 text-slate-500 cursor-not-allowed`}>{pick({ ru: "Вы организатор", en: "You are organizer", uz: "Siz tashkilotchisiz" })}</button>;
    }

    if (myApplicationStatus === "approved") {
      return <button disabled className={`${baseBtn} bg-emerald-600 text-white cursor-not-allowed`}><CheckCircle2 size={16} /> {pick({ ru: "Заявка принята", en: "Request approved", uz: "Ariza tasdiqlandi" })}</button>;
    }

    if (myApplicationStatus === "pending") {
      return (
        <>
          <button disabled className={`${baseBtn} bg-amber-500 text-white cursor-not-allowed`}>{pick({ ru: "На рассмотрении", en: "Under review", uz: "Ko'rib chiqilmoqda" })}</button>
          <button onClick={handleCancelPendingRequest} disabled={isApplying} className={`${baseBtn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
            {pick({ ru: "Отменить заявку", en: "Cancel request", uz: "Arizani bekor qilish" })}
          </button>
        </>
      );
    }

    if (requiresPhoneCompletion) {
      return (
        <button onClick={() => router.push(buildCompleteProfilePath(`/events/${event.id}`))} className={`${baseBtn} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}>
          {pick({ ru: "Добавить телефон", en: "Add phone number", uz: "Telefon qo'shish" })}
        </button>
      );
    }

    if (participationSetupMissing) {
      return <button disabled className={`${baseBtn} border border-slate-200 text-slate-500 cursor-not-allowed`}>{pick({ ru: "Заявки недоступны", en: "Requests unavailable", uz: "Arizalar mavjud emas" })}</button>;
    }

    if (isEventFull) {
      return <button disabled className={`${baseBtn} bg-red-600 text-white cursor-not-allowed`}>{pick({ ru: "Набор закрыт", en: "No spots left", uz: "Qabul yopildi" })}</button>;
    }

    return (
      <button onClick={handleApply} disabled={isApplying} className={`${baseBtn} bg-slate-900 text-white hover:bg-slate-800`}>
        {isApplying ? pick({ ru: "Отправка...", en: "Sending...", uz: "Yuborilmoqda..." }) : myApplicationStatus === "rejected" ? pick({ ru: "Подать повторно", en: "Apply again", uz: "Qayta ariza" }) : pick({ ru: "Участвовать", en: "Join", uz: "Qatnashish" })}
        {myApplicationStatus === "rejected" ? <XCircle size={16} /> : <UserPlus size={16} />}
      </button>
    );
  };

  const participationHint = currentUser
    ? isEventOwner
      ? pick({ ru: "Вы видите эту страницу как организатор.", en: "You are viewing this page as the organizer.", uz: "Siz bu sahifani tashkilotchi sifatida ko'ryapsiz." })
      : myApplicationStatus === "approved"
        ? pick({ ru: "Организатор подтвердил ваше участие.", en: "The organizer has confirmed your participation.", uz: "Tashkilotchi sizning ishtirokingizni tasdiqladi." })
        : myApplicationStatus === "pending"
          ? pick({ ru: "Заявка отправлена. Организатор примет решение в кабинете.", en: "Your request has been sent. The organizer will review it in the dashboard.", uz: "Ariza yuborildi. Tashkilotchi uni kabinetda ko'rib chiqadi." })
          : myApplicationStatus === "rejected"
            ? pick({ ru: "Ранее заявка была отклонена, но вы можете отправить её повторно.", en: "Your request was previously rejected, but you can send it again.", uz: "Arizangiz avval rad etilgan, ammo uni qayta yuborishingiz mumkin." })
            : requiresPhoneCompletion
              ? pick({ ru: "Сначала добавьте номер телефона в профиле.", en: "Add your phone number to the profile first.", uz: "Avval profilingizga telefon raqamini qo'shing." })
              : pick({ ru: "Оставьте заявку, и организатор свяжется с вами после проверки.", en: "Send a request and the organizer will get back to you after review.", uz: "Ariza qoldiring, tashkilotchi tekshiruvdan so'ng siz bilan bog'lanadi." })
    : pick({ ru: "Чтобы отправить заявку, войдите в аккаунт.", en: "Sign in to apply.", uz: "Ariza yuborish uchun akkauntga kiring." });

  const infoCards = [
    { icon: Calendar, label: pick({ ru: "Дата", en: "Date", uz: "Sana" }), value: eventDateLabel, detail: pick({ ru: "Дата проведения", en: "Event date", uz: "Tadbir sanasi" }) },
    { icon: MapPin, label: pick({ ru: "Локация", en: "Location", uz: "Joylashuv" }), value: event.location, detail: pick({ ru: "Место встречи", en: "Meeting point", uz: "Uchrashuv joyi" }) },
    { icon: Users, label: pick({ ru: "Команда", en: "Team size", uz: "Jamoa" }), value: volunteersNeeded?.toString() ?? "—", detail: volunteersNeeded !== null ? pick({ ru: "нужно волонтёров", en: "volunteers needed", uz: "kerakli volontyor" }) : pick({ ru: "лимит не указан", en: "limit not set", uz: "limit ko'rsatilmagan" }) },
    { icon: Clock3, label: pick({ ru: "Опубликовано", en: "Published", uz: "E'lon qilingan" }), value: publishedLabel, detail: `ID ${event.id.toString().split("-")[0]}` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2">
          <ChevronLeft size={16} />
          {pick({ ru: "Назад", en: "Back", uz: "Orqaga" })}
        </button>

        {/* Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="grid lg:grid-cols-[1fr_400px]">
            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">{categoryLabel}</span>
                {!reviewsMissingSetup && organizerRating && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                    <Star className="w-3 h-3 fill-current" /> {organizerRating.toFixed(1)}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">{event.title}</h1>
              <p className="mt-4 text-sm text-slate-500 leading-relaxed">{descriptionPreview}</p>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{pick({ ru: "Подтверждено", en: "Confirmed", uz: "Tasdiqlangan" })}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{approvedCount}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{pick({ ru: "На проверке", en: "Pending", uz: "Kutilmoqda" })}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{pendingCount}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{pick({ ru: "Свободно", en: "Open spots", uz: "Bo'sh" })}</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{seatsLeft ?? "—"}</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[300px] lg:min-h-full bg-slate-100">
              <EventVisual title={event.title} category={event.category} categoryLabel={categoryLabel} imageUrl={event.image_url} className="object-cover" sizes="(max-width: 1280px) 100vw, 42vw" priority />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex gap-3">
                <span className="bg-white/20 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {eventDateLabel}</span>
                <span className="bg-white/20 backdrop-blur text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {event.location?.split(",")[0]}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {infoCards.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <Icon className="w-5 h-5 text-emerald-500 mb-2" />
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="text-sm font-medium text-slate-900 mt-1">{item.value}</p>
              </article>
            );
          })}
        </div>

        {/* Content + Sidebar */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="space-y-6">
            
            {/* Description */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{pick({ ru: "Описание", en: "Description", uz: "Tavsif" })}</h2>
              {event.description ? (
                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{event.description}</div>
              ) : (
                <p className="text-sm text-slate-400 italic">{pick({ ru: "Организатор ещё не добавил описание.", en: "The organizer hasn't added a description yet.", uz: "Tashkilotchi hali tavsif qoldirmagan." })}</p>
              )}
            </section>

            {/* Before you apply */}
            <section className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{pick({ ru: "Перед откликом", en: "Before you apply", uz: "Ariza berishdan oldin" })}</h2>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex gap-2"><span className="font-medium text-slate-900">{pick({ ru: "Формат:", en: "Format:", uz: "Format:" })}</span> {pick({ ru: "Офлайн событие", en: "Offline event", uz: "Oflayn tadbir" })}</li>
                <li className="flex gap-2"><span className="font-medium text-slate-900">{pick({ ru: "Подтверждение:", en: "Approval:", uz: "Tasdiqlash:" })}</span> {pick({ ru: "Организатор проверяет заявки вручную", en: "Organizer reviews applications manually", uz: "Tashkilotchi arizalarni qo'lda ko'rib chiqadi" })}</li>
                <li className="flex gap-2">
                  <span className="font-medium text-slate-900">{pick({ ru: "Места:", en: "Spots:", uz: "Joylar:" })}</span> 
                  {seatsLeft === null ? pick({ ru: "Без