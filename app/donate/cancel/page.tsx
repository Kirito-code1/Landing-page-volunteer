"use client";

import { Suspense } from "react";
import Link from "next/link";
import { CircleAlert, Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/providers/LanguageProvider";

function DonationCancelContent() {
  const { pick } = useLanguage();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order")?.trim();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <div className="w-full max-w-xl rounded-[34px] border border-gray-100 bg-white p-10 text-center shadow-xl">
        <CircleAlert className="mx-auto mb-5 h-16 w-16 text-amber-500" />
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900">
          {pick({ ru: "Платёж отменён", en: "Payment cancelled", uz: "To'lov bekor qilindi" })}
        </h1>
        <p className="mt-4 text-sm font-semibold leading-7 text-gray-500">
          {pick({
            ru: "Uzum Checkout вернул вас без подтверждённого платежа. Вы можете снова открыть оплату, когда будете готовы.",
            en: "Uzum Checkout returned you without a confirmed payment. You can open the payment flow again whenever you are ready.",
            uz: "Uzum Checkout sizni tasdiqlangan to'lovsiz qaytardi. Tayyor bo'lganingizda to'lovni yana ochishingiz mumkin.",
          })}
        </p>
        {orderId ? (
          <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
            {pick({ ru: "Заказ", en: "Order", uz: "Buyurtma" })}: <span className="text-slate-900">{orderId}</span>
          </div>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/donate"
            className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black uppercase tracking-widest text-white transition-colors hover:bg-emerald-700"
          >
            {pick({ ru: "Вернуться к оплате", en: "Back to donate", uz: "Xayriyaga qaytish" })}
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-8 py-4 text-sm font-black uppercase tracking-widest text-slate-700 transition-colors hover:bg-slate-50"
          >
            {pick({ ru: "На главную", en: "Go home", uz: "Bosh sahifaga" })}
          </Link>
        </div>
      </div>
    </div>
  );
}

function DonationCancelFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f0fdf4_0%,_#ffffff_50%,_#eff6ff_100%)] px-4">
      <Loader2 className="h-12 w-12 animate-spin text-emerald-500" />
    </div>
  );
}

export default function DonationCancelPage() {
  return (
    <Suspense fallback={<DonationCancelFallback />}>
      <DonationCancelContent />
    </Suspense>
  );
}
