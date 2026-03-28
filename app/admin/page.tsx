import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Activity, ArrowUpRight, Crown, ShieldCheck, Users, Wallet } from "lucide-react";
import DonationReportsManager from "@/components/admin/DonationReportsManager";
import { getAdminEmail, isAdminEmail } from "@/lib/auth/admin";
import { fetchDonationReports } from "@/lib/donations/reports-store";
import { hasPremiumAccess } from "@/lib/auth/premium";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AuthListUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

type AdminUserSummary = {
  id: string;
  email: string;
  name: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  isPremium: boolean;
};

type EventRow = {
  id: string;
  user_id: string | null;
  title: string | null;
  location: string | null;
  date: string | null;
  created_at: string;
};

type ApplicationRow = {
  id: string;
  event_id: string;
  organizer_id: string;
  volunteer_id: string;
  volunteer_name: string | null;
  volunteer_email: string | null;
  status: string;
  created_at: string;
};

type ManualPaymentRow = {
  id: string;
  kind: "donation" | "premium";
  status: "pending" | "approved" | "rejected";
  amount_uzs: number;
  user_id: string | null;
  payer_name: string | null;
  payer_email: string | null;
  transfer_reference: string | null;
  created_at: string;
};

type PaymentOrderRow = {
  id: string;
  kind: "donation" | "premium";
  status: "pending" | "paid" | "failed" | "cancelled";
  amount_tiyin: number;
  user_id: string | null;
  payer_name: string | null;
  payer_email: string | null;
  provider: string | null;
  created_at: string;
};

type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  happenedAt: string;
  tone: "emerald" | "amber" | "sky" | "slate";
};

type OptionalRowsResult<T> = {
  rows: T[];
  missing: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("ru-RU");

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return dateFormatter.format(date);
}

function formatAmount(value: number) {
  return `${currencyFormatter.format(value)} UZS`;
}

function isMissingTableError(message: string | undefined, relation: string) {
  if (!message) {
    return false;
  }

  return new RegExp(relation, "i").test(message) && /relation|table|schema cache|does not exist|PGRST/i.test(message);
}

function unwrapOptionalRows<T>(
  relation: string,
  result: { data: T[] | null; error: { message?: string } | null },
) {
  if (result.error) {
    if (isMissingTableError(result.error.message, relation)) {
      return { rows: [], missing: true } satisfies OptionalRowsResult<T>;
    }

    throw result.error;
  }

  return { rows: result.data ?? [], missing: false } satisfies OptionalRowsResult<T>;
}

