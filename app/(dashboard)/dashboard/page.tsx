"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
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
  Star,
  MessageSquare,
  FileText,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  getEventCategoryLabel,
  getEventCategoryOptions,
  normalizeEventCategory,
  normalizeVolunteerCount,
} from "@/components/events/eventMeta";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { hasRequiredPhone } from "@/lib/auth/phone";
import { buildCompleteProfilePath } from "@/lib/auth/redirect";
import { hasPremiumAccess } from "@/lib/auth/premium";
import { syncPremiumSessionUser } from "@/lib/auth/premium-session";
import {
  getCurrentEventTimeInputMin,
  getTodayEventDateInputMin,
  isPastEventDateTime,
} from "@/lib/events/dates";
import { optimizeEventImageFile } from "@/lib/events/optimizeImage";
import EventVisual from "@/components/events/EventVisual";
import { FREE_POST_LIMIT, getFreePostCreditsUsed } from "@/lib/events/limits";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

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

interface EventReview {
  id: string;
  event_id: string;
  application_id: string;
  volunteer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

interface ManualPaymentRequest {
  id: string;
  kind: "donation" | "premium";
  status: "pending" | "approved" | "rejected";
  amount_uzs: number;
  user_id: string | null;
  payer_name: string | null;
  payer_email: string | null;
  contact_phone: string | null;
  transfer_reference: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_path: string | null;
  note: string | null;
  created_at: string;
}

type ManagedEventPayload = {
  id: string;
  title: string;
  location: string;
  date: string;
  category?: string | null;
  volunteers_needed?: number | null;
  premium_priority?: boolean | null;
  image_url?: string | null;
  description?: string | null;
};

export default function Dashboard() {
  const { pick } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [freePostCreditsUsed, setFreePostCreditsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myEvents, setMyEvents] = useState<DashboardEvent[]>([]);
  const [eventApplications, setEventApplications] = useState<EventApplication[]>([]);
  const [eventReports, setEventReports] = useState<EventReport[]>([]);
  const [eventReviews, setEventReviews] = useState<EventReview[]>([]);
  const [manualPaymentRequests, setManualPaymentRequests] = useState<ManualPaymentRequest[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canReviewManualPayments, setCanReviewManualPayments] = useState(false);
  const [manualPaymentsLoading, setManualPaymentsLoading] = useState(false);
  const [applicationsMissingSetup, setApplicationsMissingSetup] = useState(false);
  const [reportsMissingSetup, setReportsMissingSetup] = useState(false);
  const [reviewsMissingSetup, setReviewsMissingSetup] = useState(false);
  const [applicationActionId, setApplicationActionId] = useState<string | null>(null);
  const [manualPaymentActionId, setManualPaymentActionId] = useState<string | null>(null);
  
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

  const supabase = useMemo(() => getBrowserSupabaseClient(), []);
  const supabaseUnavailableMessage = pick({
    ru: "Сервис временно недоступен. Попробуйте позже.",
    en: "The service is temporarily unavailable. Please try again later.",
    uz: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      if (!supabase) {
        setUser(null);
        setMyEvents([]);
        setEventApplications([]);
        setEventReports([]);
        setEventReviews([]);
        setManualPaymentRequests([]);
        setCanReviewManualPayments(false);
        setError(supabaseUnavailableMessage);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth/login");
        return;
      }
      const currentUser = await syncPremiumSessionUser(supabase, session.user);
      if (!currentUser) {
        router.push("/auth/login");
        return;
      }

      setUser(currentUser);
      setFreePostCreditsUsed(getFreePostCreditsUsed(currentUser));

      const { data: eventsData } = await supabase
        .from("events")
        .select("id, title, location, date, category, volunteers_needed, premium_priority, image_url, description")
        .eq("user_id", currentUser.id)
        .order('created_at', { ascending: false });

      const preparedEvents = (eventsData ?? []) as DashboardEvent[];
      setMyEvents(preparedEvents);

      if (preparedEvents.length === 0) {
        setEventApplications([]);
        setEventReports([]);
        setEventReviews([]);
        setApplicationsMissingSetup(false);
        setReportsMissingSetup(false);
        setReviewsMissingSetup(false);
        return;
      }

      const eventIds = preparedEvents.map((event) => event.id);
      const [applicationsResponse, reportsResponse, reviewsResponse] = await Promise.all([
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
        supabase
          .from("event_reviews")
          .select("id, event_id, application_id, volunteer_id, rating, comment, created_at, updated_at")
          .eq("target_id", currentUser.id)
          .eq("target_role", "organizer")
          .in("event_id", eventIds)
          .order("updated_at", { ascending: false }),
      ]);
      const { data: applicationsData, error: applicationsError } = applicationsResponse;
      const { data: reportsData, error: reportsError } = reportsResponse;
      const { data: reviewsData, error: reviewsError } = reviewsResponse;

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

      if (reviewsError) {
        const reviewsSetupMissing =
          /event_reviews/i.test(reviewsError.message) &&
          /relation|table|schema cache|does not exist|PGRST/i.test(reviewsError.message);
        if (reviewsSetupMissing) {
          setReviewsMissingSetup(true);
          setEventReviews([]);
        } else {
          console.error("Error loading reviews:", reviewsError.message);
          setReviewsMissingSetup(false);
        }
      } else {
        setReviewsMissingSetup(false);
        setEventReviews((reviewsData ?? []) as EventReview[]);
      }
    } catch (err: unknown) {
      console.error("Error loading dashboard:", err);
      setError(
        err instanceof Error
          ? err.message
          : pick({
              ru: "Не удалось загрузить кабинет.",
              en: "Could not load the dashboard.",
              uz: "Kabinetni yuklab bo'lmadi.",
            }),
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, router, pick, supabaseUnavailableMessage]);

  const dateLocale = pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" });
  const categoryOptions = getEventCategoryOptions(pick);
  const isPremium = hasPremiumAccess(user);
  const postsLeftForFree = Math.max(0, FREE_POST_LIMIT - freePostCreditsUsed);
  const reachedFreeLimit = !isPremium && freePostCreditsUsed >= FREE_POST_LIMIT;
  const minimumEventDate = getTodayEventDateInputMin();
  const minimumEventTime = formData.date === minimumEventDate ? getCurrentEventTimeInputMin() : undefined;
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
  const missingReviewsHint = pick({
    ru: "Таблица отзывов не найдена. Выполните SQL из файла database/event_reviews.sql.",
    en: "Reviews table is missing. Run SQL from database/event_reviews.sql.",
    uz: "Sharhlar jadvali topilmadi. database/event_reviews.sql faylidagi SQL ni ishga tushiring.",
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

  const reviewStats = useMemo(() => {
    const totalReviews = eventReviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round((eventReviews.reduce((sum, item) => sum + item.rating, 0) / totalReviews) * 10) / 10
        : 0;
    const fiveStarCount = eventReviews.filter((item) => item.rating === 5).length;

    return {
      totalReviews,
      averageRating,
      fiveStarCount,
      recentReviews: eventReviews.slice(0, 3),
    };
  }, [eventReviews]);

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
    if (status === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (status === "rejected") return "bg-red-50 text-red-600 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    if (status === "approved") return pick({ ru: "Принята", en: "Approved", uz: "Tasdiqlangan" });
    if (status === "rejected") return pick({ ru: "Отклонена", en: "Rejected", uz: "Rad etilgan" });
    return pick({ ru: "Ожидает", en: "Pending", uz: "Kutilmoqda" });
  };

  const openCreateModal = () => {
    if (user && !hasRequiredPhone(user)) {
      router.push(buildCompleteProfilePath("/dashboard"));
      return;
    }

    if (reachedFreeLimit) {
      showAlertModal(
        pick({ ru: "Лимит достигнут", en: "Limit reached", uz: "Limitga yetildi" }),
        pick({
          ru: `Free-тариф даёт ${FREE_POST_LIMIT} публикационных слотов за всё время. Удаление не возвращает слот. Для новых объявлений нужен Premium.`,
          en: `The free plan includes ${FREE_POST_LIMIT} lifetime publication slots. Deleting a post does not return a slot. Upgrade to Premium for more.`,
          uz: `Free tarif ${FREE_POST_LIMIT} ta umrboqiy e'lon slotini beradi. O'chirish slotni qaytarmaydi. Yangi e'lonlar uchun Premium kerak.`,
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
      "event_id", "event_title", "approved_count", "attended_count", "actual_attendees",
      "hours_per_volunteer", "volunteer_hours", "outcome_text", "outcome_value", "outcome_unit", "updated_at",
    ];

    const rows = myEvents.map((event) => {
      const approvedCount = eventApplications.filter((item) => item.event_id === event.id && item.status === "approved").length;
      const attendedCount = eventApplications.filter((item) => item.event_id === event.id && item.status === "approved" && item.attended === true).length;
      const report = reportByEventId.get(event.id);
      const actualAttendees = report?.actual_attendees ?? "";
      const hoursPerVolunteer = report?.hours_per_volunteer ?? "";
      const attendeeBase = report?.actual_attendees && report.actual_attendees > 0 ? report.actual_attendees : attendedCount;
      const volunteerHours = report?.hours_per_volunteer && Number(report.hours_per_volunteer) > 0 ? attendeeBase * Number(report.hours_per_volunteer) : "";

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

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        return;
      }
      void fetchData();
    });
    return () => { subscription.unsubscribe(); };
  }, [fetchData, supabase]);

  useEffect(() => {
    if (!user?.email) {
      setIsAdmin(false);
      setCanReviewManualPayments(false);
      setManualPaymentRequests([]);
      setManualPaymentsLoading(false);
      return;
    }

    let cancelled = false;

    const loadManualPaymentRequests = async () => {
      try {
        const adminStatusResponse = await fetch("/api/admin/status", { cache: "no-store" });
        const adminStatusPayload = (await adminStatusResponse.json().catch(() => null)) as { isAdmin?: boolean } | null;
        const nextIsAdmin = adminStatusPayload?.isAdmin === true;
        setIsAdmin(nextIsAdmin);

        if (!nextIsAdmin) {
          setCanReviewManualPayments(false);
          setManualPaymentRequests([]);
          return;
        }

        setManualPaymentsLoading(true);
        const response = await fetch("/api/manual-payments/review", { method: "GET", cache: "no-store" });
        const payload = (await response.json().catch(() => null)) as { requests?: ManualPaymentRequest[]; error?: string } | null;

        if (cancelled) return;

        if (response.status === 403) {
          setCanReviewManualPayments(false);
          setManualPaymentRequests([]);
          return;
        }

        if (!response.ok) throw new Error(payload?.error || "Could not load manual payment requests.");

        setIsAdmin(true);
        setCanReviewManualPayments(true);
        setManualPaymentRequests(payload?.requests ?? []);
      } catch (error) {
        if (cancelled) return;
        console.error("Error loading manual payment requests:", error);
        setIsAdmin(false);
        setCanReviewManualPayments(false);
        setManualPaymentRequests([]);
      } finally {
        if (!cancelled) setManualPaymentsLoading(false);
      }
    };

    void loadManualPaymentRequests();
    return () => { cancelled = true; };
  }, [user?.email]);

  const getManualPaymentKindLabel = (kind: ManualPaymentRequest["kind"]) => {
    return kind === "premium"
      ? pick({ ru: "Premium", en: "Premium", uz: "Premium" })
      : pick({ ru: "Донат", en: "Donation", uz: "Xayriya" });
  };

  const getManualPaymentKindClassName = (kind: ManualPaymentRequest["kind"]) => {
    return kind === "premium"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-emerald-200 bg-emerald-50 text-emerald-700";
  };

  const formatCurrency = (value: number) => `${value.toLocaleString(dateLocale)} UZS`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const upsertLocalEvent = useCallback((savedEvent: ManagedEventPayload) => {
    const normalizedEvent: DashboardEvent = {
      id: savedEvent.id,
      title: savedEvent.title,
      location: savedEvent.location,
      date: savedEvent.date,
      category: savedEvent.category ?? null,
      volunteers_needed: savedEvent.volunteers_needed ?? null,
      premium_priority: savedEvent.premium_priority ?? null,
      image_url: savedEvent.image_url ?? null,
      description: savedEvent.description ?? null,
    };

    setMyEvents((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === normalizedEvent.id);
      if (existingIndex === -1) return [normalizedEvent, ...prev];
      const next = [...prev];
      next[existingIndex] = normalizedEvent;
      return next;
    });
  }, []);

  const openDeleteModal = (id: string, title: string) => setDeleteModal({ isOpen: true, id, title });
  const closeDeleteModal = () => setDeleteModal({ isOpen: false, id: null, title: "" });

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", deleteModal.id);
      if (error) throw error;
      setMyEvents((prev) => prev.filter((event) => event.id !== deleteModal.id));
      closeDeleteModal();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(pick({ ru: "Ошибка при удалении", en: "Delete error", uz: "O'chirish xatosi" }), message, "error");
    }
  };

  const handleApplicationStatusUpdate = async (application: EventApplication, nextStatus: "approved" | "rejected") => {
    try {
      setApplicationActionId(application.id);
      const reviewedAt = new Date().toISOString();
      const { error } = await supabase.from("event_applications").update({ status: nextStatus, reviewed_at: reviewedAt }).eq("id", application.id);

      if (error) {
        if (isMissingApplicationsTableError(error.message)) {
          setApplicationsMissingSetup(true);
          showAlertModal(pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }), missingApplicationsHint, "warning");
          return;
        }
        throw error;
      }

      setEventApplications((prev) => prev.map((item) => item.id === application.id ? { ...item, status: nextStatus, reviewed_at: reviewedAt } : item));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(pick({ ru: "Ошибка обновления", en: "Update error", uz: "Yangilash xatosi" }), message, "error");
    } finally {
      setApplicationActionId(null);
    }
  };

