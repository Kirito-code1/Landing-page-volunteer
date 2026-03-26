"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  PlusCircle, 
  Loader2, 
  MapPin, 
  Heart, 
  Crown,
  Lock,
  Download,
  X,
  Calendar,
  Users,
  Trash2,
  Edit3,
  ImageIcon,
  Check,
  XCircle,
  Clock3,
  Mail,
  Phone,
  BarChart3,
  UserCheck,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getEventCategoryLabel,
  getEventCategoryOptions,
  normalizeEventCategory,
  normalizeVolunteerCount,
} from "@/components/events/eventMeta";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";

interface DashboardEvent {
  id: string;
  title: string;
  location: string;
  date: string;
  category?: string | null;
  volunteers_needed?: number | null;
  premium_priority?: boolean | null;
  image_url: string | null;
  description: string | null;
}

type ApplicationStatus = "pending" | "approved" | "rejected";

interface EventApplication {
  id: string;
  event_id: string;
  organizer_id: string;
  volunteer_id: string;
  volunteer_name: string | null;
  volunteer_email: string | null;
  volunteer_phone: string | null;
  status: ApplicationStatus;
  attended?: boolean | null;
  checked_in_at?: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface EventReport {
  id: string;
  event_id: string;
  organizer_id: string;
  actual_attendees: number;
  hours_per_volunteer: number;
  outcome_text: string | null;
  outcome_value: number | null;
  outcome_unit: string | null;
  created_at: string;
  updated_at: string;
}

const FREE_POST_LIMIT = 3;

export default function Dashboard() {
  const { pick } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [myEvents, setMyEvents] = useState<DashboardEvent[]>([]);
  const [eventApplications, setEventApplications] = useState<EventApplication[]>([]);
  const [eventReports, setEventReports] = useState<EventReport[]>([]);
  const [applicationsMissingSetup, setApplicationsMissingSetup] = useState(false);
  const [reportsMissingSetup, setReportsMissingSetup] = useState(false);
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    title: string;
  }>({
    isOpen: false,
    id: null,
    title: "",
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
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    eventId: string | null;
    eventTitle: string;
    actualAttendees: string;
    hoursPerVolunteer: string;
    outcomeText: string;
    outcomeValue: string;
    outcomeUnit: string;
  }>({
    isOpen: false,
    eventId: null,
    eventTitle: "",
    actualAttendees: "0",
    hoursPerVolunteer: "1",
    outcomeText: "",
    outcomeValue: "",
    outcomeUnit: "",
  });
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "other",
    volunteersNeeded: "10",
    location: "",
    date: "",
    time: "",
    description: ""
  });

  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ), []);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      setUser(session.user);

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, location, date, category, volunteers_needed, premium_priority, image_url, description")
        .eq("user_id", session.user.id)
        .order('created_at', { ascending: false });

      const preparedEvents = eventsData ?? [];
      setMyEvents(preparedEvents);

      if (preparedEvents.length === 0) {
        setEventApplications([]);
        setEventReports([]);
        setApplicationsMissingSetup(false);
        setReportsMissingSetup(false);
        return;
      }

      const eventIds = preparedEvents.map((event) => event.id);
      const [applicationsResponse, reportsResponse] = await Promise.all([
        supabase
          .from("event_applications")
          .select("id, event_id, organizer_id, volunteer_id, volunteer_name, volunteer_email, volunteer_phone, status, attended, checked_in_at, created_at, reviewed_at")
          .in("event_id", eventIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("event_reports")
          .select("id, event_id, organizer_id, actual_attendees, hours_per_volunteer, outcome_text, outcome_value, outcome_unit, created_at, updated_at")
          .in("event_id", eventIds)
          .order("updated_at", { ascending: false }),
      ]);
      const { data: applicationsData, error: applicationsError } = applicationsResponse;
      const { data: reportsData, error: reportsError } = reportsResponse;

      if (applicationsError) {
        const setupMissing =
          /event_applications/i.test(applicationsError.message) &&
          /relation|table|schema cache|does not exist|PGRST/i.test(applicationsError.message);
        if (setupMissing) {
          setApplicationsMissingSetup(true);
          setEventApplications([]);
        } else {
          console.error("Error loading applications:", applicationsError.message);
          setApplicationsMissingSetup(false);
        }
      } else {
        setApplicationsMissingSetup(false);
        setEventApplications((applicationsData ?? []) as EventApplication[]);
      }

      if (reportsError) {
        const reportsSetupMissing =
          /event_reports/i.test(reportsError.message) &&
          /relation|table|schema cache|does not exist|PGRST/i.test(reportsError.message);
        if (reportsSetupMissing) {
          setReportsMissingSetup(true);
          setEventReports([]);
        } else {
          console.error("Error loading impact reports:", reportsError.message);
          setReportsMissingSetup(false);
        }
      } else {
        setReportsMissingSetup(false);
        setEventReports((reportsData ?? []) as EventReport[]);
      }
    } catch (err: unknown) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, router]);

  const dateLocale = pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" });
  const categoryOptions = getEventCategoryOptions(pick);
  const isPremium =
    user?.user_metadata?.is_premium === true ||
    user?.user_metadata?.subscription_plan === "premium";
  const postsLeftForFree = Math.max(0, FREE_POST_LIMIT - myEvents.length);
  const reachedFreeLimit = !isPremium && myEvents.length >= FREE_POST_LIMIT;
  const missingColumnsHint = pick({
    ru: "В базе нет новых полей category/volunteers_needed/premium_priority. Выполните SQL из файла database/events_extra_fields.sql.",
    en: "New columns category/volunteers_needed/premium_priority are missing in DB. Run SQL from database/events_extra_fields.sql.",
    uz: "Bazadagi category/volunteers_needed/premium_priority ustunlari yo'q. database/events_extra_fields.sql faylidagi SQL ni ishga tushiring.",
  });
  const missingApplicationsHint = pick({
    ru: "Таблица заявок или поля attended/checked_in_at не найдены. Выполните SQL из файла database/event_applications.sql.",
    en: "Applications table or attended/checked_in_at fields are missing. Run SQL from database/event_applications.sql.",
    uz: "Arizalar jadvali yoki attended/checked_in_at ustunlari topilmadi. database/event_applications.sql faylidagi SQL ni ishga tushiring.",
  });
  const missingReportsHint = pick({
    ru: "Таблица impact-отчётов не найдена. Выполните SQL из файла database/event_reports.sql.",
    en: "Impact reports table is missing. Run SQL from database/event_reports.sql.",
    uz: "Impact hisobotlar jadvali topilmadi. database/event_reports.sql faylidagi SQL ni ishga tushiring.",
  });

  const isMissingNewColumnsError = (message: string) => {
    const hasColumnMention = /column|schema cache|does not exist|PGRST204/i.test(message);
    const hasFieldMention = /category|volunteers_needed|premium_priority/i.test(message);
    return hasColumnMention && hasFieldMention;
  };

  const isMissingApplicationsTableError = (message: string) => {
    const hasTableMention = /event_applications/i.test(message);
    const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const isMissingAttendanceColumnsError = (message: string) => {
    const hasColumnMention = /column|schema cache|does not exist|PGRST204/i.test(message);
    const hasFieldMention = /attended|checked_in_at/i.test(message);
    return hasColumnMention && hasFieldMention;
  };

  const isMissingReportsTableError = (message: string) => {
    const hasTableMention = /event_reports/i.test(message);
    const hasSchemaMention = /relation|table|schema cache|does not exist|PGRST/i.test(message);
    return hasTableMention && hasSchemaMention;
  };

  const premiumStats = useMemo(() => {
    const now = Date.now();
    const upcomingCount = myEvents.filter((event) => new Date(event.date).getTime() >= now).length;
    const totalVolunteersNeeded = myEvents.reduce((total, event) => {
      return total + (normalizeVolunteerCount(event.volunteers_needed) ?? 0);
    }, 0);
    const categoryCount: Record<string, number> = {};
    let nearestEventDate: string | null = null;
    let nearestEventTimestamp = Number.POSITIVE_INFINITY;

    for (const event of myEvents) {
      const normalizedCategory = normalizeEventCategory(event.category);
      categoryCount[normalizedCategory] = (categoryCount[normalizedCategory] ?? 0) + 1;

      const eventTimestamp = new Date(event.date).getTime();
      if (!Number.isNaN(eventTimestamp) && eventTimestamp >= now && eventTimestamp < nearestEventTimestamp) {
        nearestEventTimestamp = eventTimestamp;
        nearestEventDate = event.date;
      }
    }

    const topCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const averageTeamSize =
      myEvents.length > 0 ? Math.round(totalVolunteersNeeded / myEvents.length) : 0;

    return {
      totalEvents: myEvents.length,
      upcomingCount,
      totalVolunteersNeeded,
      topCategory,
      nearestEventDate,
      averageTeamSize,
    };
  }, [myEvents]);

  const applicationsStats = useMemo(() => {
    return eventApplications.reduce(
      (acc, item) => {
        if (item.status === "pending") acc.pending += 1;
        if (item.status === "approved") acc.approved += 1;
        if (item.status === "rejected") acc.rejected += 1;
        return acc;
      },
      { pending: 0, approved: 0, rejected: 0 },
    );
  }, [eventApplications]);

  const reportByEventId = useMemo(() => {
    return new Map(eventReports.map((report) => [report.event_id, report]));
  }, [eventReports]);

  const impactStats = useMemo(() => {
    const now = Date.now();
    const pastEventIds = new Set(
      myEvents
        .filter((event) => {
          const timestamp = new Date(event.date).getTime();
          return !Number.isNaN(timestamp) && timestamp < now;
        })
        .map((event) => event.id),
    );

    const approvedByEvent = new Map<string, number>();
    const attendedByEvent = new Map<string, number>();
    let approvedTotal = 0;
    let attendedTotal = 0;
    let noShowTotal = 0;

    for (const application of eventApplications) {
      if (application.status !== "approved") continue;
      approvedTotal += 1;
      approvedByEvent.set(application.event_id, (approvedByEvent.get(application.event_id) ?? 0) + 1);
      if (application.attended === true) {
        attendedTotal += 1;
        attendedByEvent.set(application.event_id, (attendedByEvent.get(application.event_id) ?? 0) + 1);
      } else if (pastEventIds.has(application.event_id)) {
        noShowTotal += 1;
      }
    }

    let volunteerHours = 0;
    for (const event of myEvents) {
      const report = reportByEventId.get(event.id);
      if (!report) continue;
      const reportHours = Number(report.hours_per_volunteer);
      if (Number.isNaN(reportHours) || reportHours <= 0) continue;
      const attendedCount = attendedByEvent.get(event.id) ?? 0;
      const fallbackAttendees = report.actual_attendees > 0 ? report.actual_attendees : attendedCount;
      volunteerHours += fallbackAttendees * reportHours;
    }

    const attendanceRate = approvedTotal > 0 ? Math.round((attendedTotal / approvedTotal) * 100) : 0;

    return {
      approvedTotal,
      attendedTotal,
      noShowTotal,
      volunteerHours: Math.round(volunteerHours * 10) / 10,
      attendanceRate,
      reportsCount: eventReports.length,
    };
  }, [eventApplications, myEvents, reportByEventId, eventReports.length]);

  const eventTitleMap = useMemo(() => {
    return new Map(myEvents.map((event) => [event.id, event.title]));
  }, [myEvents]);

  const getStatusBadge = (status: ApplicationStatus) => {
    if (status === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
    if (status === "rejected") {
      return "bg-red-50 text-red-600 border-red-100";
    }
    return "bg-amber-50 text-amber-700 border-amber-100";
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    if (status === "approved") {
      return pick({ ru: "Принята", en: "Approved", uz: "Tasdiqlangan" });
    }
    if (status === "rejected") {
      return pick({ ru: "Отклонена", en: "Rejected", uz: "Rad etilgan" });
    }
    return pick({ ru: "Ожидает", en: "Pending", uz: "Kutilmoqda" });
  };

  const openCreateModal = () => {
    if (reachedFreeLimit) {
      showAlertModal(
        pick({ ru: "Лимит достигнут", en: "Limit reached", uz: "Limitga yetildi" }),
        pick({
          ru: `Лимит free-тарифа: ${FREE_POST_LIMIT} объявления. Оформите premium на отдельной странице подписки.`,
          en: `Free plan limit: ${FREE_POST_LIMIT} posts. Upgrade on the Premium page for more.`,
          uz: `Free tarif limiti: ${FREE_POST_LIMIT} ta e'lon. Ko'proq imkoniyat uchun Premium sahifasiga o'ting.`,
        }),
        "warning",
      );
      return;
    }
    setIsModalOpen(true);
  };

  const handleExportCsv = () => {
    if (!isPremium) return;

    const header = ["id", "title", "category", "volunteers_needed", "location", "date"];
    const rows = myEvents.map((event) => [
      event.id,
      `"${(event.title || "").replace(/"/g, '""')}"`,
      `"${getEventCategoryLabel(event.category, pick).replace(/"/g, '""')}"`,
      normalizeVolunteerCount(event.volunteers_needed) ?? "",
      `"${(event.location || "").replace(/"/g, '""')}"`,
      event.date,
    ]);
    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "volohero_events.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportImpactCsv = () => {
    if (!isPremium) return;

    const header = [
      "event_id",
      "event_title",
      "approved_count",
      "attended_count",
      "actual_attendees",
      "hours_per_volunteer",
      "volunteer_hours",
      "outcome_text",
      "outcome_value",
      "outcome_unit",
      "updated_at",
    ];

    const rows = myEvents.map((event) => {
      const approvedCount = eventApplications.filter(
        (item) => item.event_id === event.id && item.status === "approved",
      ).length;
      const attendedCount = eventApplications.filter(
        (item) => item.event_id === event.id && item.status === "approved" && item.attended === true,
      ).length;
      const report = reportByEventId.get(event.id);
      const actualAttendees = report?.actual_attendees ?? "";
      const hoursPerVolunteer = report?.hours_per_volunteer ?? "";
      const attendeeBase = report?.actual_attendees && report.actual_attendees > 0
        ? report.actual_attendees
        : attendedCount;
      const volunteerHours =
        report?.hours_per_volunteer && Number(report.hours_per_volunteer) > 0
          ? attendeeBase * Number(report.hours_per_volunteer)
          : "";

      return [
        event.id,
        `"${(event.title || "").replace(/"/g, '""')}"`,
        approvedCount,
        attendedCount,
        actualAttendees,
        hoursPerVolunteer,
        volunteerHours,
        `"${(report?.outcome_text || "").replace(/"/g, '""')}"`,
        report?.outcome_value ?? "",
        `"${(report?.outcome_unit || "").replace(/"/g, '""')}"`,
        report?.updated_at ?? "",
      ];
    });

    const csv = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "volohero_impact.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const showAlertModal = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const openDeleteModal = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, id, title });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, id: null, title: "" });
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", deleteModal.id);
      if (error) throw error;
      setMyEvents((prev) => prev.filter((event) => event.id !== deleteModal.id));
      closeDeleteModal();
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(
        pick({ ru: "Ошибка при удалении", en: "Delete error", uz: "O'chirish xatosi" }),
        message,
        "error",
      );
    }
  };

  const handleApplicationStatusUpdate = async (
    application: EventApplication,
    nextStatus: "approved" | "rejected",
  ) => {
    try {
      setApplicationActionId(application.id);
      const reviewedAt = new Date().toISOString();
      const { error } = await supabase
        .from("event_applications")
        .update({ status: nextStatus, reviewed_at: reviewedAt })
        .eq("id", application.id);

      if (error) {
        if (isMissingApplicationsTableError(error.message)) {
          setApplicationsMissingSetup(true);
          showAlertModal(
            pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
            missingApplicationsHint,
            "warning",
          );
          return;
        }
        throw error;
      }

      setEventApplications((prev) =>
        prev.map((item) =>
          item.id === application.id
            ? { ...item, status: nextStatus, reviewed_at: reviewedAt }
            : item,
        ),
      );

    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(
        pick({ ru: "Ошибка обновления", en: "Update error", uz: "Yangilash xatosi" }),
        message,
        "error",
      );
    } finally {
      setApplicationActionId(null);
    }
  };

  const handleAttendanceToggle = async (
    application: EventApplication,
    nextAttended: boolean,
  ) => {
    try {
      setApplicationActionId(application.id);
      const nextCheckedInAt = nextAttended ? new Date().toISOString() : null;
      const { error } = await supabase
        .from("event_applications")
        .update({ attended: nextAttended, checked_in_at: nextCheckedInAt })
        .eq("id", application.id);

      if (error) {
        if (isMissingAttendanceColumnsError(error.message)) {
          showAlertModal(
            pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
            missingApplicationsHint,
            "warning",
          );
          return;
        }
        throw error;
      }

      setEventApplications((prev) =>
        prev.map((item) =>
          item.id === application.id
            ? { ...item, attended: nextAttended, checked_in_at: nextCheckedInAt }
            : item,
        ),
      );
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(
        pick({ ru: "Ошибка отметки посещения", en: "Attendance update error", uz: "Qatnashuvni yangilash xatosi" }),
        message,
        "error",
      );
    } finally {
      setApplicationActionId(null);
    }
  };

  const openEditModal = (event: DashboardEvent) => {
    const eventDate = new Date(event.date);
    const isValidDate = !Number.isNaN(eventDate.getTime());
    const pad2 = (value: number) => value.toString().padStart(2, "0");

    setEditingId(event.id);
    setFormData({
      title: event.title,
      category: normalizeEventCategory(event.category),
      volunteersNeeded: normalizeVolunteerCount(event.volunteers_needed)?.toString() || "10",
      location: event.location,
      // Формируем дату в локальной зоне, чтобы избежать сдвига дня из-за UTC.
      date: isValidDate
        ? `${eventDate.getFullYear()}-${pad2(eventDate.getMonth() + 1)}-${pad2(eventDate.getDate())}`
        : "",
      time: isValidDate
        ? `${pad2(eventDate.getHours())}:${pad2(eventDate.getMinutes())}`
        : "",
      description: event.description || ""
    });
    setImagePreview(event.image_url);
    setIsModalOpen(true);
  };

  const openReportModal = (event: DashboardEvent) => {
    const report = reportByEventId.get(event.id);
    const approvedCount = eventApplications.filter(
      (item) => item.event_id === event.id && item.status === "approved",
    ).length;

    setReportModal({
      isOpen: true,
      eventId: event.id,
      eventTitle: event.title,
      actualAttendees: String(report?.actual_attendees ?? approvedCount),
      hoursPerVolunteer: String(report?.hours_per_volunteer ?? 1),
      outcomeText: report?.outcome_text ?? "",
      outcomeValue: report?.outcome_value?.toString() ?? "",
      outcomeUnit: report?.outcome_unit ?? "",
    });
  };

  const closeReportModal = () => {
    setReportModal({
      isOpen: false,
      eventId: null,
      eventTitle: "",
      actualAttendees: "0",
      hoursPerVolunteer: "1",
      outcomeText: "",
      outcomeValue: "",
      outcomeUnit: "",
    });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportModal.eventId) return;

    const parsedAttendees = Number(reportModal.actualAttendees);
    const parsedHours = Number(reportModal.hoursPerVolunteer);
    const outcomeValueRaw = reportModal.outcomeValue.trim();
    const parsedOutcomeValue = outcomeValueRaw.length > 0 ? Number(outcomeValueRaw) : null;

    if (!Number.isFinite(parsedAttendees) || parsedAttendees < 0) {
      showAlertModal(
        pick({ ru: "Проверьте данные", en: "Check your input", uz: "Ma'lumotlarni tekshiring" }),
        pick({
          ru: "Фактическое количество участников должно быть 0 или больше.",
          en: "Actual attendees must be 0 or greater.",
          uz: "Amaldagi ishtirokchilar soni 0 yoki undan katta bo'lishi kerak.",
        }),
        "warning",
      );
      return;
    }

    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      showAlertModal(
        pick({ ru: "Проверьте данные", en: "Check your input", uz: "Ma'lumotlarni tekshiring" }),
        pick({
          ru: "Часы на волонтёра должны быть больше 0.",
          en: "Hours per volunteer must be greater than 0.",
          uz: "Har bir volontyor uchun soat 0 dan katta bo'lishi kerak.",
        }),
        "warning",
      );
      return;
    }

    if (parsedOutcomeValue !== null && (!Number.isFinite(parsedOutcomeValue) || parsedOutcomeValue < 0)) {
      showAlertModal(
        pick({ ru: "Проверьте данные", en: "Check your input", uz: "Ma'lumotlarni tekshiring" }),
        pick({
          ru: "Impact value должен быть числом 0 или больше.",
          en: "Impact value must be a number 0 or greater.",
          uz: "Impact qiymati 0 yoki undan katta son bo'lishi kerak.",
        }),
        "warning",
      );
      return;
    }

    try {
      setIsReportSubmitting(true);
      const payload = {
        event_id: reportModal.eventId,
        organizer_id: user.id,
        actual_attendees: Math.round(parsedAttendees),
        hours_per_volunteer: Math.round(parsedHours * 100) / 100,
        outcome_text: reportModal.outcomeText.trim() || null,
        outcome_value: parsedOutcomeValue === null ? null : Math.round(parsedOutcomeValue),
        outcome_unit: reportModal.outcomeUnit.trim() || null,
      };

      const { data, error } = await supabase
        .from("event_reports")
        .upsert(payload, { onConflict: "event_id" })
        .select("id, event_id, organizer_id, actual_attendees, hours_per_volunteer, outcome_text, outcome_value, outcome_unit, created_at, updated_at")
        .single();

      if (error) {
        if (isMissingReportsTableError(error.message)) {
          setReportsMissingSetup(true);
          showAlertModal(
            pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }),
            missingReportsHint,
            "warning",
          );
          return;
        }
        throw error;
      }

      setReportsMissingSetup(false);
      setEventReports((prev) => {
        const next = prev.filter((report) => report.event_id !== data.event_id);
        return [data as EventReport, ...next];
      });
      closeReportModal();
      showAlertModal(
        pick({ ru: "Impact-отчёт сохранён", en: "Impact report saved", uz: "Impact hisobot saqlandi" }),
        pick({
          ru: "Данные обновлены и уже учтены в аналитике.",
          en: "Data is updated and already included in analytics.",
          uz: "Ma'lumotlar yangilandi va analyticsda hisobga olindi.",
        }),
        "success",
      );
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(
        pick({ ru: "Ошибка сохранения отчёта", en: "Report save error", uz: "Hisobotni saqlash xatosi" }),
        message,
        "error",
      );
    } finally {
      setIsReportSubmitting(false);
    }
  };

  const closeAndReset = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setFormData({ title: "", category: "other", volunteersNeeded: "10", location: "", date: "", time: "", description: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!user) {
        throw new Error(
          pick({
            ru: "Пользователь не найден. Перезайдите в аккаунт.",
            en: "User not found. Please sign in again.",
            uz: "Foydalanuvchi topilmadi. Qayta kirib ko'ring.",
          }),
        );
      }

      if (!editingId && reachedFreeLimit) {
        throw new Error(
          pick({
            ru: `Вы достигли лимита free-тарифа (${FREE_POST_LIMIT} объявления).`,
            en: `You reached the free plan limit (${FREE_POST_LIMIT} posts).`,
            uz: `Siz free tarif limitiga yetdingiz (${FREE_POST_LIMIT} ta e'lon).`,
          }),
        );
      }

      let finalImageUrl = imagePreview;
      const volunteersNeeded = normalizeVolunteerCount(formData.volunteersNeeded);
      if (!volunteersNeeded) {
        throw new Error(
          pick({
            ru: "Укажите корректное количество волонтёров (минимум 1).",
            en: "Please provide a valid volunteer count (minimum 1).",
            uz: "Volontyorlar sonini to'g'ri kiriting (kamida 1).",
          }),
        );
      }

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const combinedDateTime = `${formData.date}T${formData.time}:00`;
      const basePayload = {
        title: formData.title,
        location: formData.location,
        date: combinedDateTime,
        image_url: finalImageUrl,
        description: formData.description,
        user_id: user.id,
      };
      const payload = {
        ...basePayload,
        category: normalizeEventCategory(formData.category),
        volunteers_needed: volunteersNeeded,
        premium_priority: isPremium,
      };
      let usedFallbackWithoutNewColumns = false;

      if (editingId) {
        const { error } = await supabase.from("events").update(payload).eq("id", editingId);
        if (error) {
          if (isMissingNewColumnsError(error.message)) {
            const retry = await supabase.from("events").update(basePayload).eq("id", editingId);
            if (retry.error) throw retry.error;
            usedFallbackWithoutNewColumns = true;
          } else {
            throw error;
          }
        }
      } else {
        const { error } = await supabase.from("events").insert([payload]);
        if (error) {
          if (isMissingNewColumnsError(error.message)) {
            const retry = await supabase.from("events").insert([basePayload]);
            if (retry.error) throw retry.error;
            usedFallbackWithoutNewColumns = true;
          } else {
            throw error;
          }
        }
      }

      closeAndReset();
      fetchData(); 
      if (usedFallbackWithoutNewColumns) {
        showAlertModal(
          pick({ ru: "Событие сохранено", en: "Event saved", uz: "Tadbir saqlandi" }),
          missingColumnsHint,
          "warning",
        );
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error
        ? err.message
        : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      const message = isMissingNewColumnsError(rawMessage)
        ? missingColumnsHint
        : rawMessage;
      showAlertModal(
        pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }),
        message,
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-[#10b981]" />
        <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest italic">
          {pick({ ru: "Загрузка...", en: "Loading...", uz: "Yuklanmoqda..." })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfd] font-sans overflow-x-hidden">
      
      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-[600px] rounded-[30px] md:rounded-[40px] shadow-2xl animate-in zoom-in-95 border border-gray-100 my-auto">
            <div className="p-6 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase italic tracking-tighter">
                  {editingId
                    ? pick({ ru: "Изменить", en: "Edit", uz: "Tahrirlash" })
                    : pick({ ru: "Создать", en: "Create", uz: "Yaratish" })}
                </h2>
                <button onClick={closeAndReset} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Фотография */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    {pick({ ru: "Фотография", en: "Photo", uz: "Rasm" })}
                  </label>
                  <div className="relative h-32 w-full bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:border-[#10b981]/50 transition-colors cursor-pointer group">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        className="object-cover"
                        alt="Preview"
                        fill
                        sizes="100vw"
                        unoptimized
                      />
                    ) : (
                        <div className="flex flex-col items-center text-gray-400 group-hover:text-[#10b981]">
                          <ImageIcon size={24} className="mb-2" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">
                            {pick({ ru: "Выбрать файл", en: "Select file", uz: "Fayl tanlash" })}
                          </span>
                        </div>
                      )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                {/* Название */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    {pick({ ru: "Название", en: "Title", uz: "Nomi" })}
                  </label>
                  <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] outline-none font-bold text-gray-900" placeholder={pick({ ru: "Название события", en: "Event title", uz: "Tadbir nomi" })} />
                </div>

                {/* Категория и волонтёры */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Категория", en: "Category", uz: "Kategoriya" })}
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none"
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Нужно волонтёров", en: "Volunteers Needed", uz: "Kerakli volontyorlar" })}
                    </label>
                    <input
                      required
                      min={1}
                      type="number"
                      value={formData.volunteersNeeded}
                      onChange={(e) => setFormData({ ...formData, volunteersNeeded: e.target.value })}
                      className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none"
                      placeholder="10"
                    />
                  </div>
                </div>

                {/* Дата и Время */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Дата", en: "Date", uz: "Sana" })}
                    </label>
                    <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Время", en: "Time", uz: "Vaqt" })}
                    </label>
                    <input required type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900" />
                  </div>
                </div>

                {/* Место */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    {pick({ ru: "Место", en: "Location", uz: "Joylashuv" })}
                  </label>
                  <input required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900" placeholder={pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })} />
                </div>

                {/* Описание (Добавлено) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    {pick({ ru: "Описание", en: "Description", uz: "Tavsif" })}
                  </label>
                  <textarea 
                    rows={4}
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none resize-none" 
                    placeholder={pick({
                      ru: "Расскажите подробнее о задаче...",
                      en: "Describe the task in more detail...",
                      uz: "Vazifa haqida batafsil yozing...",
                    })}
                  />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-[#10b981] text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-green-200 mt-2 hover:bg-[#0da975] transition-all disabled:bg-gray-200">
                  {isSubmitting
                    ? <Loader2 className="animate-spin mx-auto w-5 h-5" />
                    : editingId
                      ? pick({ ru: "Обновить", en: "Update", uz: "Yangilash" })
                      : pick({ ru: "Опубликовать", en: "Publish", uz: "E'lon qilish" })}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {reportModal.isOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-[640px] rounded-[30px] md:rounded-[40px] shadow-2xl border border-gray-100 my-auto">
            <div className="p-6 md:p-10">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                    {pick({ ru: "Impact отчёт", en: "Impact report", uz: "Impact hisobot" })}
                  </p>
                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase italic tracking-tighter mt-2 line-clamp-2">
                    {reportModal.eventTitle}
                  </h2>
                </div>
                <button onClick={closeReportModal} className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Фактические участники", en: "Actual attendees", uz: "Amaldagi ishtirokchilar" })}
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={reportModal.actualAttendees}
                      onChange={(e) => setReportModal((prev) => ({ ...prev, actualAttendees: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Часы на человека", en: "Hours per person", uz: "Har biriga soat" })}
                    </label>
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      required
                      value={reportModal.hoursPerVolunteer}
                      onChange={(e) => setReportModal((prev) => ({ ...prev, hoursPerVolunteer: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                    {pick({ ru: "Результат события", en: "Event outcome", uz: "Tadbir natijasi" })}
                  </label>
                  <textarea
                    rows={4}
                    value={reportModal.outcomeText}
                    onChange={(e) => setReportModal((prev) => ({ ...prev, outcomeText: e.target.value }))}
                    className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none resize-none"
                    placeholder={pick({
                      ru: "Например: очищена территория парка, собрано 120 кг мусора...",
                      en: "Example: park territory cleaned, 120kg of waste collected...",
                      uz: "Masalan: bog' hududi tozalandi, 120kg chiqindi yig'ildi...",
                    })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Impact value", en: "Impact value", uz: "Impact qiymat" })}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={reportModal.outcomeValue}
                      onChange={(e) => setReportModal((prev) => ({ ...prev, outcomeValue: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none"
                      placeholder="120"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-4">
                      {pick({ ru: "Единица", en: "Unit", uz: "Birlik" })}
                    </label>
                    <input
                      value={reportModal.outcomeUnit}
                      onChange={(e) => setReportModal((prev) => ({ ...prev, outcomeUnit: e.target.value }))}
                      className="w-full px-6 py-4 bg-gray-50 rounded-[22px] font-bold text-gray-900 outline-none"
                      placeholder={pick({ ru: "кг, людей, наборов...", en: "kg, people, kits...", uz: "kg, odam, to'plam..." })}
                    />
                  </div>
                </div>

                <button
                  disabled={isReportSubmitting}
                  type="submit"
                  className="w-full bg-amber-500 text-white py-5 rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-amber-100 mt-2 hover:bg-amber-600 transition-all disabled:bg-gray-200"
                >
                  {isReportSubmitting
                    ? <Loader2 className="animate-spin mx-auto w-5 h-5" />
                    : pick({ ru: "Сохранить отчёт", en: "Save report", uz: "Hisobotni saqlash" })}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-[#10b981] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                <Heart className="w-7 h-7 fill-current" />
             </div>
             <div>
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">VoloHero</h1>
                <p className="text-gray-400 font-bold uppercase text-[9px] tracking-[0.3em] mt-2">
                  {pick({ ru: "Личный кабинет героя", en: "Hero dashboard", uz: "Qahramon kabineti" })}: {user?.user_metadata?.full_name?.split(" ")[0]}
                </p>
                <p className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isPremium ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                  {isPremium ? <Crown className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {isPremium
                    ? pick({ ru: "Premium", en: "Premium", uz: "Premium" })
                    : pick({ ru: "Free", en: "Free", uz: "Free" })}
                </p>
             </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={openCreateModal}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-[#10b981] text-white rounded-[22px] font-black italic uppercase text-[10px] tracking-widest shadow-xl shadow-green-100/50 hover:bg-[#0da975] hover:scale-105 transition-all"
            >
              <PlusCircle size={18} /> {pick({ ru: "Создать пост", en: "Create Post", uz: "Post yaratish" })}
            </button>
          </div>
        </header>

        {isPremium ? (
          <section className="mb-14 rounded-[34px] border border-amber-200 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_55%,_#fffbeb_100%)] p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500 flex items-center gap-2">
                  <Crown className="w-4 h-4" />
                  {pick({ ru: "Premium Dashboard", en: "Premium Dashboard", uz: "Premium Dashboard" })}
                </p>
                <h3 className="text-2xl font-black text-gray-900 mt-2">
                  {pick({ ru: "Расширенная аналитика активности", en: "Advanced activity analytics", uz: "Kengaytirilgan faollik tahlili" })}
                </h3>
              </div>
              <button
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
              >
                <Download className="w-4 h-4" />
                {pick({ ru: "Экспорт CSV", en: "Export CSV", uz: "CSV eksport" })}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Всего событий", en: "Total events", uz: "Jami tadbirlar" })}
                </p>
                <p className="text-3xl font-black text-gray-900 mt-1">{premiumStats.totalEvents}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Предстоящие", en: "Upcoming", uz: "Kutilayotgan" })}
                </p>
                <p className="text-3xl font-black text-gray-900 mt-1">{premiumStats.upcomingCount}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Требуется волонтёров", en: "Volunteers needed", uz: "Kerakli volontyorlar" })}
                </p>
                <p className="text-3xl font-black text-gray-900 mt-1">{premiumStats.totalVolunteersNeeded}</p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Топ категория", en: "Top category", uz: "Eng faol kategoriya" })}
                </p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {premiumStats.topCategory
                    ? getEventCategoryLabel(premiumStats.topCategory, pick)
                    : pick({ ru: "нет данных", en: "no data", uz: "ma'lumot yo'q" })}
                </p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Ближайшее событие", en: "Nearest event", uz: "Eng yaqin tadbir" })}
                </p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {premiumStats.nearestEventDate
                    ? new Date(premiumStats.nearestEventDate).toLocaleDateString(dateLocale)
                    : pick({ ru: "не найдено", en: "not found", uz: "topilmadi" })}
                </p>
              </div>
              <div className="rounded-2xl border border-white bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Средний размер команды", en: "Average team size", uz: "O'rtacha jamoa soni" })}
                </p>
                <p className="text-3xl font-black text-gray-900 mt-1">{premiumStats.averageTeamSize}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-14 rounded-[30px] border border-gray-100 bg-white p-6 md:p-8">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-gray-400 mt-1" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {pick({ ru: "Free план", en: "Free plan", uz: "Free tarif" })}
                </p>
                <p className="text-gray-700 font-bold mt-1">
                  {pick({
                    ru: `Лимит объявлений: ${FREE_POST_LIMIT}. Сейчас доступно: ${postsLeftForFree}.`,
                    en: `Post limit: ${FREE_POST_LIMIT}. Remaining: ${postsLeftForFree}.`,
                    uz: `E'lon limiti: ${FREE_POST_LIMIT}. Qolgan: ${postsLeftForFree}.`,
                  })}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {pick({
                    ru: "В premium доступны расширенная аналитика: топ-категория, ближайшая дата, средний размер команды и экспорт событий.",
                    en: "Premium unlocks advanced analytics: top category, nearest date, average team size, and event export.",
                    uz: "Premium kengaytirilgan tahlilni ochadi: top kategoriya, eng yaqin sana, o'rtacha jamoa hajmi va eksport.",
                  })}
                </p>
                <Link
                  href="/premium"
                  className="mt-4 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                >
                  {pick({ ru: "Смотреть Premium", en: "View Premium", uz: "Premiumni ko'rish" })}
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="mb-14 rounded-[30px] border border-gray-100 bg-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#10b981]" />
                {pick({ ru: "Impact аналитика", en: "Impact analytics", uz: "Impact analitika" })}
              </p>
              <h3 className="text-2xl font-black text-gray-900 mt-2">
                {pick({
                  ru: "Результат ваших событий",
                  en: "Outcome of your events",
                  uz: "Tadbirlaringiz natijasi",
                })}
              </h3>
            </div>
            {isPremium ? (
              <button
                onClick={handleExportImpactCsv}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
              >
                <Download className="w-4 h-4" />
                {pick({ ru: "Impact CSV", en: "Impact CSV", uz: "Impact CSV" })}
              </button>
            ) : null}
          </div>

          {reportsMissingSetup ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 mb-5">
              <p className="text-sm font-black text-amber-700">{missingReportsHint}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {pick({ ru: "Одобренные заявки", en: "Approved requests", uz: "Tasdiqlangan arizalar" })}
              </p>
              <p className="text-3xl font-black text-gray-900 mt-1">{impactStats.approvedTotal}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {pick({ ru: "Отмечено присутствие", en: "Attendance marked", uz: "Qatnashgan deb belgilangan" })}
              </p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{impactStats.attendedTotal}</p>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {pick({ ru: "No-show", en: "No-show", uz: "No-show" })}
              </p>
              <p className="text-3xl font-black text-red-500 mt-1">{impactStats.noShowTotal}</p>
            </div>
            {isPremium ? (
              <>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {pick({ ru: "Волонтёр-часы", en: "Volunteer hours", uz: "Volontyor-soatlar" })}
                  </p>
                  <p className="text-3xl font-black text-amber-700 mt-1">{impactStats.volunteerHours}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {pick({ ru: "Attendance rate", en: "Attendance rate", uz: "Attendance rate" })}
                  </p>
                  <p className="text-3xl font-black text-amber-700 mt-1">{impactStats.attendanceRate}%</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    {pick({ ru: "Impact отчёты", en: "Impact reports", uz: "Impact hisobotlar" })}
                  </p>
                  <p className="text-3xl font-black text-amber-700 mt-1">{impactStats.reportsCount}</p>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-gray-200 px-5 py-4 bg-white">
                <p className="text-sm font-bold text-gray-600">
                  {pick({
                    ru: "Premium откроет расширенные impact-метрики: волонтёр-часы, attendance rate и экспорт отчётов.",
                    en: "Premium unlocks advanced impact metrics: volunteer hours, attendance rate, and report export.",
                    uz: "Premium kengaytirilgan impact metrikalarni ochadi: volontyor-soatlar, attendance rate va hisobot eksporti.",
                  })}
                </p>
                <Link
                  href="/premium"
                  className="mt-3 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors"
                >
                  {pick({ ru: "Перейти в Premium", en: "Go Premium", uz: "Premiumga o'tish" })}
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mb-14 rounded-[30px] border border-gray-100 bg-white p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {pick({ ru: "Модерация", en: "Moderation", uz: "Moderatsiya" })}
              </p>
              <h3 className="text-2xl font-black text-gray-900 mt-2">
                {pick({ ru: "Заявки на участие", en: "Participation requests", uz: "Ishtirok arizalari" })}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-amber-50 px-3 py-2 text-center border border-amber-100">
                <p className="text-[9px] uppercase tracking-widest font-black text-amber-700">
                  {pick({ ru: "Ожидают", en: "Pending", uz: "Kutilmoqda" })}
                </p>
                <p className="text-lg font-black text-amber-700">{applicationsStats.pending}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2 text-center border border-emerald-100">
                <p className="text-[9px] uppercase tracking-widest font-black text-emerald-700">
                  {pick({ ru: "Приняты", en: "Approved", uz: "Tasdiq" })}
                </p>
                <p className="text-lg font-black text-emerald-700">{applicationsStats.approved}</p>
              </div>
              <div className="rounded-xl bg-red-50 px-3 py-2 text-center border border-red-100">
                <p className="text-[9px] uppercase tracking-widest font-black text-red-600">
                  {pick({ ru: "Отклонены", en: "Rejected", uz: "Rad" })}
                </p>
                <p className="text-lg font-black text-red-600">{applicationsStats.rejected}</p>
              </div>
            </div>
          </div>

          {applicationsMissingSetup ? (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
              <p className="text-sm font-black text-amber-700">
                {missingApplicationsHint}
              </p>
            </div>
          ) : eventApplications.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-100 py-10 px-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {pick({
                  ru: "Пока нет заявок от волонтёров",
                  en: "No volunteer requests yet",
                  uz: "Hozircha volontyorlar arizasi yo'q",
                })}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventApplications.map((application) => (
                <article key={application.id} className="rounded-2xl border border-gray-100 p-5 bg-gray-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        {pick({ ru: "Событие", en: "Event", uz: "Tadbir" })}
                      </p>
                      <h4 className="text-lg font-black text-gray-900 mt-1 leading-tight">
                        {eventTitleMap.get(application.event_id) ??
                          pick({ ru: "Без названия", en: "Untitled", uz: "Nomsiz" })}
                      </h4>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getStatusBadge(application.status)}`}>
                      {application.status === "pending" ? <Clock3 className="w-3.5 h-3.5" /> : null}
                      {application.status === "approved" ? <Check className="w-3.5 h-3.5" /> : null}
                      {application.status === "rejected" ? <XCircle className="w-3.5 h-3.5" /> : null}
                      {getStatusLabel(application.status)}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-bold text-gray-700">
                      {application.volunteer_name || pick({ ru: "Имя не указано", en: "Name not set", uz: "Ism kiritilmagan" })}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#10b981]" />
                      {application.volunteer_email || pick({ ru: "Почта не указана", en: "Email not set", uz: "Email kiritilmagan" })}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#10b981]" />
                      {application.volunteer_phone || pick({ ru: "Телефон не указан", en: "Phone not set", uz: "Telefon kiritilmagan" })}
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                      {pick({ ru: "Подано", en: "Submitted", uz: "Yuborilgan" })}: {new Date(application.created_at).toLocaleDateString(dateLocale)}
                    </p>
                    {application.status === "approved" ? (
                      <p
                        className={`text-[10px] font-black uppercase tracking-widest ${
                          application.attended ? "text-emerald-600" : "text-amber-600"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5 inline-block mr-1" />
                        {application.attended
                          ? pick({ ru: "Присутствие отмечено", en: "Attendance marked", uz: "Qatnashgani belgilangan" })
                          : pick({ ru: "Ожидает отметки", en: "Waiting for check-in", uz: "Belgilanishi kutilmoqda" })}
                      </p>
                    ) : null}
                  </div>

                  {application.status === "pending" && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApplicationStatusUpdate(application, "approved")}
                        disabled={applicationActionId === application.id}
                        className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-60"
                      >
                        {pick({ ru: "Принять", en: "Approve", uz: "Tasdiqlash" })}
                      </button>
                      <button
                        onClick={() => handleApplicationStatusUpdate(application, "rejected")}
                        disabled={applicationActionId === application.id}
                        className="w-full py-3 rounded-xl bg-red-500 text-white font-black uppercase text-[10px] tracking-widest hover:bg-red-600 transition-colors disabled:opacity-60"
                      >
                        {pick({ ru: "Отклонить", en: "Reject", uz: "Rad etish" })}
                      </button>
                    </div>
                  )}
                  {application.status === "approved" && (
                    <div className="mt-4">
                      <button
                        onClick={() =>
                          handleAttendanceToggle(application, !(application.attended === true))
                        }
                        disabled={applicationActionId === application.id}
                        className={`w-full py-3 rounded-xl text-white font-black uppercase text-[10px] tracking-widest transition-colors disabled:opacity-60 ${
                          application.attended
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-emerald-500 hover:bg-emerald-600"
                        }`}
                      >
                        {application.attended
                          ? pick({ ru: "Снять отметку", en: "Unmark attendance", uz: "Belgini olib tashlash" })
                          : pick({ ru: "Отметить присутствие", en: "Mark attended", uz: "Qatnashdi deb belgilash" })}
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="mb-20">
          <h2 className="text-2xl font-black text-gray-900 uppercase italic tracking-tighter mb-10 flex items-center gap-4">
            {pick({ ru: "Ваши публикации", en: "Your Posts", uz: "Sizning e'lonlaringiz" })}
            <span className="text-[#10b981] text-sm not-italic font-bold bg-green-50 px-3 py-1 rounded-full">{myEvents.length}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {myEvents.length > 0 ? (
              myEvents.map((event) => {
                const hasReport = reportByEventId.has(event.id);

                return (
                <div key={event.id} className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col group">
                  <div className="w-full h-52 relative overflow-hidden">
                    <Image
                      src={event.image_url || "/api/placeholder/400/400"}
                      className="object-cover group-hover:scale-110 transition-all duration-700"
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      unoptimized
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="font-black text-gray-900 text-xl italic uppercase tracking-tighter line-clamp-2 min-h-[3.5rem]">{event.title}</h3>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                          {getEventCategoryLabel(event.category, pick)}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {normalizeVolunteerCount(event.volunteers_needed) ?? pick({ ru: "не указано", en: "not set", uz: "kiritilmagan" })}
                        </span>
                        {hasReport ? (
                          <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5" />
                            {pick({ ru: "Impact готов", en: "Impact ready", uz: "Impact tayyor" })}
                          </span>
                        ) : null}
                      </div>
                      <div className="space-y-2 mt-4">
                        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#10b981]" /> {event.location}
                        </p>
                        <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#10b981]" /> {new Date(event.date).toLocaleDateString(dateLocale)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6 mt-8 border-t border-gray-50 pt-6">
                        <button onClick={() => openReportModal(event)} className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1.5 hover:tracking-widest transition-all">
                          <BarChart3 size={14} /> {pick({ ru: "Impact", en: "Impact", uz: "Impact" })}
                        </button>
                        <button onClick={() => openEditModal(event)} className="text-[10px] font-black uppercase text-[#10b981] flex items-center gap-1.5 hover:tracking-widest transition-all">
                          <Edit3 size={14} /> {pick({ ru: "Изменить", en: "Edit", uz: "Tahrirlash" })}
                        </button>
                        <button onClick={() => openDeleteModal(event.id, event.title)} className="text-[10px] font-black uppercase text-red-400 flex items-center gap-1.5 hover:tracking-widest transition-all">
                          <Trash2 size={14} /> {pick({ ru: "Удалить", en: "Delete", uz: "O'chirish" })}
                        </button>
                    </div>
                  </div>
                </div>
              );
              })
            ) : (
              <div className="col-span-full py-24 bg-white rounded-[60px] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center px-10">
                <p className="text-gray-400 font-black uppercase text-[10px] tracking-[0.2em] mb-10 italic">
                  {pick({ ru: "Список пуст...", en: "No posts yet...", uz: "Ro'yxat bo'sh..." })}
                </p>
                <button onClick={openCreateModal} className="px-12 py-5 bg-gray-900 text-white rounded-[26px] font-black italic uppercase text-[10px] tracking-widest transition-all">
                  {pick({ ru: "Создать объявление", en: "Create Post", uz: "E'lon yaratish" })}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <AlertModal
        isOpen={alertModal.isOpen}
        title={alertModal.title}
        message={alertModal.message}
        tone={alertModal.tone}
        closeLabel={pick({ ru: "Понятно", en: "Got it", uz: "Tushunarli" })}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 backdrop-blur-sm p-4">
          <div className="w-full max-w-[430px] rounded-[34px] bg-white p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-red-50 border border-red-100">
              <Trash2 className="w-9 h-9 text-red-500" />
            </div>
            <h3 className="text-center text-2xl font-black text-gray-900 tracking-tight">
              {pick({ ru: "Удалить объявление?", en: "Delete post?", uz: "E'lonni o'chirish?" })}
            </h3>
            <p className="text-center text-gray-500 font-semibold mt-3 leading-relaxed">
              {pick({
                ru: "Это действие нельзя отменить.",
                en: "This action cannot be undone.",
                uz: "Bu amalni ortga qaytarib bo'lmaydi.",
              })}
            </p>
            <p className="text-center text-gray-700 font-black mt-2 line-clamp-2">{deleteModal.title}</p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={closeDeleteModal}
                className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-black uppercase tracking-wider text-[11px] transition-colors"
              >
                {pick({ ru: "Отмена", en: "Cancel", uz: "Bekor qilish" })}
              </button>
              <button
                onClick={handleDelete}
                className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-black uppercase tracking-wider text-[11px] transition-colors"
              >
                {pick({ ru: "Удалить", en: "Delete", uz: "O'chirish" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
