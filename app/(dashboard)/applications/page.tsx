"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Clock3,
  CheckCircle2,
  XCircle,
  Calendar,
  MapPin,
  ArrowRight,
  MessageSquare,
  Star,
  X,
} from "lucide-react";
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
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  }, [pick]);

  const dateLocale = pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applicationsMissingSetup, setApplicationsMissingSetup] =
    useState(false);
  const [reviewsMissingSetup, setReviewsMissingSetup] = useState(false);
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, EventPreview>>({});
  const [myReviews, setMyReviews] = useState<EventReview[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>(
    "all",
  );
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
    const hasSchemaMention =
      /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const isMissingReviewsTableError = (message: string) => {
    const hasTableMention = /event_reviews/i.test(message);
    const hasSchemaMention =
      /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const showAlert = (
    title: string,
    message: string,
    tone: AlertTone = "info",
  ) => {
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
        setError(pickRef.current({
          ru: "Сервис временно недоступен. Попробуйте позже.",
          en: "The service is temporarily unavailable. Please try again later.",
          uz: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
        }));
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login?next=/applications");
        return;
      }
      setCurrentUserId(session.user.id);

      const { data: applicationRows, error: applicationError } = await supabase
        .from("event_applications")
        .select(
          "id, event_id, organizer_id, status, attended, created_at, reviewed_at",
        )
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

      const preparedApplications = (applicationRows ??
        []) as VolunteerApplication[];
      setApplicationsMissingSetup(false);
      setApplications(preparedApplications);

      const eventIds = Array.from(
        new Set(preparedApplications.map((item) => item.event_id)),
      );
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
          .select(
            "id, application_id, event_id, target_id, target_role, rating, comment, created_at, updated_at",
          )
          .eq("author_id", session.user.id)
          .eq("author_role", "volunteer")
          .in(
            "application_id",
            preparedApplications.map((item) => item.id),
          )
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
          : pickRef.current({
              ru: "Не удалось загрузить отклики.",
              en: "Failed to load applications.",
              uz: "Arizalarni yuklab bo'lmadi.",
            }),
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

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
    if (status === "approved")
      return pick({ ru: "Принято", en: "Approved", uz: "Tasdiqlangan" });
    if (status === "rejected")
      return pick({ ru: "Отказ", en: "Rejected", uz: "Rad etilgan" });
    return pick({
      ru: "На рассмотрении",
      en: "Pending",
      uz: "Ko'rib chiqilmoqda",
    });
  };

  const getStatusStyle = (status: ApplicationStatus) => {
    if (status === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "rejected") return "bg-red-50 text-red-600 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const canLeaveReview = (
    application: VolunteerApplication,
    event?: EventPreview,
  ) => {
    if (application.status !== "approved" || !event) return false;
    if (application.attended === true) return true;
    const eventTimestamp = new Date(event.date).getTime();
    return !Number.isNaN(eventTimestamp) && eventTimestamp < Date.now();
  };

  const reviewReadyCount = useMemo(() => {
    return applications.filter((application) =>
      canLeaveReview(application, eventsMap[application.event_id]),
    ).length;
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
        event?.title ?? pick({ ru: "Событие", en: "Event", uz: "Tadbir" }),
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

    if (
      !currentUserId ||
      !reviewModal.applicationId ||
      !reviewModal.eventId ||
      !reviewModal.organizerId
    ) {
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
        .select(
          "id, application_id, event_id, target_id, target_role, rating, comment, created_at, updated_at",
        )
        .single();

      if (error) {
        if (isMissingReviewsTableError(error.message)) {
          setReviewsMissingSetup(true);
          showAlert(
            pick({
              ru: "Нужна настройка базы",
              en: "Database setup required",
              uz: "Baza sozlamasi kerak",
            }),
            missingReviewsHint,
            "warning",
          );
          return;
        }
        throw new Error(error.message);
      }

      setReviewsMissingSetup(false);
      setMyReviews((prev) => {
        const next = prev.filter(
          (review) => review.application_id !== data.application_id,
        );
        return [data as EventReview, ...next];
      });
      closeReviewModal();
      showAlert(
        pick({
          ru: "Отзыв сохранён",
          en: "Review saved",
          uz: "Sharh saqlandi",
        }),
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {pick({
              ru: "Мои отклики",
              en: "My applications",
              uz: "Mening arizalarim",
            })}
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            {pick({
              ru: "Здесь видно, какие заявки уже приняты, какие ещё на рассмотрении и по каким событиям можно оставить отзыв организатору.",
              en: "Here you can see which requests are approved, which are still pending, and for which events you can review the organizer.",
              uz: "Bu yerda qaysi arizalar tasdiqlanganini, qaysilari ko'rib chiqilayotganini va qaysi tadbirlar bo'yicha tashkilotchiga sharh qoldirish mumkinligini ko'rasiz.",
            })}
          </p>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">
                {pick({ ru: "Всего", en: "Total", uz: "Jami" })}
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {applications.length}
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-600">
                {pick({
                  ru: "На рассмотрении",
                  en: "Pending",
                  uz: "Ko'rib chiqilmoqda",
                })}
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {applicationsStats.pending}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-medium text-emerald-600">
                {pick({ ru: "Принято", en: "Approved", uz: "Tasdiqlangan" })}
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {applicationsStats.approved}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">
                {pick({
                  ru: "Готово для отзыва",
                  en: "Ready for review",
                  uz: "Sharh uchun tayyor",
                })}
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {reviewReadyCount}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-slate-900 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {status === "all"
                  ? pick({ ru: "Все", en: "All", uz: "Barchasi" })
                  : getStatusLabel(status)}
              </button>
            ),
          )}
        </div>

        {/* Errors and Hints */}
        {applicationsMissingSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {missingApplicationsHint}
          </div>
        )}
        {reviewsMissingSetup && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {missingReviewsHint}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!applicationsMissingSetup && visibleApplications.length === 0 ? (
            <div className="col-span-full bg-white border border-dashed border-slate-200 rounded-2xl py-16 flex flex-col items-center justify-center text-center px-6">
              <p className="text-slate-500 mb-6">
                {pick({
                  ru: "Откликов пока нет",
                  en: "No applications yet",
                  uz: "Hali arizalar yo'q",
                })}
              </p>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors"
              >
                {pick({
                  ru: "Найти событие",
                  en: "Find event",
                  uz: "Tadbir topish",
                })}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            visibleApplications.map((application) => {
              const event = eventsMap[application.event_id];
              const existingReview = reviewsByApplicationId.get(application.id);
              const reviewAvailable = canLeaveReview(application, event);

              return (
                <article
                  key={application.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 bg-slate-100">
                    <EventVisual
                      title={event?.title ?? "Volunteer Event"}
                      category={event?.category}
                      categoryLabel={
                        event?.category
                          ? getEventCategoryLabel(event.category, pick)
                          : undefined
                      }
                      imageUrl={event?.image_url}
                      alt={event?.title ?? "Event"}
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-slate-900 line-clamp-2">
                        {event?.title ??
                          pick({
                            ru: "Событие удалено",
                            en: "Event removed",
                            uz: "Tadbir o'chirilgan",
                          })}
                      </h3>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusStyle(application.status)}`}
                      >
                        {application.status === "pending" && (
                          <Clock3 className="w-3 h-3" />
                        )}
                        {application.status === "approved" && (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        {application.status === "rejected" && (
                          <XCircle className="w-3 h-3" />
                        )}
                        {getStatusLabel(application.status)}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-500 mb-4">
                      {event?.location && (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
                          {event.location}
                        </p>
                      )}
                      {event?.date && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />{" "}
                          {formatDate(event.date, dateLocale)}
                        </p>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 mb-4">
                      <p>
                        {pick({
                          ru: "Отправлено",
                          en: "Submitted",
                          uz: "Yuborilgan",
                        })}
                        : {formatDate(application.created_at, dateLocale)}
                      </p>
                      {application.reviewed_at && (
                        <p>
                          {pick({ ru: "Решение", en: "Decision", uz: "Qaror" })}
                          : {formatDate(application.reviewed_at, dateLocale)}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 space-y-4">
                      <Link
                        href={`/events/${application.event_id}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        {pick({
                          ru: "Открыть событие",
                          en: "Open event",
                          uz: "Tadbirni ochish",
                        })}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>

                      {application.status === "approved" &&
                        !reviewsMissingSetup && (
                          <div className="flex items-start justify-between gap-4">
                            <div className="text-sm text-slate-600">
                              {existingReview ? (
                                <>
                                  <div className="flex items-center gap-0.5 text-amber-400 mb-1">
                                    {Array.from({ length: 5 }).map(
                                      (_, index) => (
                                        <Star
                                          key={index}
                                          className={`w-4 h-4 ${index < existingReview.rating ? "fill-current" : "text-slate-200"}`}
                                        />
                                      ),
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 line-clamp-2">
                                    {existingReview.comment ||
                                      pick({
                                        ru: "Без текста",
                                        en: "No text",
                                        uz: "Matnsiz",
                                      })}
                                  </p>
                                </>
                              ) : reviewAvailable ? (
                                <p className="text-xs text-slate-500">
                                  {pick({
                                    ru: "Оцените организацию, чтобы помочь другим волонтёрам.",
                                    en: "Rate the organizer to help other volunteers.",
                                    uz: "Boshqa volontyorlarga yordam berish uchun tashkilotni baholang.",
                                  })}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-400">
                                  {pick({
                                    ru: "Отзыв можно оставить после участия или завершения события.",
                                    en: "Feedback becomes available after attendance or event ends.",
                                    uz: "Sharh tadbir tugagach yoki qatnashuv tasdiqlangach ochiladi.",
                                  })}
                                </p>
                              )}
                            </div>

                            {reviewAvailable && (
                              <button
                                type="button"
                                onClick={() => openReviewModal(application)}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                {existingReview
                                  ? pick({
                                      ru: "Изменить",
                                      en: "Edit",
                                      uz: "Tahrirlash",
                                    })
                                  : pick({
                                      ru: "Отзыв",
                                      en: "Review",
                                      uz: "Sharh",
                                    })}
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-emerald-600">
                  {pick({ ru: "Отзыв", en: "Review", uz: "Sharh" })}
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 line-clamp-2">
                  {reviewModal.eventTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {pick({ ru: "Оценка", en: "Rating", uz: "Baho" })}
                </label>
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, index) => {
                    const value = index + 1;
                    const active = value <= reviewModal.rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setReviewModal((prev) => ({ ...prev, rating: value }))
                        }
                        className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                          active
                            ? "border-amber-200 bg-amber-50 text-amber-500"
                            : "border-slate-200 bg-white text-slate-300 hover:border-amber-200 hover:text-amber-400"
                        }`}
                      >
                        <Star
                          className={`w-5 h-5 ${active ? "fill-current" : ""}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {pick({ ru: "Комментарий", en: "Comment", uz: "Izoh" })}
                </label>
                <textarea
                  rows={4}
                  value={reviewModal.comment}
                  onChange={(e) =>
                    setReviewModal((prev) => ({
                      ...prev,
                      comment: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
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
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isReviewSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  pick({
                    ru: "Сохранить отзыв",
                    en: "Save review",
                    uz: "Sharhni saqlash",
                  })
                )}
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
  );
}