  const handleAttendanceToggle = async (application: EventApplication, nextAttended: boolean) => {
    try {
      setApplicationActionId(application.id);
      const nextCheckedInAt = nextAttended ? new Date().toISOString() : null;
      const { error } = await supabase.from("event_applications").update({ attended: nextAttended, checked_in_at: nextCheckedInAt }).eq("id", application.id);

      if (error) {
        if (isMissingAttendanceColumnsError(error.message)) {
          showAlertModal(pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }), missingApplicationsHint, "warning");
          return;
        }
        throw error;
      }

      setEventApplications((prev) => prev.map((item) => item.id === application.id ? { ...item, attended: nextAttended, checked_in_at: nextCheckedInAt } : item));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(pick({ ru: "Ошибка отметки посещения", en: "Attendance update error", uz: "Qatnashuvni yangilash xatosi" }), message, "error");
    } finally {
      setApplicationActionId(null);
    }
  };

  const handleManualPaymentReview = async (paymentRequest: ManualPaymentRequest, action: "approve" | "reject") => {
    try {
      setManualPaymentActionId(paymentRequest.id);
      const response = await fetch("/api/manual-payments/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: paymentRequest.id, action }),
      });

      const payload = (await response.json().catch(() => null)) as { request?: ManualPaymentRequest; error?: string } | null;

      if (!response.ok || !payload?.request) {
        throw new Error(payload?.error || pick({ ru: "Не удалось обработать заявку.", en: "Could not process the request.", uz: "So'rovni qayta ishlab bo'lmadi." }));
      }

      setManualPaymentRequests((prev) => prev.filter((item) => item.id !== paymentRequest.id));

      if (action === "approve" && paymentRequest.kind === "premium" && paymentRequest.user_id === user?.id) {
        await supabase.auth.refreshSession();
        await fetchData();
      }

      showAlertModal(
        action === "approve" ? pick({ ru: "Платёж подтверждён", en: "Payment approved", uz: "To'lov tasdiqlandi" }) : pick({ ru: "Платёж отклонён", en: "Payment rejected", uz: "To'lov rad etildi" }),
        action === "approve"
          ? pick({ ru: paymentRequest.kind === "premium" ? "Premium будет активирован для владельца заявки." : "Донат отмечен как подтверждённый.", en: paymentRequest.kind === "premium" ? "Premium will be activated for the request owner." : "The donation has been marked as confirmed.", uz: paymentRequest.kind === "premium" ? "Premium so'rov egasi uchun yoqiladi." : "Xayriya tasdiqlangan deb belgilandi." })
          : pick({ ru: "Заявка помечена как отклонённая.", en: "The request has been marked as rejected.", uz: "So'rov rad etilgan deb belgilandi." }),
        action === "approve" ? "success" : "warning"
      );
    } catch (error) {
      showAlertModal(pick({ ru: "Ошибка модерации", en: "Moderation error", uz: "Moderatsiya xatosi" }), error instanceof Error ? error.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" }), "error");
    } finally {
      setManualPaymentActionId(null);
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
      date: isValidDate ? `${eventDate.getFullYear()}-${pad2(eventDate.getMonth() + 1)}-${pad2(eventDate.getDate())}` : "",
      time: isValidDate ? `${pad2(eventDate.getHours())}:${pad2(eventDate.getMinutes())}` : "",
      description: event.description || ""
    });
    setImagePreview(event.image_url);
    setIsModalOpen(true);
  };

  const openReportModal = (event: DashboardEvent) => {
    const report = reportByEventId.get(event.id);
    const approvedCount = eventApplications.filter((item) => item.event_id === event.id && item.status === "approved").length;

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
    setReportModal({ isOpen: false, eventId: null, eventTitle: "", actualAttendees: "0", hoursPerVolunteer: "1", outcomeText: "", outcomeValue: "", outcomeUnit: "" });
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !reportModal.eventId) return;

    const parsedAttendees = Number(reportModal.actualAttendees);
    const parsedHours = Number(reportModal.hoursPerVolunteer);
    const outcomeValueRaw = reportModal.outcomeValue.trim();
    const parsedOutcomeValue = outcomeValueRaw.length > 0 ? Number(outcomeValueRaw) : null;

    if (!Number.isFinite(parsedAttendees) || parsedAttendees < 0) {
      showAlertModal(pick({ ru: "Проверьте данные", en: "Check your input", uz: "Ma'lumotlarni tekshiring" }), pick({ ru: "Фактическое количество участников должно быть 0 или больше.", en: "Actual attendees must be 0 or greater.", uz: "Amaldagi ishtirokchilar soni 0 yoki undan katta bo'lishi kerak." }), "warning");
      return;
    }

    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      showAlertModal(pick({ ru: "Проверьте данные", en: "Check your input", uz: "Ma'lumotlarni tekshiring" }), pick({ ru: "Часы на волонтёра должны быть больше 0.", en: "Hours per volunteer must be greater than 0.", uz: "Har bir volontyor uchun soat 0 dan katta bo'lishi kerak." }), "warning");
      return;
    }

    if (parsedOutcomeValue !== null && (!Number.isFinite(parsedOutcomeValue) || parsedOutcomeValue < 0)) {
      showAlertModal(pick({ ru: "Проверьте данные", en: "Check your input", uz: "Ma'lumotlarni tekshiring" }), pick({ ru: "Impact value должен быть числом 0 или больше.", en: "Impact value must be a number 0 or greater.", uz: "Impact qiymati 0 yoki undan katta son bo'lishi kerak." }), "warning");
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

      const { data, error } = await supabase.from("event_reports").upsert(payload, { onConflict: "event_id" }).select("id, event_id, organizer_id, actual_attendees, hours_per_volunteer, outcome_text, outcome_value, outcome_unit, created_at, updated_at").single();

      if (error) {
        if (isMissingReportsTableError(error.message)) {
          setReportsMissingSetup(true);
          showAlertModal(pick({ ru: "Нужна настройка базы", en: "Database setup required", uz: "Baza sozlamasi kerak" }), missingReportsHint, "warning");
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
      showAlertModal(pick({ ru: "Impact-отчёт сохранён", en: "Impact report saved", uz: "Impact hisobot saqlandi" }), pick({ ru: "Данные обновлены и уже учтены в аналитике.", en: "Data is updated and already included in analytics.", uz: "Ma'lumotlar yangilandi va analyticsda hisobga olindi." }), "success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlertModal(pick({ ru: "Ошибка сохранения отчёта", en: "Report save error", uz: "Hisobotni saqlash xatosi" }), message, "error");
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
      if (!user) throw new Error(pick({ ru: "Пользователь не найден. Перезайдите в аккаунт.", en: "User not found. Please sign in again.", uz: "Foydalanuvchi topilmadi. Qayta kirib ko'ring." }));
      if (!editingId && !hasRequiredPhone(user)) { router.push(buildCompleteProfilePath("/dashboard")); return; }
      if (!editingId && reachedFreeLimit) throw new Error(pick({ ru: `Вы достигли лимита free-тарифа: ${FREE_POST_LIMIT} публикационных слотов за всё время.`, en: `You reached the free plan limit: ${FREE_POST_LIMIT} lifetime publication slots.`, uz: `Siz free tarif limitiga yetdingiz: jami ${FREE_POST_LIMIT} ta e'lon sloti.` }));

      let finalImageUrl = imagePreview;
      const volunteersNeeded = normalizeVolunteerCount(formData.volunteersNeeded);
      if (!volunteersNeeded) throw new Error(pick({ ru: "Укажите корректное количество волонтёров (минимум 1).", en: "Please provide a valid volunteer count (minimum 1).", uz: "Volontyorlar sonini to'g'ri kiriting (kamida 1)." }));

      const combinedDateTime = `${formData.date}T${formData.time}:00`;
      if (isPastEventDateTime(combinedDateTime)) throw new Error(pick({ ru: "Дата и время события не могут быть в прошлом.", en: "The event date and time cannot be in the past.", uz: "Tadbir sana va vaqti o'tgan bo'lishi mumkin emas." }));

      if (imageFile) {
        const optimizedImage = await optimizeEventImageFile(imageFile);
        const fileExt = optimizedImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, optimizedImage);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('event-images').getPublicUrl(filePath);
        finalImageUrl = publicUrl;
      }

      const response = await fetch("/api/events/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: editingId,
          title: formData.title,
          category: normalizeEventCategory(formData.category),
          volunteersNeeded,
          location: formData.location,
          date: combinedDateTime,
          imageUrl: finalImageUrl,
          description: formData.description,
        }),
      });

      const result = (await response.json().catch(() => null)) as | { event?: ManagedEventPayload; error?: string; consumedFreePostCredit?: boolean; majorChange?: boolean; missingColumnsFallback?: boolean; quota?: { freePostsUsed: number; postsLeft: number } | null } | null;

      if (!response.ok) throw new Error(result?.error || pick({ ru: "Не удалось сохранить событие.", en: "Could not save the event.", uz: "Tadbirni saqlab bo'lmadi." }));

      const usedFallbackWithoutNewColumns = result?.missingColumnsFallback === true;
      if (result?.quota) {
        setFreePostCreditsUsed(result.quota.freePostsUsed);
        setUser((prev) => prev ? { ...prev, user_metadata: { ...(prev.user_metadata ?? {}), free_post_credits_used: result.quota?.freePostsUsed }, app_metadata: { ...(prev.app_metadata ?? {}), free_post_credits_used: result.quota?.freePostsUsed } } : prev);
        void supabase.auth.refreshSession();
      }

      if (result?.event) upsertLocalEvent(result.event);

      closeAndReset();
      if (usedFallbackWithoutNewColumns) {
        showAlertModal(pick({ ru: "Событие сохранено", en: "Event saved", uz: "Tadbir saqlandi" }), missingColumnsHint, "warning");
      } else if (!isPremium && result?.consumedFreePostCredit) {
        showAlertModal(
          pick({ ru: "Слот учтён", en: "Slot counted", uz: "Slot hisoblandi" }),
          result.majorChange
            ? pick({ ru: `Изменение ключевых полей засчитано как новое объявление. Использовано ${result.quota?.freePostsUsed ?? freePostCreditsUsed} из ${FREE_POST_LIMIT} слотов.`, en: `Changing key fields counted as a new listing. Used ${result.quota?.freePostsUsed ?? freePostCreditsUsed} of ${FREE_POST_LIMIT} slots.`, uz: `Asosiy maydonlarni o'zgartirish yangi e'lon sifatida hisoblandi. ${FREE_POST_LIMIT} slotdan ${result.quota?.freePostsUsed ?? freePostCreditsUsed} tasi ishlatildi.` })
            : pick({ ru: `Объявление опубликовано. Использовано ${result.quota?.freePostsUsed ?? freePostCreditsUsed} из ${FREE_POST_LIMIT} слотов.`, en: `Listing published. Used ${result.quota?.freePostsUsed ?? freePostCreditsUsed} of ${FREE_POST_LIMIT} slots.`, uz: `E'lon joylandi. ${FREE_POST_LIMIT} slotdan ${result.quota?.freePostsUsed ?? freePostCreditsUsed} tasi ishlatildi.` }),
          "info"
        );
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      const message = isMissingNewColumnsError(rawMessage) ? missingColumnsHint : rawMessage;
      showAlertModal(pick({ ru: "Ошибка", en: "Error", uz: "Xatolik" }), message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
        <p className="text-sm text-slate-500">{pick({ ru: "Загрузка...", en: "Loading...", uz: "Yuklanmoqda..." })}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center gap-4">
        <XCircle className="h-12 w-12 text-red-400" />
        <h1 className="text-xl font-bold text-slate-900">{pick({ ru: "Кабинет временно недоступен", en: "Dashboard is temporarily unavailable", uz: "Kabinet vaqtincha mavjud emas" })}</h1>
        <p className="max-w-md text-sm text-slate-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden">
      
      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 my-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? pick({ ru: "Изменить событие", en: "Edit Event", uz: "Tadbirni tahrirlash" }) : pick({ ru: "Создать событие", en: "Create Event", uz: "Tadbir yaratish" })}
                </h2>
                <button onClick={closeAndReset} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>

              {!isPremium ? (
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                  {editingId
                    ? pick({ ru: "Изменение названия, категории, места, даты или числа волонтёров использует ещё один слот.", en: "Changing key fields uses another slot on the free plan.", uz: "Asosiy maydonlarni o'zgartirish yana bitta slot ishlatadi." })
                    : pick({ ru: "Удаление объявления слот не возвращает.", en: "Deleting a listing does not return a slot.", uz: "E'lonni o'chirish slotni qaytarmaydi." })}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{pick({ ru: "Фотография", en: "Photo", uz: "Rasm" })}</label>
                  <div className="relative h-32 w-full bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center overflow-hidden hover:border-emerald-400 transition-colors cursor-pointer group">
                    {imagePreview ? (
                      <Image src={imagePreview} className="object-cover" alt="Preview" fill sizes="100vw" unoptimized />
                    ) : (
                      <div className="flex flex-col items-center text-slate-400 group-hover:text-emerald-500">
                        <ImageIcon size={24} className="mb-2" />
                        <span className="text-xs">{pick({ ru: "Выбрать файл", en: "Select file", uz: "Fayl tanlash" })}</span>
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Название", en: "Title", uz: "Nomi" })}</label>
                  <input required value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder={pick({ ru: "Название события", en: "Event title", uz: "Tadbir nomi" })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Категория", en: "Category", uz: "Kategoriya" })}</label>
                    <select required value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                      {categoryOptions.map((option) => (<option key={option.value} value={option.value}>{option.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Нужно волонтёров", en: "Volunteers Needed", uz: "Kerakli volontyorlar" })}</label>
                    <input required min={1} type="number" value={formData.volunteersNeeded} onChange={(e) => setFormData({ ...formData, volunteersNeeded: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="10" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Дата", en: "Date", uz: "Sana" })}</label>
                    <input required type="date" min={minimumEventDate} value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Время", en: "Time", uz: "Vaqt" })}</label>
                    <input required type="time" min={minimumEventTime} value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                  </div>
                </div>
                <p className="text-xs text-slate-500">{pick({ ru: "Событие можно назначить только на текущее или будущее время.", en: "Events can only be scheduled for the current or a future time.", uz: "Tadbirni faqat hozirgi yoki kelajakdagi vaqtga belgilash mumkin." })}</p>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Место", en: "Location", uz: "Joylashuv" })}</label>
                  <input required value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder={pick({ ru: "Локация", en: "Location", uz: "Joylashuv" })} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Описание", en: "Description", uz: "Tavsif" })}</label>
                  <textarea rows={4} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder={pick({ ru: "Расскажите подробнее о задаче...", en: "Describe the task in more detail...", uz: "Vazifa haqida batafsil yozing..." })} />
                </div>

                <button disabled={isSubmitting} type="submit" className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors disabled:bg-slate-300 mt-2">
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : editingId ? pick({ ru: "Обновить", en: "Update", uz: "Yangilash" }) : pick({ ru: "Опубликовать", en: "Publish", uz: "E'lon qilish" })}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {reportModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 my-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="text-xs font-medium text-amber-600">{pick({ ru: "Impact отчёт", en: "Impact report", uz: "Impact hisobot" })}</p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1 line-clamp-2">{reportModal.eventTitle}</h2>
                </div>
                <button onClick={closeReportModal} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
              </div>

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Фактические участники", en: "Actual attendees", uz: "Amaldagi ishtirokchilar" })}</label>
                    <input type="number" min={0} required value={reportModal.actualAttendees} onChange={(e) => setReportModal((prev) => ({ ...prev, actualAttendees: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Часы на человека", en: "Hours per person", uz: "Har biriga soat" })}</label>
                    <input type="number" min={0.1} step={0.1} required value={reportModal.hoursPerVolunteer} onChange={(e) => setReportModal((prev) => ({ ...prev, hoursPerVolunteer: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Результат события", en: "Event outcome", uz: "Tadbir natijasi" })}</label>
                  <textarea rows={3} value={reportModal.outcomeText} onChange={(e) => setReportModal((prev) => ({ ...prev, outcomeText: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none resize-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder={pick({ ru: "Например: очищена территория парка, собрано 120 кг мусора...", en: "Example: park territory cleaned, 120kg of waste collected...", uz: "Masalan: bog' hududi tozalandi, 120kg chiqindi yig'ildi..." })} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Impact value", en: "Impact value", uz: "Impact qiymat" })}</label>
                    <input type="number" min={0} value={reportModal.outcomeValue} onChange={(e) => setReportModal((prev) => ({ ...prev, outcomeValue: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="120" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">{pick({ ru: "Единица", en: "Unit", uz: "Birlik" })}</label>
                    <input value={reportModal.outcomeUnit} onChange={(e) => setReportModal((prev) => ({ ...prev, outcomeUnit: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder={pick({ ru: "кг, людей, наборов...", en: "kg, people, kits...", uz: "kg, odam, to'plam..." })} />
                  </div>
                </div>

                <button disabled={isReportSubmitting} type="submit" className="w-full bg-amber-500 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-amber-600 transition-colors disabled:bg-slate-300 mt-2">
                  {isReportSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : pick({ ru: "Сохранить отчёт", en: "Save report", uz: "Hisobotni saqlash" })}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-8">
        
        {/* Header Section */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shrink-0">
                <Heart className="h-6 w-6 fill-current" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">VoloHero</h1>
                <p className="text-sm text-slate-500 mt-1">{pick({ ru: "Кабинет", en: "Dashboard", uz: "Kabinet" })}: {user?.user_metadata?.full_name?.split(" ")[0]}</p>
              </div>
              <span className={`ml-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${isPremium ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                {isPremium ? <Crown className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                {isPremium ? "Premium" : "Free"}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={openCreateModal} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <PlusCircle size={16} /> {pick({ ru: "Создать пост", en: "Create Post", uz: "Post yaratish" })}
              </button>
              <Link href="/premium" className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                {isPremium ? pick({ ru: "Premium", en: "Premium", uz: "Premium" }) : pick({ ru: "Открыть Premium", en: "Open Premium", uz: "Premiumni ochish" })}
              </Link>
              {isAdmin && (
                <Link href="/admin" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                  <BarChart3 size={16} /> Admin
                </Link>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">{pick({ ru: "Мои события", en: "My events", uz: "Mening tadbirlarim" })}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{myEvents.length}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-medium text-amber-600">{pick({ ru: "Ожидают решения", en: "Pending review", uz: "Ko'rib chiqilmoqda" })}</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{applicationsStats.pending}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-xs font-medium text-emerald-600">{pick({ ru: "Средний рейтинг", en: "Average rating", uz: "O'rtacha reyting" })}</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{reviewStats.totalReviews > 0 ? reviewStats.averageRating.toFixed(1) : "—"}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500">{pick({ ru: "Impact отчёты", en: "Impact reports", uz: "Impact hisobotlar" })}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{impactStats.reportsCount}</p>
            </div>
          </div>
        </section>

        {/* Manual Payments (Admin) */}
        {canReviewManualPayments && (
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{pick({ ru: "Ручные платежи", en: "Manual payments", uz: "Qo'lda to'lovlar" })}</h3>
                <p className="text-sm text-slate-500 mt-1">{pick({ ru: "Ожидают подтверждения", en: "Pending confirmation", uz: "Tasdiqlanishi kutilmoqda" })}: {manualPaymentRequests.length}</p>
              </div>
            </div>

            {manualPaymentsLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-emerald-500" /></div>
            ) : manualPaymentRequests.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">{pick({ ru: "Нет новых заявок", en: "No manual payments waiting", uz: "Tekshiruvni kutayotgan so'rov yo'q" })}</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {manualPaymentRequests.map((req) => (
                  <article key={req.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getManualPaymentKindClassName(req.kind)}`}>{getManualPaymentKindLabel(req.kind)}</span>
                      <span className="text-xs text-slate-400">{new Date(req.created_at).toLocaleString(dateLocale)}</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(req.amount_uzs)}</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">{pick({ ru: "Плательщик", en: "Payer", uz: "To'lovchi" })}</p>
                        <p className="font-medium text-slate-900 truncate">{req.payer_name || "—"}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">{pick({ ru: "Контакт", en: "Contact", uz: "Kontakt" })}</p>
                        <p className="font-medium text-slate-900 truncate">{req.payer_email || req.contact_phone || "—"}</p>
                      </div>
                    </div>

                    {req.transfer_reference && (
                      <div className="bg-white rounded-lg p-3 border border-slate-100 text-sm">
                        <p className="text-xs text-slate-500 mb-1">{pick({ ru: "Как найти перевод", en: "Reference", uz: "O'tkazma ma'lumoti" })}</p>
                        <p className="text-slate-700">{req.transfer_reference}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button onClick={() => handleManualPaymentReview(req, "approve")} disabled={manualPaymentActionId === req.id} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors">
                        {manualPaymentActionId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {pick({ ru: "Подтвердить", en: "Approve", uz: "Tasdiqlash" })}
                      </button>
                      <button onClick={() => handleManualPaymentReview(req, "reject")} disabled={manualPaymentActionId === req.id} className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors">
                        {manualPaymentActionId === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} {pick({ ru: "Отклонить", en: "Reject", uz: "Rad etish" })}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Premium Analytics */}
        {isPremium ? (
          <section className="bg-white border border-amber-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><Crown className="w-5 h-5 text-amber-500" /> {pick({ ru: "Расширенная аналитика", en: "Advanced analytics", uz: "Kengaytirilgan tahlil" })}</h3>
              </div>
              <button onClick={handleExportCsv} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> CSV
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Всего событий", en: "Total events", uz: "Jami tadbirlar" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{premiumStats.totalEvents}</p></div>
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Предстоящие", en: "Upcoming", uz: "Kutilayotgan" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{premiumStats.upcomingCount}</p></div>
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Требуется волонтёров", en: "Volunteers needed", uz: "Kerakli volontyorlar" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{premiumStats.totalVolunteersNeeded}</p></div>
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Топ категория", en: "Top category", uz: "Eng faol kategoriya" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{premiumStats.topCategory ? getEventCategoryLabel(premiumStats.topCategory, pick) : "—"}</p></div>
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Ближайшее событие", en: "Nearest event", uz: "Eng yaqin tadbir" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{premiumStats.nearestEventDate ? new Date(premiumStats.nearestEventDate).toLocaleDateString(dateLocale) : "—"}</p></div>
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Средний размер команды", en: "Avg team size", uz: "O'rtacha jamoa" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{premiumStats.averageTeamSize}</p></div>
            </div>
          </section>
        ) : (
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <Lock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-slate-900">{pick({ ru: "Free план", en: "Free plan", uz: "Free tarif" })}</p>
                <p className="text-sm text-slate-500 mt-1">{pick({ ru: `Использовано слотов: ${freePostCreditsUsed} из ${FREE_POST_LIMIT}. Осталось: ${postsLeftForFree}.`, en: `Slots used: ${freePostCreditsUsed} of ${FREE_POST_LIMIT}. Remaining: ${postsLeftForFree}.`, uz: `Ishlatilgan slotlar: ${freePostCreditsUsed} / ${FREE_POST_LIMIT}. Qolgani: ${postsLeftForFree}.` })}</p>
                <Link href="/premium" className="mt-3 inline-flex items-center bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">{pick({ ru: "Смотреть Premium", en: "View Premium", uz: "Premiumni ko'rish" })}</Link>
              </div>
            </div>
          </section>
        )}

        {/* Impact Analytics */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-emerald-500" /> {pick({ ru: "Impact аналитика", en: "Impact analytics", uz: "Impact analitika" })}</h3>
            {isPremium && (
              <button onClick={handleExportImpactCsv} className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Impact CSV
              </button>
            )}
          </div>

          {reportsMissingSetup && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">{missingReportsHint}</div>}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Одобренные заявки", en: "Approved", uz: "Tasdiqlangan" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{impactStats.approvedTotal}</p></div>
            <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Отмечено присутствие", en: "Attended", uz: "Qatnashgan" })}</p><p className="text-2xl font-bold text-emerald-600 mt-1">{impactStats.attendedTotal}</p></div>
            <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "No-show", en: "No-show", uz: "No-show" })}</p><p className="text-2xl font-bold text-red-500 mt-1">{impactStats.noShowTotal}</p></div>
            
            {isPremium ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs text-amber-600">{pick({ ru: "Волонтёр-часы", en: "Volunteer hours", uz: "Volontyor-soatlar" })}</p><p className="text-2xl font-bold text-amber-700 mt-1">{impactStats.volunteerHours}</p></div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs text-amber-600">{pick({ ru: "Attendance rate", en: "Attendance rate", uz: "Attendance rate" })}</p><p className="text-2xl font-bold text-amber-700 mt-1">{impactStats.attendanceRate}%</p></div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-xs text-amber-600">{pick({ ru: "Impact отчёты", en: "Reports", uz: "Hisobotlar" })}</p><p className="text-2xl font-bold text-amber-700 mt-1">{impactStats.reportsCount}</p></div>
              </>
            ) : (
              <div className="col-span-2 md:col-span-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center text-sm text-slate-500">
                {pick({ ru: "Premium откроет волонтёр-часы, attendance rate и экспорт отчётов.", en: "Premium unlocks volunteer hours, attendance rate, and report export.", uz: "Premium volontyor-soatlar va hisobot eksportini ochadi." })}
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-emerald-500" /> {pick({ ru: "Отзывы и рейтинг", en: "Reviews and rating", uz: "Sharhlar va reyting" })}</h3>

          {reviewsMissingSetup ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">{missingReviewsHint}</div>
          ) : reviewStats.totalReviews === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">{pick({ ru: "Пока нет отзывов от волонтёров", en: "No volunteer reviews yet", uz: "Hozircha volontyorlardan sharh yo'q" })}</div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Средний рейтинг", en: "Avg rating", uz: "O'rtacha reyting" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{reviewStats.averageRating.toFixed(1)}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Всего отзывов", en: "Total", uz: "Jami" })}</p><p className="text-2xl font-bold text-slate-900 mt-1">{reviewStats.totalReviews}</p></div>
                <div className="bg-slate-50 rounded-xl p-4"><p className="text-xs text-slate-500">{pick({ ru: "Оценок 5/5", en: "5/5 ratings", uz: "5/5 baholar" })}</p><p className="text-2xl font-bold text-amber-600 mt-1">{reviewStats.fiveStarCount}</p></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reviewStats.recentReviews.map((review) => (
                  <article key={review.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-2">{eventTitleMap.get(review.event_id) ?? pick({ ru: "Событие", en: "Event", uz: "Tadbir" })}</p>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, index) => (<Star key={index} className={`w-4 h-4 ${index < review.rating ? "fill-current" : "text-slate-200"}`} />))}
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{review.comment || pick({ ru: "Без комментария", en: "No comment", uz: "Izohsiz" })}</p>
                    <p className="mt-3 text-xs text-slate-400">{new Date(review.created_at).toLocaleDateString(dateLocale)}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Applications */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-bold text-slate-900">{pick({ ru: "Заявки на участие", en: "Participation requests", uz: "Ishtirok arizalari" })}</h3>
            <div className="flex gap-2">
              <span className="px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-medium text-amber-700">{pick({ ru: "Ожидают", en: "Pending", uz: "Kutilmoqda" })}: {applicationsStats.pending}</span>
              <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">{pick({ ru: "Приняты", en: "Approved", uz: "Tasdiq" })}: {applicationsStats.approved}</span>
              <span className="px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-600">{pick({ ru: "Отклонены", en: "Rejected", uz: "Rad" })}: {applicationsStats.rejected}</span>
            </div>
          </div>

          {applicationsMissingSetup ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">{missingApplicationsHint}</div>
          ) : eventApplications.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-sm text-slate-500">{pick({ ru: "Пока нет заявок", en: "No requests yet", uz: "Hozircha arizalar yo'q" })}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {eventApplications.map((app) => (
                <article key={app.id} className="border border-slate-200 rounded-xl p-5 bg-slate-50">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-medium text-slate-900">{eventTitleMap.get(app.event_id) ?? pick({ ru: "Без названия", en: "Untitled", uz: "Nomsiz" })}</h4>
                      <p className="text-sm text-slate-500 mt-1">{app.volunteer_name || pick({ ru: "Имя не указано", en: "Name not set", uz: "Ism kiritilmagan" })}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(app.status)}`}>
                      {app.status === "pending" && <Clock3 className="w-3 h-3" />}
                      {app.status === "approved" && <Check className="w-3 h-3" />}
                      {app.status === "rejected" && <XCircle className="w-3 h-3" />}
                      {getStatusLabel(app.status)}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-slate-500 mb-4">
                    <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {app.volunteer_email || "—"}</p>
                    <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {app.volunteer_phone || "—"}</p>
                  </div>

                  {app.status === "pending" && (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleApplicationStatusUpdate(app, "approved")} disabled={applicationActionId === app.id} className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">{pick({ ru: "Принять", en: "Approve", uz: "Tasdiqlash" })}</button>
                      <button onClick={() => handleApplicationStatusUpdate(app, "rejected")} disabled={applicationActionId === app.id} className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">{pick({ ru: "Отклонить", en: "Reject", uz: "Rad etish" })}</button>
                    </div>
                  )}
                  {app.status === "approved" && (
                    <button onClick={() => handleAttendanceToggle(app, !(app.attended === true))} disabled={applicationActionId === app.id} className={`w-full py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60 ${app.attended ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                      {app.attended ? pick({ ru: "Снять отметку", en: "Unmark", uz: "Belgini olib tashlash" }) : pick({ ru: "Отметить присутствие", en: "Mark attended", uz: "Qatnashdi" })}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {/* User Posts */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            {pick({ ru: "Ваши публикации", en: "Your Posts", uz: "Sizning e'lonlaringiz" })}
            <span className="text-emerald-600 text-sm font-medium bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">{myEvents.length}</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {myEvents.length > 0 ? (
              myEvents.map((event) => {
                const hasReport = reportByEventId.has(event.id);
                return (
                  <div key={event.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col group hover:shadow-lg transition-shadow">
                    <div className="w-full h-48 relative overflow-hidden bg-slate-100">
                      <EventVisual
                        title={event.title}
                        category={event.category}
                        categoryLabel={getEventCategoryLabel(event.category, pick)}
                        imageUrl={event.image_url}
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-5 flex flex-col justify-between flex-1">
                      <div>
                        <h3 className="font-bold text-slate-900 line-clamp-2">{event.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">{getEventCategoryLabel(event.category, pick)}</span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200 inline-flex items-center gap-1"><Users className="w-3 h-3" />{normalizeVolunteerCount(event.volunteers_needed) ?? "—"}</span>
                          {hasReport && <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200 inline-flex items-center gap-1"><BarChart3 className="w-3 h-3" />Impact</span>}
                        </div>
                        <div className="space-y-1 mt-3 text-xs text-slate-500">
                          <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400" /> {event.location}</p>
                          <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3 text-slate-400" /> {new Date(event.date).toLocaleDateString(dateLocale)}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-slate-100">
                        <button onClick={() => openReportModal(event)} className="text-xs font-medium text-amber-600 hover:text-amber-700 flex items-center gap-1 transition-colors"><BarChart3 size={14} /> {pick({ ru: "Impact", en: "Impact", uz: "Impact" })}</button>
                        <button onClick={() => openEditModal(event)} className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"><Edit3 size={14} /> {pick({ ru: "Изменить", en: "Edit", uz: "Tahrirlash" })}</button>
                        <button onClick={() => openDeleteModal(event.id, event.title)} className="text-xs font-medium text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"><Trash2 size={14} /> {pick({ ru: "Удалить", en: "Delete", uz: "O'chirish" })}</button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center px-6">
                <p className="text-slate-500 mb-6">{pick({ ru: "Список пуст...", en: "No posts yet...", uz: "Ro'yxat bo'sh..." })}</p>
                <button onClick={openCreateModal} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">{pick({ ru: "Создать объявление", en: "Create Post", uz: "E'lon yaratish" })}</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-50 border border-red-100">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900">{pick({ ru: "Удалить объявление?", en: "Delete post?", uz: "E'lonni o'chirish?" })}</h3>
            <p className="text-center text-sm text-slate-500 mt-2 mb-1">{pick({ ru: "Это действие нельзя отменить.", en: "This action cannot be undone.", uz: "Bu amalni ortga qaytarib bo'lmaydi." })}</p>
            <p className="text-center text-sm font-medium text-slate-700 line-clamp-2">{deleteModal.title}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button onClick={closeDeleteModal} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-colors">{pick({ ru: "Отмена", en: "Cancel", uz: "Bekor qilish" })}</button>
              <button onClick={handleDelete} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">{pick({ ru: "Удалить", en: "Delete", uz: "O'chirish" })}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}