async function listAdminUsers(admin: ReturnType<typeof getSupabaseAdmin>) {
  const users: AuthListUser[] = [];
  let page = 1;
  const perPage = 200;

  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw error;
    }

    const batch = (data.users ?? []) as AuthListUser[];
    users.push(...batch);

    if (!data.nextPage || batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

function resolveActor(
  userMap: Map<string, AdminUserSummary>,
  userId?: string | null,
  fallbackName?: string | null,
  fallbackEmail?: string | null,
) {
  const knownUser = userId ? userMap.get(userId) : null;
  if (knownUser) {
    return {
      name: knownUser.name,
      email: knownUser.email,
    };
  }

  const name = pickString(fallbackName, fallbackEmail, "Неизвестный пользователь");
  const email = pickString(fallbackEmail, "Без email");

  return {
    name: name ?? "Неизвестный пользователь",
    email: email ?? "Без email",
  };
}

function paymentStatusLabel(status: string) {
  switch (status) {
    case "approved":
    case "paid":
      return "Подтверждено";
    case "rejected":
    case "failed":
      return "Отклонено";
    case "cancelled":
      return "Отменено";
    default:
      return "Ожидает";
  }
}

function paymentStatusClassName(status: string) {
  switch (status) {
    case "approved":
    case "paid":
      return "border-emerald-100 bg-emerald-50 text-emerald-700";
    case "rejected":
    case "failed":
    case "cancelled":
      return "border-rose-100 bg-rose-50 text-rose-700";
    default:
      return "border-amber-100 bg-amber-50 text-amber-700";
  }
}

export default async function AdminPage() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const adminEmail = getAdminEmail();
  if (!adminEmail) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eefdf6_100%)] px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-amber-100 bg-white p-8 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Admin Setup</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Нет настроенного admin email</h1>
          <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
            Добавь в <code className="rounded bg-slate-100 px-2 py-1 text-[12px]">.env.local</code> переменную
            {" "}
            <code className="rounded bg-slate-100 px-2 py-1 text-[12px]">ADMIN_EMAIL</code>.
            Можно использовать тот же email, что и для проверки ручных платежей.
          </p>
        </div>
      </main>
    );
  }

  if (!isAdminEmail(user.email)) {
    notFound();
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eefdf6_100%)] px-4 py-10 md:px-8">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-amber-100 bg-white p-8 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-600">Admin Setup</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Не хватает server key</h1>
          <p className="mt-4 text-sm font-medium leading-7 text-slate-600">
            Для админ-панели нужен
            {" "}
            <code className="rounded bg-slate-100 px-2 py-1 text-[12px]">SUPABASE_SERVICE_ROLE_KEY</code>
            {" "}
            в <code className="rounded bg-slate-100 px-2 py-1 text-[12px]">.env.local</code>.
          </p>
        </div>
      </main>
    );
  }

  const [authUsers, eventsResult, applicationsResult, manualPaymentsResult, providerOrdersResult, donationReportsResult] = await Promise.all([
    listAdminUsers(admin),
    admin
      .from("events")
      .select("id, user_id, title, location, date, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("event_applications")
      .select("id, event_id, organizer_id, volunteer_id, volunteer_name, volunteer_email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("manual_payment_requests")
      .select("id, kind, status, amount_uzs, user_id, payer_name, payer_email, transfer_reference, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("payment_orders")
      .select("id, kind, status, amount_tiyin, user_id, payer_name, payer_email, provider, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    fetchDonationReports({ publishedOnly: false }),
  ]);

  const eventsData = unwrapOptionalRows<EventRow>("events", eventsResult);
  const applicationsData = unwrapOptionalRows<ApplicationRow>("event_applications", applicationsResult);
  const manualPaymentsData = unwrapOptionalRows<ManualPaymentRow>("manual_payment_requests", manualPaymentsResult);
  const providerOrdersData = unwrapOptionalRows<PaymentOrderRow>("payment_orders", providerOrdersResult);

  const applicationEventIds = Array.from(new Set(applicationsData.rows.map((item) => item.event_id)));
  const eventTitlesById = new Map<string, string>();
  if (applicationEventIds.length > 0) {
    const { data: applicationEvents, error: applicationEventsError } = await admin
      .from("events")
      .select("id, title")
      .in("id", applicationEventIds);

    if (applicationEventsError && !isMissingTableError(applicationEventsError.message, "events")) {
      throw applicationEventsError;
    }

    (applicationEvents ?? []).forEach((event) => {
      eventTitlesById.set(event.id, event.title ?? "Событие");
    });
  }

  const latestUsers = [...authUsers]
    .sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
    .map((account) => {
      const email = account.email?.trim() || "Без email";
      const name =
        pickString(
          account.user_metadata?.full_name,
          account.user_metadata?.name,
          email.split("@")[0],
        ) ?? email;

      return {
        id: account.id,
        email,
        name,
        createdAt: account.created_at ?? null,
        lastSignInAt: account.last_sign_in_at ?? null,
        isPremium: hasPremiumAccess(account),
      } satisfies AdminUserSummary;
    });

  const userMap = new Map(latestUsers.map((entry) => [entry.id, entry]));

  const recentPayments = [
    ...manualPaymentsData.rows.map((payment) => {
      const actor = resolveActor(userMap, payment.user_id, payment.payer_name, payment.payer_email);

      return {
        id: `manual-${payment.id}`,
        kind: payment.kind,
        status: payment.status,
        amount: payment.amount_uzs,
        actorName: actor.name,
        actorEmail: actor.email,
        source: "Ручной перевод",
        createdAt: payment.created_at,
        extra: payment.transfer_reference,
      };
    }),
    ...providerOrdersData.rows.map((payment) => {
      const actor = resolveActor(userMap, payment.user_id, payment.payer_name, payment.payer_email);

      return {
        id: `provider-${payment.id}`,
        kind: payment.kind,
        status: payment.status,
        amount: Math.round(payment.amount_tiyin / 100),
        actorName: actor.name,
        actorEmail: actor.email,
        source: payment.provider || "Онлайн оплата",
        createdAt: payment.created_at,
        extra: null,
      };
    }),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 24);

  const activity: ActivityItem[] = [
    ...latestUsers.map((account) => ({
      id: `signup-${account.id}`,
      title: `${account.name} зарегистрировался`,
      detail: account.email,
      happenedAt: account.createdAt ?? new Date(0).toISOString(),
      tone: "emerald" as const,
    })),
    ...eventsData.rows.map((event) => {
      const actor = resolveActor(userMap, event.user_id);

      return {
        id: `event-${event.id}`,
        title: `${actor.name} создал событие`,
        detail: event.title?.trim() || "Без названия",
        happenedAt: event.created_at,
        tone: "sky" as const,
      };
    }),
    ...applicationsData.rows.map((application) => {
      const actor = resolveActor(
        userMap,
        application.volunteer_id,
        application.volunteer_name,
        application.volunteer_email,
      );

      return {
        id: `application-${application.id}`,
        title: `${actor.name} отправил отклик`,
        detail: eventTitlesById.get(application.event_id) || "Событие",
        happenedAt: application.created_at,
        tone: "slate" as const,
      };
    }),
    ...manualPaymentsData.rows.map((payment) => {
      const actor = resolveActor(userMap, payment.user_id, payment.payer_name, payment.payer_email);

      return {
        id: `manual-payment-${payment.id}`,
        title: `${actor.name} отправил ${payment.kind === "premium" ? "заявку на Premium" : "донат"}`,
        detail: formatAmount(payment.amount_uzs),
        happenedAt: payment.created_at,
        tone: payment.kind === "premium" ? "amber" as const : "emerald" as const,
      };
    }),
    ...providerOrdersData.rows.map((payment) => {
      const actor = resolveActor(userMap, payment.user_id, payment.payer_name, payment.payer_email);

      return {
        id: `payment-order-${payment.id}`,
        title: `${actor.name} создал онлайн-платёж`,
        detail: `${payment.kind === "premium" ? "Premium" : "Донат"} • ${paymentStatusLabel(payment.status)}`,
        happenedAt: payment.created_at,
        tone: payment.kind === "premium" ? "amber" as const : "emerald" as const,
      };
    }),
  ]
    .sort((a, b) => new Date(b.happenedAt).getTime() - new Date(a.happenedAt).getTime())
    .slice(0, 40);

  const missingBlocks = [
    manualPaymentsData.missing ? "manual_payment_requests" : null,
    providerOrdersData.missing ? "payment_orders" : null,
    applicationsData.missing ? "event_applications" : null,
    donationReportsResult.missing ? "donation_reports" : null,
  ].filter(Boolean) as string[];

  const premiumUsersCount = latestUsers.filter((entry) => entry.isPremium).length;
  const approvedDonationsTotal = recentPayments
    .filter((item) => item.kind === "donation" && ["approved", "paid"].includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0);
  const premiumPaymentsCount = recentPayments.filter((item) => item.kind === "premium").length;
  const pendingPaymentsCount = recentPayments.filter((item) => item.status === "pending").length;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#eefdf6_100%)] px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="rounded-[34px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                <ShieldCheck className="h-4 w-4" />
                Admin Center
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 md:text-5xl">
                Вся активность проекта в одном месте
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-medium leading-7 text-slate-600 md:text-base">
                Эта страница видна только аккаунту <span className="font-black text-slate-900">{adminEmail}</span>.
                Здесь собраны регистрации, активность пользователей, донаты и Premium-покупки.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 px-5 py-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700"
              >
                В кабинет <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {missingBlocks.length > 0 ? (
            <div className="mt-6 rounded-[24px] border border-amber-100 bg-amber-50 px-5 py-4 text-sm font-semibold leading-7 text-amber-800">
              Не все таблицы настроены в Supabase. Сейчас не хватает:
              {" "}
              <span className="font-black">{missingBlocks.join(", ")}</span>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <div className="rounded-[24px] border border-emerald-100 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_100%)] p-5">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-600">
                <Users className="h-4 w-4" /> Пользователи
              </p>
              <p className="mt-3 text-4xl font-black text-slate-900">{latestUsers.length}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Сколько аккаунтов найдено через Auth</p>
            </div>
            <div className="rounded-[24px] border border-amber-100 bg-[linear-gradient(180deg,_#fffbeb_0%,_#ffffff_100%)] p-5">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-600">
                <Crown className="h-4 w-4" /> Premium
              </p>
              <p className="mt-3 text-4xl font-black text-slate-900">{premiumUsersCount}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Аккаунтов с активным Premium</p>
            </div>
            <div className="rounded-[24px] border border-sky-100 bg-[linear-gradient(180deg,_#f0f9ff_0%,_#ffffff_100%)] p-5">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">
                <Activity className="h-4 w-4" /> Активность
              </p>
              <p className="mt-3 text-4xl font-black text-slate-900">{activity.length}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Последние действия в ленте</p>
            </div>
            <div className="rounded-[24px] border border-violet-100 bg-[linear-gradient(180deg,_#f8faff_0%,_#ffffff_100%)] p-5">
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-violet-600">
                <Wallet className="h-4 w-4" /> Платежи
              </p>
              <p className="mt-3 text-4xl font-black text-slate-900">{pendingPaymentsCount}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Ожидают проверки прямо сейчас</p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Кто зарегистрировался</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Последние аккаунты</h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">Показаны самые новые пользователи из Supabase Auth</p>
              </div>
              <div className="mt-6 space-y-3">
                {latestUsers.slice(0, 12).map((account) => (
                  <div
                    key={account.id}
                    className="flex flex-col gap-3 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-black text-slate-900">{account.name}</p>
                        {account.isPremium ? (
                          <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">
                            Premium
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-500">{account.email}</p>
                    </div>
                    <div className="grid gap-1 text-sm font-semibold text-slate-500 md:text-right">
                      <p>Регистрация: {formatDateTime(account.createdAt)}</p>
                      <p>Последний вход: {formatDateTime(account.lastSignInAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Кто что делал</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-900">Лента действий</h2>
                </div>
                <p className="text-sm font-semibold text-slate-500">Регистрации, отклики, события и платёжные действия</p>
              </div>
              <div className="mt-6 space-y-3">
                {activity.slice(0, 18).map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-[22px] border border-slate-100 bg-white px-4 py-4 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={[
                          "mt-1 inline-flex h-3 w-3 rounded-full",
                          item.tone === "emerald"
                            ? "bg-emerald-500"
                            : item.tone === "amber"
                              ? "bg-amber-500"
                              : item.tone === "sky"
                                ? "bg-sky-500"
                                : "bg-slate-400",
                        ].join(" ")}
                      />
                      <div>
                        <p className="text-sm font-black text-slate-900">{item.title}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{item.detail}</p>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-slate-400">{formatDateTime(item.happenedAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Платежи и покупки</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Кто донатил и кто купил Premium</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-emerald-100 bg-emerald-50 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Подтверждённые донаты</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{formatAmount(approvedDonationsTotal)}</p>
                </div>
                <div className="rounded-[22px] border border-amber-100 bg-amber-50 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">Заявки на Premium</p>
                  <p className="mt-3 text-3xl font-black text-slate-900">{premiumPaymentsCount}</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {recentPayments.length > 0 ? recentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-900">{payment.actorName}</p>
                          <span
                            className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${paymentStatusClassName(payment.status)}`}
                          >
                            {paymentStatusLabel(payment.status)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-500">{payment.actorEmail}</p>
                        <p className="mt-2 text-sm font-semibold text-slate-500">
                          {payment.kind === "premium" ? "Premium" : "Донат"} • {payment.source}
                        </p>
                        {payment.extra ? (
                          <p className="mt-1 text-sm font-semibold text-slate-400">Как найти перевод: {payment.extra}</p>
                        ) : null}
                      </div>
                      <div className="text-left md:text-right">
                        <p className="text-lg font-black text-slate-900">{formatAmount(payment.amount)}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-400">{formatDateTime(payment.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[22px] border border-dashed border-slate-200 px-4 py-6 text-sm font-semibold text-slate-500">
                    Пока нет платежей для отображения.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <DonationReportsManager initialReports={donationReportsResult.reports} />
      </div>
    </main>
  );
}
