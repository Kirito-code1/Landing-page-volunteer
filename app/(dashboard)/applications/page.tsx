"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Clock3, CheckCircle2, XCircle, Calendar, MapPin, ArrowRight, MessageSquare, Star, X } from "lucide-react";
import EventVisual from "@/components/events/EventVisual";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getEventCategoryLabel } from "@/components/events/eventMeta";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

type ApplicationStatus = "pending" | "approved" | "rejected";

interface VolunteerApplication {
  id: string;
  event_id: string;
  organizer_id: string;
  status: ApplicationStatus;
  attended: boolean | null;
  created_at: string;
  reviewed_at: string | null;
}

interface EventPreview {
  id: string;
  title: string;
  location: string;
  date: string;
  category?: string | null;
  image_url?: string | null;
}

interface EventReview {
  id: string;
  application_id: string;
  event_id: string;
  target_id: string;
  target_role: "organizer" | "volunteer";
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

function formatDate(value: string, locale: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString(locale);
}

export default function ApplicationsPage() {
  const router = useRouter();
  const { pick } = useLanguage();
  const dateLocale = pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationsMissingSetup, setApplicationsMissingSetup] = useState(false);
  const [reviewsMissingSetup, setReviewsMissingSetup] = useState(false);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, EventPreview>>({});
  const [myReviews, setMyReviews] = useState<EventReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    applicationId: string | null;
    eventId: string | null;
    organizerId: string | null;
    eventTitle: string;
    rating: number;
    comment: string;
  }>({
    isOpen: false,
    applicationId: null,
    eventId: null,
    organizerId: null,
    eventTitle: "",
    rating: 5,
    comment: "",
  });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
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

  const missingApplicationsHint = pick({
    ru: "Таблица заявок не найдена. Выполните SQL из файла database/event_applications.sql.",
    en: "Applications table is missing. Run SQL from database/event_applications.sql.",
    uz: "Arizalar jadvali topilmadi. database/event_applications.sql faylidagi SQL ni ishga tushiring.",
  });
  const missingReviewsHint = pick({
    ru: "Таблица отзывов не найдена. Выполните SQL из файла database/event_reviews.sql.",
    en: "Reviews table is missing. Run SQL from database/event_reviews.sql.",
    uz: "Sharhlar jadvali topilmadi. database/event_reviews.sql faylidagi SQL ni ishga tushiring.",
  });

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

  const showAlert = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!supabase) {
        setApplications([]);
        setEventsMap({});
        setMyReviews([]);
        setError(supabaseUnavailableMessage);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login?next=/applications");
        return;
      }
      setCurrentUserId(session.user.id);

      const { data: applicationRows, error: applicationError } = await supabase
        .from("event_applications")
        .select("id, event_id, organizer_id, status, attended, created_at, reviewed_at")
        .eq("volunteer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (applicationError) {
        if (isMissingApplicationsTableError(applicationError.message)) {
          setApplicationsMissingSetup(true);
          setApplications([]);
          setEventsMap({});
          setMyReviews([]);
          return;
        }
        throw new Error(applicationError.message);
      }

      const preparedApplications = (applicationRows ?? []) as VolunteerApplication[];
      setApplicationsMissingSetup(false);
      setApplications(preparedApplications);

      const eventIds = Array.from(new Set(preparedApplications.map((item) => item.event_id)));
      if (eventIds.length === 0) {
        setEventsMap({});
        setMyReviews([]);
        setReviewsMissingSetup(false);
        return;
      }

      const [eventsResponse, reviewsResponse] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, location, date, category, image_url")
          .in("id", eventIds),
        supabase
          .from("event_reviews")
          .select("id, application_id, event_id, target_id, target_role, rating, comment, created_at, updated_at")
          .eq("author_id", session.user.id)
          .eq("author_role", "volunteer")
          .in("application_id", preparedApplications.map((item) => item.id))
          .order("updated_at", { ascending: false }),
      ]);

      const { data: eventRows, error: eventsError } = eventsResponse;
      const { data: reviewsRows, error: reviewsError } = reviewsResponse;

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      if (reviewsError) {
        if (isMissingReviewsTableError(reviewsError.message)) {
          setReviewsMissingSetup(true);
          setMyReviews([]);
        } else {
          throw new Error(reviewsError.message);
        }
      } else {
        setReviewsMissingSetup(false);
        setMyReviews((reviewsRows ?? []) as EventReview[]);
      }

      const map: Record<string, EventPreview> = {};
      (eventRows ?? []).forEach((row) => {
        map[row.id] = row;
      });
      setEventsMap(map);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : pick({
              ru: "Не удалось загрузить отклики.",
              en: "Failed to load applications.",
              uz: "Arizalarni yuklab bo'lmadi.",
            }),
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router, pick, supabaseUnavailableMessage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applicationsStats = useMemo(() => {
    return applications.reduce(
      (acc, item) => {
        if (item.status === "pending") acc.pending += 1;
        if (item.status === "approved") acc.approved += 1;
        if (item.status === "rejected") acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );
  }, [applications]);

  const visibleApplications = useMemo(() => {
    if (statusFilter === "all") return applications;
    return applications.filter((item) => item.status === statusFilter);
  }, [applications, statusFilter]);

  const reviewsByApplicationId = useMemo(() => {
    return new Map(myReviews.map((review) => [review.application_id, review]));
  }, [myReviews]);

  const getStatusLabel = (status: ApplicationStatus) => {
    if (status === "approved") {
      return pick({ ru: "Принято", en: "Approved", uz: "Tasdiqlangan" });
    }
    if (status === "rejected") {
      return pick({ ru: "Отказ", en: "Rejected", uz: "Rad etilgan" });
    }
    return pick({ ru: "На рассмотрении", en: "Pending", uz: "Ko'rib chiqilmoqda" });
  };

  const canLeaveReview = (application: VolunteerApplication, event?: EventPreview) => {
    if (application.status !== "approved" || !event) return false;
    if (application.attended === true) return true;
    const eventTimestamp = new Date(event.date).getTime();
    return !Number.isNaN(eventTimestamp) && eventTimestamp < Date.now();
  };

  const reviewReadyCount = useMemo(() => {
    return applications.filter((application) => canLeaveReview(application, eventsMap[application.event_id])).length;
  }, [applications, eventsMap]);

  const openReviewModal = (application: VolunteerApplication) => {
    const existingReview = reviewsByApplicationId.get(application.id);
    const event = eventsMap[application.event_id];

    setReviewModal({
      isOpen: true,
      applicationId: application.id,
      eventId: application.event_id,
      organizerId: application.organizer_id,
      eventTitle:
        event?.title ??
        pick({ ru: "Событие", en: "Event", uz: "Tadbir" }),
      rating: existingReview?.rating ?? 5,
      comment: existingReview?.comment ?? "",
    });
  };

  const closeReviewModal = () => {
    setReviewModal({
      isOpen: false,
      applicationId: null,
      eventId: null,
      organizerId: null,
      eventTitle: "",
      rating: 5,
      comment: "",
    });
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUserId || !reviewModal.applicationId || !reviewModal.eventId || !reviewModal.organizerId) {
      return;
    }

    try {
      setIsReviewSubmitting(true);

      const payload = {
        application_id: reviewModal.applicationId,
        event_id: reviewModal.eventId,
        organizer_id: reviewModal.organizerId,
        volunteer_id: currentUserId,
        author_id: currentUserId,
        author_role: "volunteer",
        target_id: reviewModal.organizerId,
        target_role: "organizer",
        rating: reviewModal.rating,
        comment: reviewModal.comment.trim() || null,
      };

      const { data, error } = await supabase
        .from("event_reviews")
        .upsert(payload, { onConflict: "application_id,author_id" })
        .select("id, application_id, event_id, target_id, target_role, rating, comment, created_at, updated_at")
        .single();

      if (error) {
        if (isMissingReviewsTableError(error.message)) {
          setReviewsMissingSetup(true);
          showAlert(
            pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
            missingReviewsHint,
            "warning",
          );
          return;
        }
        throw new Error(error.message);
      }

      setReviewsMissingSetup(false);
      setMyReviews((prev) => {
        const next = prev.filter((review) => review.application_id !== data.application_id);
        return [data as EventReview, ...next];
      });
      closeReviewModal();
      showAlert(
        pick({ ru: "Отзыв сохранён", en: "Review saved", uz: "Sharh saqlandi" }),
        pick({
          ru: "Организатор уже получил вашу оценку.",
          en: "The organizer has received your feedback.",
          uz: "Tashkilotchi sizning bahoyingizni oldi.",
        }),
        "success",
      );
    } catch (err: unknown) {
      showAlert(
        pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }),
        err instanceof Error
          ? err.message
          : pick({
              ru: "Не удалось сохранить отзыв.",
              en: "Failed to save review.",
              uz: "Sharhni saqlab bo'lmadi.",
            }),
        "error",
      );
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 text-[#10b981] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#edf9f4_0%,_#f8fafc_18%,_#f8fafc_100%)] px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <header className="rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <div className="grid gap-8 2xl:grid-cols-[minmax(0,1fr)_340px] 2xl:items-start">
            <div>
              <div className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
                {pick({ ru: "Волонтёр", en: "Volunteer", uz: "Volontyor" })}
              </div>
              <h1 className="mt-5 text-3xl font-black italic tracking-[-0.06em] text-slate-950 md:text-5xl">
                {pick({ ru: "Мои отклики", en: "My applications", uz: "Mening arizalarim" })}
              </h1>
              <p className="mt-4 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                {pick({
                  ru: "Здесь видно, какие заявки уже приняты, какие ещё на рассмотрении и по каким событиям можно оставить отзыв организатору.",
                  en: "Here you can see which requests are approved, which are still pending, and for which events you can already review the organizer.",
                  uz: "Bu yerda qaysi arizalar tasdiqlanganini, qaysilari ko'rib chiqilayotganini va qaysi tadbirlar bo'yicha tashkilotchiga sharh qoldirish mumkinligini ko'rasiz.",
                })}
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[24px] border border-white bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {pick({ ru: "Всего", en: "Total", uz: "Jami" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{applications.length}</p>
                </div>
                <div className="rounded-[24px] border border-amber-100 bg-[linear-gradient(180deg,_#fffbeb_0%,_#ffffff_100%)] px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                    {pick({ ru: "На рассмотрении", en: "Pending", uz: "Ko'rib chiqilmoqda" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-amber-700">{applicationsStats.pending}</p>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_100%)] px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                    {pick({ ru: "Принято", en: "Approved", uz: "Tasdiqlangan" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-emerald-700">{applicationsStats.approved}</p>
                </div>
                <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,_#f0f9ff_0%,_#ffffff_100%)] px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">
                    {pick({ ru: "Готово для отзыва", en: "Ready for review", uz: "Sharh uchun tayyor" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-sky-700">{reviewReadyCount}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {pick({ ru: "Быстрые фильтры", en: "Quick filters", uz: "Tez filtrlar" })}
              </p>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                {pick({
                  ru: "Переключайтесь между статусами, чтобы быстро понять, где нужно дождаться решения, а где уже можно действовать.",
                  en: "Switch between statuses to quickly understand where you are waiting for a decision and where you can already take action.",
                  uz: "Qayerda qarorni kutish, qayerda esa allaqachon harakat qilish mumkinligini tez ko'rish uchun statuslarni almashtiring.",
                })}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {(["all", "pending", "approved", "rejected"] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                      statusFilter === status
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-[#10b981] hover:text-[#10b981]"
                    }`}
                  >
                    {status === "all"
                      ? pick({ ru: "Все", en: "All", uz: "Barchasi" })
                      : getStatusLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <section className="mt-6 rounded-[28px] border border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur md:p-5">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.18em] border transition-colors ${
                  statusFilter === status
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-[#10b981] hover:text-[#10b981]"
                }`}
              >
                {status === "all"
                  ? pick({ ru: "Все", en: "All", uz: "Barchasi" })
                  : getStatusLabel(status)}
              </button>
            ))}
          </div>
        </section>

        {applicationsMissingSetup && (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-black text-amber-700">
            {missingApplicationsHint}
          </div>
        )}

        {reviewsMissingSetup && (
          <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-black text-amber-700">
            {missingReviewsHint}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-black text-red-600">
            {error}
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {!applicationsMissingSetup && visibleApplications.length === 0 ? (
            <div className="col-span-full rounded-[32px] border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {pick({
                  ru: "Откликов пока нет",
                  en: "No applications yet",
                  uz: "Hali arizalar yo'q",
                })}
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
              >
                {pick({ ru: "Найти событие", en: "Find event", uz: "Tadbir topish" })}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            visibleApplications.map((application) => {
              const event = eventsMap[application.event_id];
              const existingReview = reviewsByApplicationId.get(application.id);
              const reviewAvailable = canLeaveReview(application, event);

              return (
                <article key={application.id} className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                  <div className="relative h-56">
                    <EventVisual
                      title={event?.title ?? "Volunteer Event"}
                      category={event?.category}
                      categoryLabel={event?.category ? getEventCategoryLabel(event.category, pick) : undefined}
                      imageUrl={event?.image_url}
                      alt={event?.title ?? "Event"}
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.76)_100%)]" />
                    <div className="absolute left-5 top-5 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                      {application.status === "pending" ? <Clock3 className="w-3.5 h-3.5" /> : null}
                      {application.status === "approved" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                      {application.status === "rejected" ? <XCircle className="w-3.5 h-3.5" /> : null}
                      {getStatusLabel(application.status)}
                    </div>
                    {event?.category ? (
                      <div className="absolute right-5 top-5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white backdrop-blur-md">
                        {getEventCategoryLabel(event.category, pick)}
                      </div>
                    ) : null}
                    <div className="absolute inset-x-5 bottom-5">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                        {pick({ ru: "Отклик", en: "Application", uz: "Ariza" })}
                      </p>
                      <h3 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">
                        {event?.title ?? pick({ ru: "Событие удалено", en: "Event removed", uz: "Tadbir o'chirilgan" })}
                      </h3>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {event?.location ? (
                        <div className="rounded-[22px] bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#10b981]" />
                            {event.location}
                          </p>
                        </div>
                      ) : null}
                      {event?.date ? (
                        <div className="rounded-[22px] bg-slate-50 px-4 py-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {pick({ ru: "Дата", en: "Date", uz: "Sana" })}
                          </p>
                          <p className="mt-2 text-sm font-semibold text-slate-700 inline-flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#10b981]" />
                            {formatDate(event.date, dateLocale)}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-500">
                      <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                        {pick({ ru: "Отправлено", en: "Submitted", uz: "Yuborilgan" })}: {formatDate(application.created_at, dateLocale)}
                      </p>
                      {application.reviewed_at && (
                        <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-300">
                          {pick({ ru: "Решение", en: "Decision", uz: "Qaror" })}: {formatDate(application.reviewed_at, dateLocale)}
                        </p>
                      )}
                    </div>

                    <Link
                      href={`/events/${application.event_id}`}
                      className="mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#10b981] hover:text-emerald-700 transition-colors"
                    >
                      {pick({ ru: "Открыть событие", en: "Open event", uz: "Tadbirni ochish" })}
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {application.status === "approved" && !reviewsMissingSetup ? (
                      <div className="mt-5 rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {pick({ ru: "Отзыв об организаторе", en: "Organizer review", uz: "Tashkilotchi haqida sharh" })}
                            </p>
                            {existingReview ? (
                              <>
                                <div className="mt-2 flex items-center gap-1 text-amber-500">
                                  {Array.from({ length: 5 }).map((_, index) => (
                                    <Star
                                      key={index}
                                      className={`h-4 w-4 ${index < existingReview.rating ? "fill-current" : ""}`}
                                    />
                                  ))}
                                </div>
                                <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
                                  {existingReview.comment ||
                                    pick({
                                      ru: "Отзыв сохранён без текста.",
                                      en: "Review saved without text.",
                                      uz: "Sharh matnsiz saqlandi.",
                                    })}
                                </p>
                              </>
                            ) : reviewAvailable ? (
                              <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                                {pick({
                                  ru: "Оцените организацию после участия, чтобы помочь другим волонтёрам.",
                                  en: "Rate the organizer after participation to help other volunteers.",
                                  uz: "Boshqa volontyorlarga yordam berish uchun tashkilotni baholang.",
                                })}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                                {pick({
                                  ru: "Оставить отзыв можно после участия или после завершения события.",
                                  en: "Feedback becomes available after attendance or after the event ends.",
                                  uz: "Sharh qoldirish tadbir tugagach yoki qatnashuv tasdiqlangach ochiladi.",
                                })}
                              </p>
                            )}
                          </div>

                          {reviewAvailable ? (
                            <button
                              type="button"
                              onClick={() => openReviewModal(application)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-[#10b981] hover:text-[#10b981]"
                            >
                              <MessageSquare className="h-4 w-4" />
                              {existingReview
                                ? pick({ ru: "Изменить", en: "Edit", uz: "Tahrirlash" })
                                : pick({ ru: "Оставить отзыв", en: "Leave review", uz: "Sharh qoldirish" })}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </section>

        {reviewModal.isOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-[560px] rounded-[30px] border border-gray-100 bg-white p-6 shadow-2xl md:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#10b981]">
                    {pick({ ru: "Отзыв", en: "Review", uz: "Sharh" })}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-gray-900">
                    {reviewModal.eventTitle}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-colors hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleReviewSubmit} className="mt-6 space-y-5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    {pick({ ru: "Оценка", en: "Rating", uz: "Baho" })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      const active = value <= reviewModal.rating;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setReviewModal((prev) => ({ ...prev, rating: value }))}
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${
                            active
                              ? "border-amber-200 bg-amber-50 text-amber-500"
                              : "border-gray-200 bg-white text-gray-300 hover:border-amber-200 hover:text-amber-400"
                          }`}
                        >
                          <Star className={`h-6 w-6 ${active ? "fill-current" : ""}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">
                    {pick({ ru: "Комментарий", en: "Comment", uz: "Izoh" })}
                  </label>
                  <textarea
                    rows={5}
                    value={reviewModal.comment}
                    onChange={(e) => setReviewModal((prev) => ({ ...prev, comment: e.target.value }))}
                    className="mt-3 w-full rounded-[24px] border border-gray-200 bg-gray-50 px-5 py-4 font-semibold text-gray-700 outline-none transition-colors focus:border-[#10b981] focus:bg-white"
                    placeholder={pick({
                      ru: "Что было хорошо организовано? Что можно улучшить?",
                      en: "What was well organized? What could be improved?",
                      uz: "Nima yaxshi tashkil qilindi? Nimani yaxshilash mumkin?",
                    })}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isReviewSubmitting}
                  className="w-full rounded-[24px] bg-[#10b981] py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#0da975] disabled:bg-gray-200"
                >
                  {isReviewSubmitting
                    ? <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    : pick({ ru: "Сохранить отзыв", en: "Save review", uz: "Sharhni saqlash" })}
                </button>
              </form>
            </div>
          </div>
        )}

        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          tone={alertModal.tone}
          closeLabel={pick({ ru: "Понятно", en: "Close", uz: "Yopish" })}
          onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        />
      </div>
    </div>
  );
}
