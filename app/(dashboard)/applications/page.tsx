"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, Clock3, CheckCircle2, XCircle, Calendar, MapPin, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import { getEventCategoryLabel } from "@/components/events/eventMeta";

type ApplicationStatus = "pending" | "approved" | "rejected";

interface VolunteerApplication {
  id: string;
  event_id: string;
  status: ApplicationStatus;
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
  const [applications, setApplications] = useState<VolunteerApplication[]>([]);
  const [eventsMap, setEventsMap] = useState<Record<string, EventPreview>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | ApplicationStatus>("all");

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      ),
    [],
  );

  const missingApplicationsHint = pick({
    ru: "Таблица заявок не найдена. Выполните SQL из файла database/event_applications.sql.",
    en: "Applications table is missing. Run SQL from database/event_applications.sql.",
    uz: "Arizalar jadvali topilmadi. database/event_applications.sql faylidagi SQL ni ishga tushiring.",
  });

  const isMissingApplicationsTableError = (message: string) => {
    const hasTableMention = /event_applications/i.test(message);
    const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login?next=/applications");
        return;
      }

      const { data: applicationRows, error: applicationError } = await supabase
        .from("event_applications")
        .select("id, event_id, status, created_at, reviewed_at")
        .eq("volunteer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (applicationError) {
        if (isMissingApplicationsTableError(applicationError.message)) {
          setApplicationsMissingSetup(true);
          setApplications([]);
          setEventsMap({});
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
        return;
      }

      const { data: eventRows, error: eventsError } = await supabase
        .from("events")
        .select("id, title, location, date, category, image_url")
        .in("id", eventIds);

      if (eventsError) {
        throw new Error(eventsError.message);
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
  }, [supabase, router, pick]);

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

  const getStatusLabel = (status: ApplicationStatus) => {
    if (status === "approved") {
      return pick({ ru: "Принято", en: "Approved", uz: "Tasdiqlangan" });
    }
    if (status === "rejected") {
      return pick({ ru: "Отказ", en: "Rejected", uz: "Rad etilgan" });
    }
    return pick({ ru: "На рассмотрении", en: "Pending", uz: "Ko'rib chiqilmoqda" });
  };

  const getStatusStyle = (status: ApplicationStatus) => {
    if (status === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
    if (status === "rejected") {
      return "bg-red-50 text-red-600 border-red-100";
    }
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-10 h-10 text-[#10b981] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 md:py-12">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-[30px] border border-gray-100 bg-white p-6 md:p-8 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#10b981]">
            {pick({ ru: "Волонтёр", en: "Volunteer", uz: "Volontyor" })}
          </p>
          <h1 className="mt-2 text-3xl md:text-4xl font-black text-gray-900 uppercase italic tracking-tight">
            {pick({ ru: "Мои отклики", en: "My applications", uz: "Mening arizalarim" })}
          </h1>
          <p className="mt-3 text-gray-600 font-semibold">
            {pick({
              ru: "Здесь видно, какие заявки приняты, какие отклонены и какие ещё на рассмотрении.",
              en: "Here you can track which requests are approved, rejected, or still pending.",
              uz: "Bu yerda qaysi arizalar tasdiqlangani, rad etilgani yoki ko'rib chiqilayotganini ko'rasiz.",
            })}
          </p>
        </div>

        <section className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {pick({ ru: "Всего", en: "Total", uz: "Jami" })}
            </p>
            <p className="text-2xl font-black text-gray-900 mt-1">{applications.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
              {pick({ ru: "На рассмотрении", en: "Pending", uz: "Ko'rib chiqilmoqda" })}
            </p>
            <p className="text-2xl font-black text-amber-700 mt-1">{applicationsStats.pending}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
              {pick({ ru: "Принято", en: "Approved", uz: "Tasdiqlangan" })}
            </p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{applicationsStats.approved}</p>
          </div>
          <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-red-600">
              {pick({ ru: "Отказ", en: "Rejected", uz: "Rad etilgan" })}
            </p>
            <p className="text-2xl font-black text-red-600 mt-1">{applicationsStats.rejected}</p>
          </div>
        </section>

        <section className="mt-6 rounded-[24px] border border-gray-100 bg-white p-4 md:p-5">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors ${
                  statusFilter === status
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-[#10b981] hover:text-[#10b981]"
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

        {error && (
          <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm font-black text-red-600">
            {error}
          </div>
        )}

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {!applicationsMissingSetup && visibleApplications.length === 0 ? (
            <div className="col-span-full rounded-[28px] border-2 border-dashed border-gray-100 bg-white px-6 py-14 text-center">
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
              const statusStyle = getStatusStyle(application.status);

              return (
                <article key={application.id} className="rounded-[28px] border border-gray-100 bg-white p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {pick({ ru: "Отклик", en: "Application", uz: "Ariza" })}
                      </p>
                      <h3 className="text-xl font-black text-gray-900 mt-1 leading-tight">
                        {event?.title ?? pick({ ru: "Событие удалено", en: "Event removed", uz: "Tadbir o'chirilgan" })}
                      </h3>
                    </div>

                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${statusStyle}`}>
                      {application.status === "pending" ? <Clock3 className="w-3.5 h-3.5" /> : null}
                      {application.status === "approved" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                      {application.status === "rejected" ? <XCircle className="w-3.5 h-3.5" /> : null}
                      {getStatusLabel(application.status)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-gray-500">
                    {event?.location && (
                      <p className="inline-flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#10b981]" />
                        {event.location}
                      </p>
                    )}
                    {event?.date && (
                      <p className="inline-flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#10b981]" />
                        {formatDate(event.date, dateLocale)}
                      </p>
                    )}
                    {event?.category && (
                      <p className="text-[10px] uppercase tracking-widest font-black text-[#10b981]">
                        {getEventCategoryLabel(event.category, pick)}
                      </p>
                    )}
                    <p className="text-[10px] uppercase tracking-widest font-black text-gray-300">
                      {pick({ ru: "Отправлено", en: "Submitted", uz: "Yuborilgan" })}: {formatDate(application.created_at, dateLocale)}
                    </p>
                    {application.reviewed_at && (
                      <p className="text-[10px] uppercase tracking-widest font-black text-gray-300">
                        {pick({ ru: "Решение", en: "Decision", uz: "Qaror" })}: {formatDate(application.reviewed_at, dateLocale)}
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/events/${application.event_id}`}
                    className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#10b981] hover:text-emerald-700 transition-colors"
                  >
                    {pick({ ru: "Открыть событие", en: "Open event", uz: "Tadbirni ochish" })}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
