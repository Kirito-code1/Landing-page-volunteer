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
  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }
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

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        if (!data) {
          throw new Error(
            pick({
              ru: "Событие не найдено в базе данных",
              en: "Event was not found in the database",
              uz: "Tadbir ma'lumotlar bazasida topilmadi",
            }),
          );
        }

        const user = sessionData.session?.user ?? null;
        setCurrentUser(user);
        setEvent(data as EventDetails);

        await Promise.all([
          loadParticipationData(data.id, user?.id ?? null),
          loadOrganizerReviews(data.user_id),
        ]);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : pick({
                ru: "Не удалось загрузить событие",
                en: "Failed to load event",
                uz: "Tadbirni yuklab bo'lmadi",
              });
        console.error(
          pick({ ru: "Ошибка при загрузке:", en: "Loading error:", uz: "Yuklash xatosi:" }),
          message,
        );
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

    if (currentUser.id === event.user_id) {
      showAlert(
        pick({ ru: "Вы организатор", en: "You are the organizer", uz: "Siz tashkilotchisiz" }),
        pick({
          ru: "Нельзя подать заявку на собственное событие.",
          en: "You cannot apply to your own event.",
          uz: "O'zingiz yaratgan tadbirga ariza yubora olmaysiz.",
        }),
        "warning",
      );
      return;
    }

    if (participationSetupMissing) {
      showAlert(
        pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
        missingApplicationsHint,
        "warning",
      );
      return;
    }

    const volunteersNeeded = normalizeVolunteerCount(event.volunteers_needed);
    const seatsLeft = volunteersNeeded ? Math.max(0, volunteersNeeded - approvedCount) : null;

    if (seatsLeft !== null && seatsLeft <= 0 && myApplicationStatus !== "rejected") {
      showAlert(
        pick({ ru: "Места закончились", en: "No spots left", uz: "Bo'sh joy qolmadi" }),
        pick({
          ru: "Набор уже закрыт по количеству волонтёров.",
          en: "Volunteer spots are already full.",
          uz: "Volontyor o'rinlari allaqachon to'lgan.",
        }),
        "warning",
      );
      return;
    }

    try {
      setIsApplying(true);

      if (myApplicationId) {
        const { error: updateError } = await supabase
          .from("event_applications")
          .update({ status: "pending", reviewed_at: null })
          .eq("id", myApplicationId)
          .eq("volunteer_id", currentUser.id);

        if (updateError) {
          if (isMissingApplicationsTableError(updateError.message)) {
            setParticipationSetupMissing(true);
            showAlert(
              pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
              missingApplicationsHint,
              "warning",
            );
            return;
          }
          throw new Error(updateError.message);
        }
      } else {
        const payload = {
          event_id: event.id,
          organizer_id: event.user_id,
          volunteer_id: currentUser.id,
          volunteer_name: currentUser.user_metadata?.full_name ?? null,
          volunteer_email: currentUser.email ?? null,
          volunteer_phone: currentUser.user_metadata?.phone ?? null,
          status: "pending" as ApplicationStatus,
        };

        const { error: insertError } = await supabase.from("event_applications").insert([payload]);
        if (insertError) {
          if (isMissingApplicationsTableError(insertError.message)) {
            setParticipationSetupMissing(true);
            showAlert(
              pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
              missingApplicationsHint,
              "warning",
            );
            return;
          }

          const isDuplicate =
            insertError.code === "23505" ||
            /duplicate|already exists|unique/i.test(insertError.message);

          if (isDuplicate) {
            showAlert(
              pick({ ru: "Заявка уже есть", en: "Request already exists", uz: "Ariza allaqachon mavjud" }),
              pick({
                ru: "Вы уже отправили заявку на это событие.",
                en: "You already submitted a request for this event.",
                uz: "Siz bu tadbir uchun allaqachon ariza yuborgansiz.",
              }),
              "info",
            );
            await loadParticipationData(event.id, currentUser.id);
            return;
          }

          throw new Error(insertError.message);
        }
      }

      await loadParticipationData(event.id, currentUser.id);
      showAlert(
        pick({ ru: "Заявка отправлена", en: "Request sent", uz: "Ariza yuborildi" }),
        pick({
          ru: "Организатор рассмотрит вашу заявку в кабинете.",
          en: "The organizer will review your request in the dashboard.",
          uz: "Tashkilotchi arizangizni kabinetda ko'rib chiqadi.",
        }),
        "success",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : pick({
              ru: "Не удалось отправить заявку",
              en: "Failed to send request",
              uz: "Arizani yuborib bo'lmadi",
            });
      showAlert(
        pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }),
        message,
        "error",
      );
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelPendingRequest = async () => {
    if (!event || !currentUser || !myApplicationId || myApplicationStatus !== "pending") {
      return;
    }

    try {
      setIsApplying(true);
      const { error: deleteError } = await supabase
        .from("event_applications")
        .delete()
        .eq("id", myApplicationId)
        .eq("volunteer_id", currentUser.id)
        .eq("status", "pending");

      if (deleteError) {
        if (isMissingApplicationsTableError(deleteError.message)) {
          setParticipationSetupMissing(true);
          showAlert(
            pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
            missingApplicationsHint,
            "warning",
          );
          return;
        }
        throw new Error(deleteError.message);
      }

      await loadParticipationData(event.id, currentUser.id);
      showAlert(
        pick({ ru: "Заявка отменена", en: "Request canceled", uz: "Ariza bekor qilindi" }),
        pick({
          ru: "Вы можете отправить заявку снова в любое время.",
          en: "You can submit a request again anytime.",
          uz: "Istalgan vaqtda arizani qayta yuborishingiz mumkin.",
        }),
        "info",
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : pick({
              ru: "Не удалось отменить заявку",
              en: "Failed to cancel request",
              uz: "Arizani bekor qilib bo'lmadi",
            });
      showAlert(
        pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }),
        message,
        "error",
      );
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfdfd] gap-4">
        <Loader2 className="animate-spin text-[#10b981] w-12 h-12" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 italic">
          {pick({
            ru: "Загружаем данные...",
            en: "Loading data...",
            uz: "Ma'lumotlar yuklanmoqda...",
          })}
        </p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfdfd] p-6 text-center">
        <AlertCircle className="w-16 h-16 text-red-100 mb-6" />
        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 mb-2">
          {pick({
            ru: "Упс! Что-то пошло не так",
            en: "Oops! Something went wrong",
            uz: "Voy! Nimadir xato ketdi",
          })}
        </h2>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mb-8">
          {error || pick({ ru: "Событие не найдено", en: "Event not found", uz: "Tadbir topilmadi" })}
        </p>
        <button
          onClick={() => router.push("/events")}
          className="px-8 py-4 bg-gray-900 text-white rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all"
        >
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
  const organizerRating =
    organizerReviewCount > 0
      ? Math.round(
          (organizerReviews.reduce((sum, review) => sum + review.rating, 0) / organizerReviewCount) * 10,
        ) / 10
      : null;
  const recentOrganizerReviews = organizerReviews.slice(0, 3);
  const eventDateLabel = formatDate(event.date, dateLocale);
  const publishedLabel = formatDate(event.created_at, dateLocale);
  const categoryLabel = getEventCategoryLabel(event.category, pick);
  const participationProgress =
    volunteersNeeded && volunteersNeeded > 0
      ? Math.min(100, Math.round((approvedCount / volunteersNeeded) * 100))
      : null;
  const descriptionPreview =
    event.description?.trim() ||
    pick({
      ru: "Организатор пока не добавил подробное описание, но вы уже можете увидеть дату, место и условия участия.",
      en: "The organizer has not added a detailed description yet, but you can already see the date, location and participation details.",
      uz: "Tashkilotchi hali batafsil tavsif qoldirmagan, ammo sana, joy va ishtirok shartlari allaqachon ko'rinadi.",
    });

  const renderParticipationActions = () => {
    if (!currentUser) {
      return (
        <button
          onClick={handleApply}
          className="w-full rounded-[24px] bg-[#10b981] px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_rgba(16,185,129,0.28)] transition-colors hover:bg-[#0da975]"
        >
          <span className="flex items-center justify-center gap-3">
            {pick({ ru: "Войти и участвовать", en: "Sign in to join", uz: "Qatnashish uchun kiring" })}
            <UserPlus size={18} />
          </span>
        </button>
      );
    }

    if (isEventOwner) {
      return (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-[24px] border border-slate-200 bg-slate-100 px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"
        >
          {pick({ ru: "Вы организатор", en: "You are organizer", uz: "Siz tashkilotchisiz" })}
        </button>
      );
    }

    if (myApplicationStatus === "approved") {
      return (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-[24px] bg-emerald-500 px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white"
        >
          <span className="flex items-center justify-center gap-3">
            {pick({ ru: "Заявка принята", en: "Request approved", uz: "Ariza tasdiqlandi" })}
            <CheckCircle2 size={18} />
          </span>
        </button>
      );
    }

    if (myApplicationStatus === "pending") {
      return (
        <>
          <button
            disabled
            className="w-full cursor-not-allowed rounded-[24px] bg-amber-500 px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white"
          >
            {pick({ ru: "Заявка на проверке", en: "Under review", uz: "Ko'rib chiqilmoqda" })}
          </button>
          <button
            onClick={handleCancelPendingRequest}
            disabled={isApplying}
            className="w-full rounded-[22px] border border-slate-200 bg-white px-6 py-3.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-[#10b981] hover:text-[#10b981] disabled:opacity-60"
          >
            {pick({ ru: "Отменить заявку", en: "Cancel request", uz: "Arizani bekor qilish" })}
          </button>
        </>
      );
    }

    if (participationSetupMissing) {
      return (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-[24px] border border-slate-200 bg-slate-100 px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500"
        >
          {pick({ ru: "Заявки недоступны", en: "Requests unavailable", uz: "Arizalar mavjud emas" })}
        </button>
      );
    }

    if (isEventFull) {
      return (
        <button
          disabled
          className="w-full cursor-not-allowed rounded-[24px] bg-red-500 px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white"
        >
          {pick({ ru: "Набор закрыт", en: "No spots left", uz: "Qabul yopildi" })}
        </button>
      );
    }

    return (
      <button
        onClick={handleApply}
        disabled={isApplying}
        className="w-full rounded-[24px] bg-[#10b981] px-6 py-4 text-[11px] font-black uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_rgba(16,185,129,0.28)] transition-colors hover:bg-[#0da975] disabled:opacity-60"
      >
        <span className="flex items-center justify-center gap-3">
          {isApplying
            ? pick({ ru: "Отправка...", en: "Sending...", uz: "Yuborilmoqda..." })
            : myApplicationStatus === "rejected"
              ? pick({ ru: "Подать повторно", en: "Apply again", uz: "Qayta ariza" })
              : pick({ ru: "Участвовать", en: "Join", uz: "Qatnashish" })}
          {myApplicationStatus === "rejected" ? <XCircle size={18} /> : <UserPlus size={18} />}
        </span>
      </button>
    );
  };

  const participationHint = currentUser
    ? isEventOwner
      ? pick({
          ru: "Вы видите эту страницу как организатор. Управление заявками доступно в кабинете.",
          en: "You are viewing this page as the organizer. Application management is available in the dashboard.",
          uz: "Siz bu sahifani tashkilotchi sifatida ko'ryapsiz. Arizalarni boshqarish kabinetda mavjud.",
        })
      : myApplicationStatus === "approved"
        ? pick({
            ru: "Организатор уже подтвердил ваше участие. Следите за обновлениями и деталями события.",
            en: "The organizer has already confirmed your participation. Keep an eye on updates and event details.",
            uz: "Tashkilotchi sizning ishtirokingizni tasdiqlagan. Yangilanishlar va tadbir tafsilotlarini kuzating.",
          })
        : myApplicationStatus === "pending"
          ? pick({
              ru: "Заявка отправлена. Организатор примет решение в личном кабинете.",
              en: "Your request has been sent. The organizer will review it in the dashboard.",
              uz: "Ariza yuborildi. Tashkilotchi uni kabinetda ko'rib chiqadi.",
            })
          : myApplicationStatus === "rejected"
            ? pick({
                ru: "Ранее заявка была отклонена, но вы можете отправить её повторно.",
                en: "Your request was previously rejected, but you can send it again.",
                uz: "Arizangiz avval rad etilgan, ammo uni qayta yuborishingiz mumkin.",
              })
            : pick({
                ru: "Оставьте заявку, и организатор свяжется с вами после проверки.",
                en: "Send a request and the organizer will get back to you after review.",
                uz: "Ariza qoldiring, tashkilotchi tekshiruvdan so'ng siz bilan bog'lanadi.",
              })
    : pick({
        ru: "Чтобы отправить заявку, войдите в аккаунт. После этого вы сможете отслеживать статус участия.",
        en: "Sign in to apply. After that you will be able to track your participation status.",
        uz: "Ariza yuborish uchun akkauntga kiring. Shundan keyin ishtirok holatini kuzata olasiz.",
      });

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#edf9f4_0%,_#fcfdfd_18%,_#fcfdfd_100%)] pb-20">
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-8">
        <button
          onClick={() => router.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 shadow-sm backdrop-blur transition-colors hover:text-[#10b981]"
        >
          <ChevronLeft size={16} />
          {pick({ ru: "Назад к списку", en: "Back to list", uz: "Ro'yxatga qaytish" })}
        </button>

        <section className="overflow-hidden rounded-[38px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
          <div className="grid 2xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_transparent_45%),linear-gradient(180deg,_#ffffff_0%,_#f8fcfb_100%)] p-6 sm:p-8 lg:p-10">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-emerald-100/60 blur-3xl" />
              <div className="relative">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    {categoryLabel}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {pick({ ru: "Активное объявление", en: "Active listing", uz: "Faol e'lon" })}
                  </span>
                  {!reviewsMissingSetup && organizerRating ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-700">
                      <Star className="h-4 w-4 fill-current" />
                      {organizerRating.toFixed(1)} · {organizerReviewCount}
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-6 max-w-3xl text-[clamp(2.6rem,9vw,4.2rem)] font-black italic tracking-[-0.06em] text-slate-950 lg:leading-[0.9]">
                  {event.title}
                </h1>

                <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg">
                  {descriptionPreview}
                </p>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-[26px] border border-white bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {pick({ ru: "Подтверждено", en: "Confirmed", uz: "Tasdiqlangan" })}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{approvedCount}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {pick({ ru: "волонтёров", en: "volunteers", uz: "volontyor" })}
                    </p>
                  </div>
                  <div className="rounded-[26px] border border-white bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {pick({ ru: "На рассмотрении", en: "Pending", uz: "Ko'rib chiqilmoqda" })}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">{pendingCount}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {pick({ ru: "заявок", en: "requests", uz: "ariza" })}
                    </p>
                  </div>
                  <div className="rounded-[26px] border border-white bg-white/90 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      {pick({ ru: "Свободные места", en: "Open spots", uz: "Bo'sh o'rinlar" })}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {seatsLeft ?? "—"}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {seatsLeft === null
                        ? pick({ ru: "лимит не указан", en: "limit not set", uz: "limit ko'rsatilmagan" })
                        : pick({ ru: "ещё доступны", en: "still available", uz: "hali mavjud" })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative min-h-[320px] xl:min-h-full">
              <EventVisual
                title={event.title}
                category={event.category}
                categoryLabel={categoryLabel}
                imageUrl={event.image_url}
                className="object-cover"
                sizes="(max-width: 1280px) 100vw, 42vw"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.68)_100%)]" />
              <div className="absolute inset-x-5 bottom-5 flex flex-wrap gap-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60">
                    {pick({ ru: "Дата", en: "Date", uz: "Sana" })}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{eventDateLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-md">
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-white/60">
                    {pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })}
                  </p>
                  <p className="mt-1 break-words text-sm font-bold text-white">{event.location}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              icon: Calendar,
              label: pick({ ru: "Когда", en: "When", uz: "Qachon" }),
              value: eventDateLabel,
              detail: pick({ ru: "Дата проведения", en: "Event date", uz: "Tadbir sanasi" }),
            },
            {
              icon: MapPin,
              label: pick({ ru: "Где", en: "Where", uz: "Qayerda" }),
              value: event.location,
              detail: pick({ ru: "Место встречи", en: "Meeting point", uz: "Uchrashuv joyi" }),
            },
            {
              icon: Users,
              label: pick({ ru: "Сколько людей", en: "Team size", uz: "Jamoa soni" }),
              value: volunteersNeeded?.toString() ?? "—",
              detail:
                volunteersNeeded !== null
                  ? pick({ ru: "нужно волонтёров", en: "volunteers needed", uz: "kerakli volontyor" })
                  : pick({ ru: "лимит не указан", en: "limit not set", uz: "limit ko'rsatilmagan" }),
            },
            {
              icon: Clock3,
              label: pick({ ru: "Опубликовано", en: "Published", uz: "E'lon qilingan" }),
              value: publishedLabel,
              detail: `ID ${event.id.toString().split("-")[0]}`,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-[28px] border border-white bg-white/90 p-5 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#10b981]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-black text-slate-950">{item.value}</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">{item.detail}</p>
              </article>
            );
          })}
        </section>

        <div className="mt-8 grid items-start gap-8 2xl:grid-cols-[minmax(0,1.1fr)_360px]">
          <div className="space-y-6">
            <section className="rounded-[34px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#10b981]">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#10b981]">
                    {pick({ ru: "Описание", en: "Overview", uz: "Tavsif" })}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {pick({ ru: "Что это за событие", en: "What this event is about", uz: "Bu tadbir nima haqida" })}
                  </h2>
                </div>
              </div>

              {event.description ? (
                <div className="mt-6 whitespace-pre-wrap text-base font-medium leading-8 text-slate-600">
                  {event.description}
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-sm font-semibold leading-7 text-slate-500">
                    {pick({
                      ru: "Организатор ещё не добавил подробное описание. Для быстрой оценки используйте блоки выше: дата, место, формат и количество мест.",
                      en: "The organizer has not added a detailed description yet. Use the blocks above to quickly understand the date, place, format and available spots.",
                      uz: "Tashkilotchi hali batafsil tavsif qoldirmagan. Sana, joy, format va bo'sh o'rinlar bo'yicha yuqoridagi bloklardan foydalaning.",
                    })}
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-[34px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    {pick({ ru: "Перед откликом", en: "Before you apply", uz: "Ariza berishdan oldin" })}
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">
                    {pick({
                      ru: "Быстрая сводка по участию",
                      en: "Quick participation summary",
                      uz: "Ishtirok bo'yicha qisqa ma'lumot",
                    })}
                  </h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                <article className="rounded-[26px] bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {pick({ ru: "Формат", en: "Format", uz: "Format" })}
                  </p>
                  <p className="mt-2 text-base font-black text-slate-950">
                    {pick({ ru: "Офлайн событие", en: "Offline event", uz: "Oflayn tadbir" })}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    {pick({
                      ru: "Участие привязано к месту проведения, поэтому заранее проверьте дорогу и время.",
                      en: "Participation is tied to the location, so check the route and timing in advance.",
                      uz: "Ishtirok joyga bog'liq, shuning uchun yo'l va vaqtni oldindan tekshiring.",
                    })}
                  </p>
                </article>
                <article className="rounded-[26px] bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {pick({ ru: "Подтверждение", en: "Approval", uz: "Tasdiqlash" })}
                  </p>
                  <p className="mt-2 text-base font-black text-slate-950">
                    {pick({ ru: "Через модерацию", en: "Reviewed by organizer", uz: "Tashkilotchi ko'rib chiqadi" })}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    {pick({
                      ru: "После отклика организатор вручную подтверждает участие, поэтому статус может измениться не сразу.",
                      en: "After you apply, the organizer manually confirms participation, so the status may not change instantly.",
                      uz: "Ariza yuborilgach, tashkilotchi uni qo'lda tasdiqlaydi, shuning uchun holat darhol o'zgarmasligi mumkin.",
                    })}
                  </p>
                </article>
                <article className="rounded-[26px] bg-slate-50 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    {pick({ ru: "Свободные места", en: "Availability", uz: "Mavjud joylar" })}
                  </p>
                  <p className="mt-2 text-base font-black text-slate-950">
                    {seatsLeft === null
                      ? pick({ ru: "Без ограничения", en: "Open capacity", uz: "Cheklovsiz" })
                      : isEventFull
                        ? pick({ ru: "Набор закрыт", en: "Spots filled", uz: "Joylar to'lgan" })
                        : pick({ ru: `${seatsLeft} мест осталось`, en: `${seatsLeft} spots left`, uz: `${seatsLeft} ta joy qoldi` })}
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    {pick({
                      ru: "Если мест осталось мало, лучше отправить заявку сразу, пока набор ещё открыт.",
                      en: "If only a few spots remain, it is better to apply now while registration is still open.",
                      uz: "Agar joylar kam qolgan bo'lsa, qabul yopilmasdan oldin tezroq ariza yuborgan ma'qul.",
                    })}
                  </p>
                </article>
              </div>
            </section>

            {!reviewsMissingSetup && recentOrganizerReviews.length > 0 ? (
              <section className="rounded-[34px] border border-gray-100 bg-white p-6 shadow-sm md:p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#10b981]">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#10b981]">
                      {pick({ ru: "Отзывы", en: "Reviews", uz: "Sharhlar" })}
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {pick({
                        ru: "Что волонтёры говорят об организаторе",
                        en: "What volunteers say about the organizer",
                        uz: "Volontyorlar tashkilotchi haqida nima deydi",
                      })}
                    </h2>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {recentOrganizerReviews.map((review) => (
                    <article key={review.id} className="rounded-[28px] border border-slate-100 bg-slate-50 p-5">
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                      <p className="mt-4 text-sm font-semibold leading-7 text-slate-700">
                        {review.comment ||
                          pick({
                            ru: "Пользователь поставил оценку без комментария.",
                            en: "The volunteer left a rating without a comment.",
                            uz: "Foydalanuvchi izohsiz baho qoldirdi.",
                          })}
                      </p>
                      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {formatDate(review.created_at, dateLocale)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-6 2xl:sticky 2xl:top-24">
            <section className="overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] p-6 text-white shadow-[0_30px_90px_rgba(15,23,42,0.25)] md:p-7">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                {pick({ ru: "Участие", en: "Participation", uz: "Ishtirok" })}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
                {pick({ ru: "Присоединиться к событию", en: "Join this event", uz: "Tadbirga qo'shilish" })}
              </h2>
              <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">
                {participationHint}
              </p>

              <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                      {pick({ ru: "Заполнение", en: "Filled", uz: "Bandlik" })}
                    </p>
                    <p className="mt-1 text-xl font-black text-white">
                      {participationProgress !== null ? `${participationProgress}%` : "—"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">
                      {pick({ ru: "Мест всего", en: "Capacity", uz: "Jami joy" })}
                    </p>
                    <p className="mt-1 text-xl font-black text-white">{volunteersNeeded ?? "—"}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-all"
                    style={{ width: `${participationProgress ?? 0}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {renderParticipationActions()}
              </div>
            </section>

            <section className="rounded-[34px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500">
                    {pick({ ru: "Репутация", en: "Reputation", uz: "Obro'" })}
                  </p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">
                    {pick({ ru: "Организатор", en: "Organizer", uz: "Tashkilotchi" })}
                  </h3>
                </div>
              </div>

              {!reviewsMissingSetup && organizerRating ? (
                <>
                  <div className="mt-5 flex items-end gap-3">
                    <p className="text-4xl font-black text-slate-950">{organizerRating.toFixed(1)}</p>
                    <p className="pb-1 text-sm font-semibold text-slate-500">
                      {pick({
                        ru: `${organizerReviewCount} отзывов`,
                        en: `${organizerReviewCount} reviews`,
                        uz: `${organizerReviewCount} ta sharh`,
                      })}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        className={`h-5 w-5 ${organizerRating >= index + 1 ? "fill-current" : "text-gray-200"}`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-5 text-sm font-semibold leading-7 text-slate-500">
                  {pick({
                    ru: "Пока нет отзывов. Это хороший шанс стать одним из первых участников и задать тон репутации события.",
                    en: "There are no reviews yet. This is a good chance to be among the first participants and shape the event's reputation.",
                    uz: "Hozircha sharhlar yo'q. Bu tadbir obro'sini birinchi bo'lib shakllantirish uchun yaxshi imkoniyat.",
                  })}
                </p>
              )}
            </section>

            <section className="rounded-[34px] border border-gray-100 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                {pick({ ru: "Полезные действия", en: "Helpful actions", uz: "Foydali amallar" })}
              </p>
              <div className="mt-5 space-y-3">
                <a
                  href={`mailto:support@volohero.com?subject=${pick({
                    ru: "Отклик",
                    en: "Response",
                    uz: "Murojaat",
                  })}: ${event.title}`}
                  className="flex w-full items-center justify-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-[#10b981] hover:text-[#10b981]"
                >
                  {pick({ ru: "Связаться", en: "Contact", uz: "Bog'lanish" })}
                  <Mail size={16} />
                </a>

                <button
                  onClick={handleShare}
                  className={`flex w-full items-center justify-center gap-3 rounded-[22px] border px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                    copied
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-[#10b981] hover:text-[#10b981]"
                  }`}
                >
                  {copied
                    ? pick({ ru: "Ссылка скопирована", en: "Link copied", uz: "Havola nusxalandi" })
                    : pick({ ru: "Поделиться", en: "Share", uz: "Ulashish" })}
                  <Share2 size={16} />
                </button>
              </div>

              <div className="mt-5 rounded-[24px] bg-slate-50 px-4 py-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  {pick({ ru: "Статус", en: "Status", uz: "Holat" })}
                </p>
                <p className="mt-2 text-base font-black text-slate-950">
                  {pick({ ru: "Объявление активно", en: "Listing is active", uz: "E'lon faol" })}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  ID {event.id.toString().split("-")[0]}
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>

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
