"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { CheckCircle2, Crown, Loader2, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

type StatusState = "loading" | "paid" | "pending" | "failed" | "cancelled" | "missing";
type TrackingMode = "manual" | "order" | "missing";

function mapManualStatus(status: string | undefined): StatusState {
  if (status === "approved") return "paid";
  if (status === "rejected") return "failed";
  return "pending";
}

function PremiumSuccessContent() {
  const { pick } = useLanguage();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("request")?.trim() || "";
  const orderId = searchParams.get("order")?.trim() || "";
  const trackingMode: TrackingMode = requestId ? "manual" : orderId ? "order" : "missing";
  const trackingId = trackingMode === "manual" ? requestId : orderId;
  const [status, setStatus] = useState<StatusState>(trackingMode === "missing" ? "missing" : "loading");
  const [message, setMessage] = useState("");
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      ),
    [],
  );

  useEffect(() => {
    if (!trackingId || trackingMode === "missing") return;

    let cancelled = false;

    const pollStatus = async (attempt = 0) => {
      try {
        const response = await fetch(
          trackingMode === "manual" ? "/api/manual-payments/status" : "/api/payments/status",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              trackingMode === "manual" ? { requestId: trackingId } : { orderId: trackingId },
            ),
          },
        );

        const payload = (await response.json().catch(() => null)) as
          | { status?: string; premiumActivated?: boolean; reviewedAt?: string | null; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Payment status request failed.");
        }

        const nextStatus =
          trackingMode === "manual"
            ? mapManualStatus(payload?.status)
            : ((payload?.status as StatusState | undefined) ?? "pending");

        if (cancelled) return;

        if (nextStatus === "paid") {
          await supabase.auth.refreshSession();
          setReviewedAt(payload?.reviewedAt ?? null);
          setStatus("paid");
          return;
        }

        if (nextStatus === "failed" || nextStatus === "cancelled") {
          setReviewedAt(payload?.reviewedAt ?? null);
          setStatus(nextStatus);
          return;
        }

        setStatus("pending");
        if (attempt < 5) {
          window.setTimeout(() => {
            void pollStatus(attempt + 1);
          }, 2500);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus("pending");
        setMessage(
          error instanceof Error
            ? error.message
            : pick({ ru: "Не удалось проверить статус оплаты.", en: "Could not verify payment status.", uz: "To'lov statusini tekshirib bo'lmadi." }),
        );
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
    };
  }, [pick, supabase, trackingId, trackingMode]);

  const content = useMemo(() => {
    if (trackingMode === "manual") {
      return {
        titleByStatus: {
          loading: pick({ ru: "Проверяем заявку Premium", en: "Checking Premium request", uz: "Premium so'rovi tekshirilmoqda" }),
          paid: pick({ ru: "Premium активирован", en: "Premium activated", uz: "Premium yoqildi" }),
          pending: pick({ ru: "Premium ждёт проверки", en: "Premium is waiting for review", uz: "Premium tekshiruvni kutmoqda" }),
          failed: pick({ ru: "Premium не подтверждён", en: "Premium was not confirmed", uz: "Premium tasdiqlanmadi" }),
          cancelled: pick({ ru: "Заявка была отменена", en: "Request was cancelled", uz: "So'rov bekor qilindi" }),
          missing: pick({ ru: "Нет номера заявки", en: "Missing request number", uz: "So'rov raqami yo'q" }),
        } satisfies Record<StatusState, string>,
        bodyByStatus: {
          loading: pick({ ru: "Проверяем статус вашей заявки на Premium.", en: "We are checking the status of your Premium request.", uz: "Premium so'rovingiz holatini tekshirmoqdamiz." }),
          paid: pick({ ru: "Оплата подтверждена. Premium уже активирован для вашего аккаунта.", en: "Your payment has been confirmed. Premium is already active for your account.", uz: "To'lov tasdiqlandi. Premium akkauntingiz uchun allaqachon faollashgan." }),
          pending: pick({ ru: "Заявка сохранена. Обычно подтверждение занимает немного времени.", en: "Your request has been saved. Confirmation usually takes a little time.", uz: "So'rov saqlandi. Tasdiqlash odatda biroz vaqt oladi." }),
          failed: pick({ ru: "Оплата пока не подтверждена. Проверьте данные перевода или попробуйте позже.", en: "Your payment has not been confirmed yet. Check the transfer details or try again later.", uz: "To'lov hozircha tasdiqlanmadi. O'tkazma ma'lumotini tekshiring yoki keyinroq urinib ko'ring." }),
          cancelled: pick({ ru: "Вы можете вернуться и создать новую заявку, когда будете готовы.", en: "You can return and create a new request whenever you are ready.", uz: "Tayyor bo'lganda qaytib, yangi so'rov yaratishingiz mumkin." }),
          missing: pick({ ru: "Эта страница открыта без идентификатора заявки, поэтому статус проверить нельзя.", en: "This page was opened without a request identifier, so the status cannot be verified.", uz: "Bu sahifa so'rov identifikatorisiz ochilgan, shuning uchun statusni tekshirib bo'lmaydi." }),
        } satisfies Record<StatusState, string>,
      };
    }

    return {
      titleByStatus: {
        loading: pick({ ru: "Проверяем Premium", en: "Checking Premium", uz: "Premium tekshirilmoqda" }),
        paid: pick({ ru: "Premium активирован", en: "Premium activated", uz: "Premium yoqildi" }),
        pending: pick({ ru: "Платёж ещё обрабатывается", en: "Payment is still processing", uz: "To'lov hali qayta ishlanmoqda" }),
        failed: pick({ ru: "Premium не подтверждён", en: "Premium was not confirmed", uz: "Premium tasdiqlanmadi" }),
        cancelled: pick({ ru: "Платёж был отменён", en: "Payment was cancelled", uz: "To'lov bekor qilindi" }),
        missing: pick({ ru: "Нет номера заказа", en: "Missing order number", uz: "Buyurtma raqami yo'q" }),
      } satisfies Record<StatusState, string>,
      bodyByStatus: {
        loading: pick({ ru: "Проверяем ваш платёж.", en: "We are checking your payment.", uz: "To'lovingizni tekshirmoqdamiz." }),
        paid: pick({ ru: "Оплата подтверждена. Premium уже активирован для вашего аккаунта.", en: "Payment confirmed. Premium is already active for your account.", uz: "To'lov tasdiqlandi. Premium akkauntingiz uchun allaqachon faollashgan." }),
        pending: pick({ ru: "Вы уже вернулись с платёжной страницы, но финальное подтверждение ещё может занять немного времени.", en: "You have already returned from the payment page, but final confirmation can still take a bit more time.", uz: "Siz to'lov sahifasidan qaytdingiz, lekin yakuniy tasdiq yana biroz vaqt olishi mumkin." }),
        failed: pick({ ru: "Платёж не был подтверждён. Если списание всё же произошло, проверьте заказ позже или обратитесь в поддержку.", en: "The payment was not confirmed. If a charge did happen, check the order again later or contact support.", uz: "To'lov tasdiqlanmadi. Agar pul yechilgan bo'lsa, buyurtmani keyinroq tekshiring yoki yordamga murojaat qiling." }),
        cancelled: pick({ ru: "Вы можете вернуться и повторить оплату Premium позже.", en: "You can return and pay for Premium later.", uz: "Keyinroq qaytib, Premium uchun yana to'lashingiz mumkin." }),
        missing: pick({ ru: "Эта страница открыта без идентификатора платежа, поэтому статус проверить нельзя.", en: "This page was opened without a payment identifier, so the status cannot be verified.", uz: "Bu sahifa to'lov identifikatorisiz ochilgan, shu sabab statusni tekshirib bo'lmaydi." }),
      } satisfies Record<StatusState, string>,
    };
  }, [pick, trackingMode]);

  const icon =
    status === "paid" ? (
      <CheckCircle2 className="h-16 w-16 text-emerald-500" />
    ) : status === "loading" || status === "pending" ? (
      <Loader2 className="h-16 w-16 animate-spin text-emerald-500" />
    ) : (
      <TriangleAlert className="h-16 w-16 text-amber-500" />
    );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffaf1_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <div className="w-full max-w-xl rounded-[34px] border border-gray-100 bg-white p-10 text-center shadow-xl">
        <div className="mb-5 flex justify-center">{icon}</div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900">
          {content.titleByStatus[status]}
        </h1>
        <p className="mt-4 text-sm font-semibold leading-7 text-gray-500">{content.bodyByStatus[status]}</p>
        {message ? <p className="mt-4 text-sm font-bold text-amber-600">{message}</p> : null}
        {trackingId ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            {trackingMode === "manual"
              ? pick({ ru: "Заявка", en: "Request", uz: "So'rov" })
              : pick({ ru: "Заказ", en: "Order", uz: "Buyurtma" })}:
            <span className="text-slate-900"> {trackingId}</span>
          </div>
        ) : null}
        {status === "paid" ? (
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-amber-50 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
                {pick({ ru: "Что уже доступно", en: "Already unlocked", uz: "Allaqachon ochildi" })}
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {pick({ ru: "Приоритет в каталоге", en: "Priority in catalog", uz: "Katalogda ustunlik" })}
              </p>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                {pick({ ru: "Ваши объявления поднимаются выше обычных публикаций.", en: "Your listings are shown above standard posts.", uz: "E'lonlaringiz oddiy postlardan yuqorida ko'rsatiladi." })}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {pick({ ru: "Дополнительно", en: "Also included", uz: "Qo'shimcha" })}
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {pick({ ru: "Premium аналитика и рамка", en: "Premium analytics and badge", uz: "Premium analitika va badge" })}
              </p>
              <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                {pick({ ru: "Карточки получают Premium-оформление, а в кабинете открываются расширенные метрики.", en: "Your cards get Premium styling and the dashboard unlocks extended metrics.", uz: "Kartalaringiz Premium ko'rinishini oladi va kabinetda kengaytirilgan metrikalar ochiladi." })}
              </p>
            </div>
          </div>
        ) : null}
        {reviewedAt ? (
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            {pick({ ru: "Обновлено", en: "Updated", uz: "Yangilandi" })}:{" "}
            {new Date(reviewedAt).toLocaleString(
              pick({ ru: "ru-RU", en: "en-US", uz: "uz-UZ" }),
            )}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href={status === "paid" ? "/dashboard" : "/premium"}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-black"
          >
            {status === "paid"
              ? pick({ ru: "Открыть кабинет", en: "Open dashboard", uz: "Kabinetni ochish" })
              : pick({ ru: "Вернуться к Premium", en: "Back to Premium", uz: "Premium ga qaytish" })}
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-8 py-4 text-sm font-black uppercase tracking-widest text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
          >
            <Crown className="h-4 w-4" />
            {pick({ ru: "Каталог событий", en: "Events catalog", uz: "Tadbirlar katalogi" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function PremiumSuccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#fffaf1_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
    </div>
  );
}

export default function PremiumSuccessPage() {
  return (
    <Suspense fallback={<PremiumSuccessFallback />}>
      <PremiumSuccessContent />
    </Suspense>
  );
}
