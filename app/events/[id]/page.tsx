"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
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
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getEventCategoryLabel,
  normalizeVolunteerCount,
} from "@/components/events/eventMeta";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";

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

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

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

  useEffect(() => {
    async function fetchEvent() {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

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

        await loadParticipationData(data.id, user?.id ?? null);
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
  }, [id, supabase, pick, loadParticipationData]);

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

  return (
    <div className="min-h-screen bg-[#fcfdfd] pb-20">
      <div className="max-w-5xl mx-auto px-6 pt-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#10b981] transition-all mb-8 group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {pick({ ru: "Назад к списку", en: "Back to list", uz: "Ro'yxatga qaytish" })}
        </button>

        <div className="bg-white rounded-[50px] border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/40">
          <div className="h-[400px] md:h-[550px] relative">
            <Image
              src={event.image_url || "https://images.unsplash.com/photo-1559027615-cd4451dff977?q=80&w=2069&auto=format&fit=crop"}
              className="object-cover"
              alt={event.title}
              fill
              sizes="100vw"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute bottom-10 left-8 right-8 md:left-14 md:right-14">
              <h1 className="text-4xl md:text-7xl font-black text-white uppercase italic tracking-tighter leading-none mb-6">
                {event.title}
              </h1>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white/90 border border-white/10">
                  <MapPin size={16} className="text-[#10b981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">{event.location}</span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white/90 border border-white/10">
                  <Calendar size={16} className="text-[#10b981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {formatDate(event.date, dateLocale)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white/90 border border-white/10">
                  <Clock3 size={16} className="text-[#10b981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {pick({ ru: "Опубликовано", en: "Published", uz: "E'lon qilingan" })}: {formatDate(event.created_at, dateLocale)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/80 backdrop-blur-md rounded-2xl text-white border border-emerald-300/40">
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {getEventCategoryLabel(event.category, pick)}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl text-white/90 border border-white/10">
                  <Users size={16} className="text-[#10b981]" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {pick({ ru: "Нужно волонтёров", en: "Volunteers Needed", uz: "Kerakli volontyorlar" })}: {volunteersNeeded ?? pick({ ru: "не указано", en: "not set", uz: "kiritilmagan" })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-16 grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-[#10b981] mb-8 flex items-center gap-3">
                <Info size={16} /> {pick({ ru: "Описание задачи", en: "Task Description", uz: "Vazifa tavsifi" })}
              </h2>

              {event.description ? (
                <div className="text-gray-600 font-medium leading-[1.8] text-lg whitespace-pre-wrap">
                  {event.description}
                </div>
              ) : (
                <div className="py-16 px-10 border-2 border-dashed border-gray-50 rounded-[40px] text-center bg-gray-50/30">
                  <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] italic">
                    {pick({
                      ru: "Детальное описание проекта пока не добавлено",
                      en: "Detailed project description has not been added yet",
                      uz: "Loyiha haqida batafsil tavsif hali qo'shilmagan",
                    })}
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-10 bg-gray-900 rounded-[45px] text-white shadow-2xl shadow-gray-900/20">
                <h3 className="text-sm font-black uppercase italic mb-4 tracking-tighter text-center">
                  {pick({ ru: "Нужна ваша помощь", en: "Your Help Is Needed", uz: "Yordamingiz kerak" })}
                </h3>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 mb-5 text-center">
                  <p className="text-[9px] uppercase tracking-widest font-black text-white/60">
                    {pick({ ru: "Подтверждено волонтёров", en: "Confirmed volunteers", uz: "Tasdiqlangan volontyorlar" })}
                  </p>
                  <p className="text-2xl font-black text-white mt-1">{approvedCount}</p>
                  <p className="mt-1 text-[10px] font-bold text-white/70">
                    {pick({ ru: "Ожидают", en: "Pending", uz: "Kutilmoqda" })}: {pendingCount}
                  </p>
                  {seatsLeft !== null && (
                    <p className={`mt-2 text-[10px] font-black uppercase tracking-widest ${isEventFull ? "text-red-300" : "text-emerald-300"}`}>
                      {pick({ ru: "Свободных мест", en: "Spots left", uz: "Bo'sh o'rin" })}: {seatsLeft}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  {!currentUser ? (
                    <button
                      onClick={handleApply}
                      className="w-full py-5 bg-[#10b981] text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-green-900/20 hover:bg-[#0da975] transition-all flex items-center justify-center gap-3"
                    >
                      {pick({ ru: "Войти и участвовать", en: "Sign in to join", uz: "Qatnashish uchun kiring" })}
                      <UserPlus size={18} />
                    </button>
                  ) : isEventOwner ? (
                    <button
                      disabled
                      className="w-full py-5 bg-white/10 text-white/70 rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] border border-white/10 cursor-not-allowed"
                    >
                      {pick({ ru: "Вы организатор", en: "You are organizer", uz: "Siz tashkilotchisiz" })}
                    </button>
                  ) : myApplicationStatus === "approved" ? (
                    <button
                      disabled
                      className="w-full py-5 bg-emerald-500 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 cursor-not-allowed"
                    >
                      {pick({ ru: "Заявка принята", en: "Request approved", uz: "Ariza tasdiqlandi" })}
                      <CheckCircle2 size={18} />
                    </button>
                  ) : myApplicationStatus === "pending" ? (
                    <>
                      <button
                        disabled
                        className="w-full py-5 bg-amber-500 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] cursor-not-allowed"
                      >
                        {pick({ ru: "Заявка на проверке", en: "Under review", uz: "Ko'rib chiqilmoqda" })}
                      </button>
                      <button
                        onClick={handleCancelPendingRequest}
                        disabled={isApplying}
                        className="w-full py-4 bg-white/10 text-white rounded-[20px] font-black uppercase text-[10px] tracking-[0.18em] border border-white/20 hover:bg-white/15 transition-colors"
                      >
                        {pick({ ru: "Отменить заявку", en: "Cancel request", uz: "Arizani bekor qilish" })}
                      </button>
                    </>
                  ) : participationSetupMissing ? (
                    <button
                      disabled
                      className="w-full py-5 bg-white/10 text-white/70 rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] border border-white/10 cursor-not-allowed"
                    >
                      {pick({ ru: "Заявки недоступны", en: "Requests unavailable", uz: "Arizalar mavjud emas" })}
                    </button>
                  ) : isEventFull ? (
                    <button
                      disabled
                      className="w-full py-5 bg-red-500/80 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] cursor-not-allowed"
                    >
                      {pick({ ru: "Набор закрыт", en: "No spots left", uz: "Qabul yopildi" })}
                    </button>
                  ) : (
                    <button
                      onClick={handleApply}
                      disabled={isApplying}
                      className="w-full py-5 bg-[#10b981] text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.2em] shadow-lg shadow-green-900/20 hover:bg-[#0da975] transition-all flex items-center justify-center gap-3 disabled:opacity-60"
                    >
                      {isApplying
                        ? pick({ ru: "Отправка...", en: "Sending...", uz: "Yuborilmoqda..." })
                        : myApplicationStatus === "rejected"
                          ? pick({ ru: "Подать повторно", en: "Apply again", uz: "Qayta ariza" })
                          : pick({ ru: "Участвовать", en: "Join", uz: "Qatnashish" })}
                      {myApplicationStatus === "rejected" ? <XCircle size={18} /> : <UserPlus size={18} />}
                    </button>
                  )}

                  <a
                    href={`mailto:support@volohero.com?subject=${pick({
                      ru: "Отклик",
                      en: "Response",
                      uz: "Murojaat",
                    })}: ${event.title}`}
                    className="w-full py-4 bg-white/10 text-white rounded-[20px] font-black uppercase text-[10px] tracking-[0.18em] border border-white/20 hover:bg-white/15 transition-all flex items-center justify-center gap-3"
                  >
                    {pick({ ru: "Связаться", en: "Contact", uz: "Bog'lanish" })} <Mail size={16} />
                  </a>

                  <button
                    onClick={handleShare}
                    className={`w-full py-4 rounded-[20px] font-black uppercase text-[10px] tracking-[0.18em] transition-all flex items-center justify-center gap-3 border ${
                      copied
                        ? "bg-white text-gray-900 border-white scale-95"
                        : "bg-transparent text-white border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {copied
                      ? pick({ ru: "Готово!", en: "Copied!", uz: "Tayyor!" })
                      : pick({ ru: "Поделиться", en: "Share", uz: "Ulashish" })}{" "}
                    <Share2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 px-6 text-center space-y-1">
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300">
                  ID: {event.id.toString().split("-")[0]}
                </p>
                <p className="text-[8px] font-black uppercase tracking-[0.4em] text-gray-300">
                  {pick({ ru: "Статус: Активно", en: "Status: Active", uz: "Holat: Faol" })}
                </p>
              </div>
            </div>
          </div>
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
