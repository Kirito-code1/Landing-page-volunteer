"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, ShieldCheck, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

type StatusState = "loading" | "paid" | "pending" | "failed" | "cancelled" | "missing";
type TrackingMode = "manual" | "order" | "missing";
type DonationSummary = {
  goalAmountUzs: number;
  collectedAmountUzs: number;
  remainingAmountUzs: number;
  progressPercent: number;
  approvedPaymentsCount: number;
} | null;

function mapManualStatus(status: string | undefined): StatusState {
  if (status === "approved") return "paid";
  if (status === "rejected") return "failed";
  return "pending";
}

function DonationSuccessContent() {
  const { pick } = useLanguage();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("request")?.trim() || "";
  const orderId = searchParams.get("order")?.trim() || "";
  const trackingMode: TrackingMode = requestId ? "manual" : orderId ? "order" : "missing";
  const trackingId = trackingMode === "manual" ? requestId : orderId;
  const [status, setStatus] = useState<StatusState>(trackingMode === "missing" ? "missing" : "loading");
  const [message, setMessage] = useState<string>("");
  const [reviewedAt, setReviewedAt] = useState<string | null>(null);
  const [donationSummary, setDonationSummary] = useState<DonationSummary>(null);

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
          | {
              status?: string;
              reviewedAt?: string | null;
              donationSummary?: DonationSummary;
              error?: string;
            }
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
          setReviewedAt(payload?.reviewedAt ?? null);
          setDonationSummary(payload?.donationSummary ?? null);
          setStatus("paid");
          return;
        }

        if (nextStatus === "failed" || nextStatus === "cancelled") {
          setReviewedAt(payload?.reviewedAt ?? null);
          setStatus(nextStatus);
          return;
        }

        setStatus("pending");
        if (attempt < 4) {
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
            : pick({ ru: "Не удалось проверить статус перевода.", en: "Could not verify transfer status.", uz: "O'tkazma statusini tekshirib bo'lmadi." }),
        );
      }
    };

    void pollStatus();

    return () => {
      cancelled = true;
    };
  }, [pick, trackingId, trackingMode]);

  const content = useMemo(() => {
    if (trackingMode === "manual") {
      return {
        titleByStatus: {
          loading: pick({ ru: "Проверяем заявку", en: "Checking request", uz: "So'rov tekshirilmoqda" }),
          paid: pick({ ru: "Спасибо за поддержку", en: "Thanks for your support", uz: "Qo'llab-quvvatlaganingiz uchun rahmat" }),
          pending: pick({ ru: "Перевод ждёт проверки", en: "Transfer is waiting for review", uz: "O'tkazma tekshiruvni kutmoqda" }),
          failed: pick({ ru: "Перевод не подтверждён", en: "Transfer was not confirmed", uz: "O'tkazma tasdiqlanmadi" }),
          cancelled: pick({ ru: "Перевод был отменён", en: "Transfer was cancelled", uz: "O'tkazma bekor qilindi" }),
          missing: pick({ ru: "Нет номера заявки", en: "Missing request number", uz: "So'rov raqami yo'q" }),
        } satisfies Record<StatusState, string>,
        bodyByStatus: {
          loading: pick({ ru: "Проверяем статус вашего пожертвования.", en: "We are checking the status of your donation.", uz: "Xayriyangiz holatini tekshirmoqdamiz." }),
          paid: pick({ ru: "Спасибо за поддержку. Пожертвование подтверждено и уже учтено в текущем сборе.", en: "Thank you for your support. The donation has been confirmed and is already included in the current fundraiser.", uz: "Qo'llab-quvvatlaganingiz uchun rahmat. Xayriya tasdiqlandi va joriy yig'imga qo'shildi." }),
          pending: pick({ ru: "Спасибо за поддержку. Заявка сохранена и скоро будет проверена.", en: "Thank you for your support. Your request has been saved and will be reviewed soon.", uz: "Qo'llab-quvvatlaganingiz uchun rahmat. So'rovingiz saqlandi va tez orada tekshiriladi." }),
          failed: pick({ ru: "Перевод пока не удалось подтвердить. Проверьте данные перевода или попробуйте позже.", en: "The transfer could not be confirmed yet. Check the transfer details or try again later.", uz: "O'tkazma hozircha tasdiqlanmadi. O'tkazma ma'lumotini tekshiring yoki keyinroq urinib ko'ring." }),
          cancelled: pick({ ru: "Вы можете вернуться и отправить новую заявку, когда будете готовы.", en: "You can return and send a new request whenever you are ready.", uz: "Tayyor bo'lganda qaytib, yangi so'rov yuborishingiz mumkin." }),
          missing: pick({ ru: "Эта страница открыта без идентификатора заявки, поэтому статус проверить нельзя.", en: "This page was opened without a request identifier, so the status cannot be verified.", uz: "Bu sahifa so'rov identifikatorisiz ochilgan, shuning uchun statusni tekshirib bo'lmaydi." }),
        } satisfies Record<StatusState, string>,
      };
    }

    return {
      titleByStatus: {
        loading: pick({ ru: "Проверяем оплату", en: "Checking payment", uz: "To'lov tekshirilmoqda" }),
        paid: pick({ ru: "Спасибо за поддержку", en: "Thanks for your support", uz: "Qo'llab-quvvatlaganingiz uchun rahmat" }),
        pending: pick({ ru: "Платёж ещё обрабатывается", en: "Payment is still processing", uz: "To'lov hali qayta ishlanmoqda" }),
        failed: pick({ ru: "Платёж не подтверждён", en: "Payment was not confirmed", uz: "To'lov tasdiqlanmadi" }),
        cancelled: pick({ ru: "Платёж был отменён", en: "Payment was cancelled", uz: "To'lov bekor qilindi" }),
        missing: pick({ ru: "Нет номера заказа", en: "Missing order number", uz: "Buyurtma raqami yo'q" }),
      } satisfies Record<StatusState, string>,
      bodyByStatus: {
        loading: pick({ ru: "Проверяем ваш платёж.", en: "We are checking your payment.", uz: "To'lovingizni tekshirmoqdamiz." }),
        paid: pick({ ru: "Спасибо за поддержку. Пожертвование подтверждено и будет учтено в текущем сборе.", en: "Thank you for your support. The donation has been confirmed and will be included in the current fundraiser.", uz: "Qo'llab-quvvatlaganingiz uchun rahmat. Xayriya tasdiqlandi va joriy yig'imga qo'shiladi." }),
        pending: pick({ ru: "Спасибо за поддержку. Мы получили данные перевода и скоро завершим проверку.", en: "Thank you for your support. We received the transfer details and will complete the review soon.", uz: "Qo'llab-quvvatlaganingiz uchun rahmat. O'tkazma ma'lumotlari qabul qilindi va tekshiruv tez orada yakunlanadi." }),
        failed: pick({ ru: "Если деньги не списались, попробуйте ещё раз. Если списание было, но статус не обновился, проверьте заказ позже.", en: "If the charge did not go through, try again. If you were charged but the status did not update, check the order again later.", uz: "Agar pul yechilmagan bo'lsa, yana urinib ko'ring. Agar pul yechilgan bo'lsa-yu status yangilanmagan bo'lsa, buyurtmani keyinroq yana tekshiring." }),
        cancelled: pick({ ru: "Вы можете вернуться и повторить оплату, когда будете готовы.", en: "You can return and try again whenever you are ready.", uz: "Tayyor bo'lganingizda qaytib, to'lovni yana urinib ko'rishingiz mumkin." }),
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

  const donorNote =
    status === "paid" || status === "pending" || status === "loading"
      ? pick({
          ru: "Спасибо за поддержку. Когда сбор будет завершён и средства пойдут в работу, мы опубликуем отчёт с результатом и фотографиями на странице пожертвований.",
          en: "Thank you for your support. Once the fundraiser is completed and the money is used, we will publish a report with the results and photos on the donation page.",
          uz: "Qo'llab-quvvatlaganingiz uchun rahmat. Yig'im tugab, mablag' ishlatilgach, xayriya sahifasida natija va suratlar bilan hisobot e'lon qilamiz.",
        })
      : "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <div className="w-full max-w-xl rounded-[34px] border border-gray-100 bg-white p-10 text-center shadow-xl">
        <div className="mb-5 flex justify-center">{icon}</div>
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900">
          {content.titleByStatus[status]}
        </h1>
        <p className="mt-4 text-sm font-semibold leading-7 text-gray-500">{content.bodyByStatus[status]}</p>
        {donorNote ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left text-sm font-semibold leading-7 text-emerald-900">
            {donorNote}
          </div>
        ) : null}
        {message ? <p className="mt-4 text-sm font-bold text-amber-600">{message}</p> : null}
        {trackingId ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            {trackingMode === "manual"
              ? pick({ ru: "Заявка", en: "Request", uz: "So'rov" })
              : pick({ ru: "Заказ", en: "Order", uz: "Buyurtma" })}:
            <span className="text-slate-900"> {trackingId}</span>
          </div>
        ) : null}
        {status === "paid" && donationSummary ? (
          <div className="mt-6 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-emerald-50 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
                {pick({ ru: "Собрано за месяц", en: "Collected this month", uz: "Oy bo'yicha yig'ildi" })}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {donationSummary.collectedAmountUzs.toLocaleString("ru-RU")} UZS
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {donationSummary.progressPercent}% · {donationSummary.approvedPaymentsCount}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {pick({ ru: "Осталось до цели", en: "Still needed", uz: "Maqsadgacha qoldi" })}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">
                {donationSummary.remainingAmountUzs.toLocaleString("ru-RU")} UZS
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {pick({ ru: "Ваш перевод уже учтён в прогрессе.", en: "Your transfer is already included.", uz: "O'tkazmangiz progressga qo'shildi." })}
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
            href={status === "paid" ? "/" : "/donate"}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-black"
          >
            {status === "paid"
              ? pick({ ru: "На главную", en: "Go home", uz: "Bosh sahifaga" })
              : pick({ ru: "Вернуться к донату", en: "Back to donate", uz: "Xayriyaga qaytish" })}
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-8 py-4 text-sm font-black uppercase tracking-widest text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100"
          >
            <ShieldCheck className="h-4 w-4" />
            {pick({ ru: "Посмотреть события", en: "View events", uz: "Tadbirlarni ko'rish" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function DonationSuccessFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
    </div>
  );
}

export default function DonationSuccessPage() {
  return (
    <Suspense fallback={<DonationSuccessFallback />}>
      <DonationSuccessContent />
    </Suspense>
  );
}
