"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Crown, Check, X, Loader2, Sparkles, ShieldCheck, CreditCard, LockKeyhole } from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";

const FREE_POST_LIMIT = 3;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  const digits = onlyDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function PremiumPage() {
  const { pick } = useLanguage();
  const router = useRouter();

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: "",
    cardHolder: "",
    expiry: "",
    cvc: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<{
    cardNumber?: string;
    cardHolder?: string;
    expiry?: string;
    cvc?: string;
  }>({});
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

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      ),
    [],
  );

  const showAlert = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      setUser(session?.user ?? null);
      setLoading(false);
    };
    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const isPremium =
    user?.user_metadata?.is_premium === true ||
    user?.user_metadata?.subscription_plan === "premium";

  const features = [
    {
      label: pick({
        ru: "Лимит объявлений",
        en: "Post limit",
        uz: "E'lonlar limiti",
      }),
      free: `${FREE_POST_LIMIT}`,
      premium: pick({ ru: "Без лимита", en: "Unlimited", uz: "Cheksiz" }),
      freeEnabled: true,
      premiumEnabled: true,
    },
    {
      label: pick({
        ru: "Аналитика по событиям",
        en: "Event analytics",
        uz: "Tadbirlar analitikasi",
      }),
      free: pick({ ru: "Базово", en: "Basic", uz: "Asosiy" }),
      premium: pick({ ru: "Расширено", en: "Advanced", uz: "Kengaytirilgan" }),
      freeEnabled: false,
      premiumEnabled: true,
    },
    {
      label: pick({
        ru: "Приоритет в ленте событий",
        en: "Priority in events feed",
        uz: "Tadbirlar lentasida ustuvorlik",
      }),
      free: "—",
      premium: pick({ ru: "Выше обычных объявлений", en: "Above regular posts", uz: "Oddiy e'lonlardan yuqorida" }),
      freeEnabled: false,
      premiumEnabled: true,
    },
    {
      label: pick({
        ru: "Impact-аналитика и CSV",
        en: "Impact analytics and CSV",
        uz: "Impact analitika va CSV",
      }),
      free: "—",
      premium: pick({ ru: "Расширенная", en: "Advanced", uz: "Kengaytirilgan" }),
      freeEnabled: false,
      premiumEnabled: true,
    },
  ];

  const closePaymentModal = () => {
    if (isPaymentSubmitting || isSubmitting) return;
    setIsPaymentModalOpen(false);
    setPaymentErrors({});
  };

  const applyPlanChange = async (
    nextPremium: boolean,
    options?: { fromPayment?: boolean },
  ) => {
    if (!user) {
      router.push("/auth/login?next=/premium");
      return false;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({
        data: {
          is_premium: nextPremium,
          subscription_plan: nextPremium ? "premium" : "free",
        },
      });
      if (error) throw error;

      const { error: eventsSyncError } = await supabase
        .from("events")
        .update({ premium_priority: nextPremium })
        .eq("user_id", user.id);

      const eventsSyncMessage = eventsSyncError?.message ?? "";
      const isMissingPremiumField =
        Boolean(eventsSyncError) &&
        /premium_priority/i.test(eventsSyncMessage) &&
        /column|schema cache|does not exist|PGRST204/i.test(eventsSyncMessage);
      if (eventsSyncError && !isMissingPremiumField) {
        console.error("Failed to sync premium priority:", eventsSyncMessage);
      }

      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);

      const planMessage = nextPremium
        ? pick({
            ru: "Теперь у вас открыт полный набор возможностей Premium.",
            en: "You now have full Premium access.",
            uz: "Endi sizda Premium imkoniyatlari to'liq ochildi.",
          })
        : pick({
            ru: "Вы вернулись на Free-план.",
            en: "You switched back to Free plan.",
            uz: "Siz Free tarifga qaytdingiz.",
          });

      const syncHint = pick({
        ru: "Чтобы приоритет в каталоге работал, выполните SQL из database/events_extra_fields.sql.",
        en: "To enable feed priority, run SQL from database/events_extra_fields.sql.",
        uz: "Katalogdagi ustuvorlik ishlashi uchun database/events_extra_fields.sql ni ishga tushiring.",
      });

      showAlert(
        nextPremium
          ? options?.fromPayment
            ? pick({ ru: "Оплата подтверждена", en: "Payment confirmed", uz: "To'lov tasdiqlandi" })
            : pick({ ru: "Premium активирован", en: "Premium activated", uz: "Premium yoqildi" })
          : pick({ ru: "Тариф изменен", en: "Plan updated", uz: "Tarif yangilandi" }),
        isMissingPremiumField ? `${planMessage} ${syncHint}` : planMessage,
        isMissingPremiumField ? "warning" : "success",
      );
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" });
      showAlert(
        pick({ ru: "Ошибка обновления тарифа", en: "Plan update error", uz: "Tarifni yangilash xatosi" }),
        message,
        "error",
      );
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const validatePaymentForm = () => {
    const nextErrors: {
      cardNumber?: string;
      cardHolder?: string;
      expiry?: string;
      cvc?: string;
    } = {};

    const cardDigits = onlyDigits(paymentForm.cardNumber);
    if (cardDigits.length !== 16) {
      nextErrors.cardNumber = pick({
        ru: "Введите 16 цифр номера карты.",
        en: "Enter 16 card digits.",
        uz: "Karta raqami 16 ta raqamdan iborat bo'lishi kerak.",
      });
    }

    if (paymentForm.cardHolder.trim().length < 3) {
      nextErrors.cardHolder = pick({
        ru: "Укажите имя держателя карты.",
        en: "Enter cardholder name.",
        uz: "Karta egasi ismini kiriting.",
      });
    }

    const expiryDigits = onlyDigits(paymentForm.expiry);
    if (expiryDigits.length !== 4) {
      nextErrors.expiry = pick({
        ru: "Укажите срок в формате MM/YY.",
        en: "Use MM/YY format.",
        uz: "Muddatni MM/YY formatida kiriting.",
      });
    } else {
      const month = Number(expiryDigits.slice(0, 2));
      const year = Number(expiryDigits.slice(2));
      const fullYear = 2000 + year;
      const expiryDate = new Date(fullYear, month, 0, 23, 59, 59, 999);
      if (month < 1 || month > 12 || Number.isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
        nextErrors.expiry = pick({
          ru: "Срок действия карты некорректный или истёк.",
          en: "Card expiry is invalid or expired.",
          uz: "Karta muddati noto'g'ri yoki tugagan.",
        });
      }
    }

    const cvcDigits = onlyDigits(paymentForm.cvc);
    if (cvcDigits.length < 3 || cvcDigits.length > 4) {
      nextErrors.cvc = pick({
        ru: "Введите CVC (3-4 цифры).",
        en: "Enter CVC (3-4 digits).",
        uz: "CVC ni kiriting (3-4 raqam).",
      });
    }

    setPaymentErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleTogglePlan = async () => {
    if (!user) {
      router.push("/auth/login?next=/premium");
      return;
    }
    if (isPremium) {
      await applyPlanChange(false);
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePaymentForm()) return;

    try {
      setIsPaymentSubmitting(true);
      await new Promise((resolve) => setTimeout(resolve, 1600));

      const cardDigits = onlyDigits(paymentForm.cardNumber);
      if (cardDigits.endsWith("0000")) {
        showAlert(
          pick({ ru: "Платеж отклонен", en: "Payment declined", uz: "To'lov rad etildi" }),
          pick({
            ru: "Demo-шлюз отклонил карту. Используйте другую тестовую карту.",
            en: "Demo gateway rejected this card. Use another test card.",
            uz: "Demo to'lov shlyuzi bu kartani rad etdi. Boshqa test kartadan foydalaning.",
          }),
          "error",
        );
        return;
      }

      const upgraded = await applyPlanChange(true, { fromPayment: true });
      if (!upgraded) return;

      setIsPaymentModalOpen(false);
      setPaymentErrors({});
      setPaymentForm({
        cardNumber: "",
        cardHolder: "",
        expiry: "",
        cvc: "",
      });
    } finally {
      setIsPaymentSubmitting(false);
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
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_55%,_#ecfeff_100%)] px-4 py-10 md:py-14">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-[36px] border border-amber-200 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_55%,_#fffbeb_100%)] p-7 md:p-10 shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
                <Crown className="w-3.5 h-3.5" />
                {pick({ ru: "Подписка Premium", en: "Premium Subscription", uz: "Premium Obuna" })}
              </p>
              <h1 className="mt-4 text-4xl md:text-5xl font-black text-gray-900 uppercase italic tracking-tight">
                {pick({
                  ru: "Расширьте возможности вашего волонтёрского кабинета",
                  en: "Unlock more power in your volunteer dashboard",
                  uz: "Volontyor kabinetingiz imkoniyatlarini kengaytiring",
                })}
              </h1>
              <p className="mt-4 text-gray-600 font-semibold max-w-3xl leading-relaxed">
                {pick({
                  ru: "Premium создан для активных организаторов: безлимитные объявления, расширенная аналитика и быстрый экспорт данных.",
                  en: "Premium is built for active organizers: unlimited posts, advanced analytics, and instant data export.",
                  uz: "Premium faol tashkilotchilar uchun: cheksiz e'lon, kengaytirilgan tahlil va tezkor eksport.",
                })}
              </p>
            </div>
            <div className="rounded-3xl bg-white border border-amber-100 px-6 py-5">
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-500">
                {pick({ ru: "Текущий тариф", en: "Current plan", uz: "Joriy tarif" })}
              </p>
              <p className="mt-2 text-2xl font-black text-gray-900 flex items-center gap-2">
                {isPremium ? <Crown className="w-6 h-6 text-amber-500" /> : <ShieldCheck className="w-6 h-6 text-gray-400" />}
                {isPremium ? "Premium" : "Free"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <article className="rounded-[30px] border border-gray-100 bg-white p-7 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              {pick({ ru: "Free", en: "Free", uz: "Free" })}
            </p>
            <h2 className="text-3xl font-black text-gray-900 mt-2">Starter</h2>
            <p className="mt-3 text-gray-600 font-medium">
              {pick({
                ru: "Подходит для старта и первых тестов.",
                en: "Great for getting started and early tests.",
                uz: "Boshlash va ilk testlar uchun mos.",
              })}
            </p>
          </article>

          <article className="rounded-[30px] border border-amber-200 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_80%)] p-7 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
              {pick({ ru: "Premium", en: "Premium", uz: "Premium" })}
            </p>
            <h2 className="text-3xl font-black text-gray-900 mt-2 flex items-center gap-2">
              Pro Organizer <Sparkles className="w-6 h-6 text-amber-500" />
            </h2>
            <p className="mt-3 text-gray-600 font-medium">
              {pick({
                ru: "Для активных организаторов, которым нужны масштаб и контроль.",
                en: "For active organizers who need scale and control.",
                uz: "Masshtab va boshqaruv kerak bo'lgan faol tashkilotchilar uchun.",
              })}
            </p>
          </article>
        </div>

        <section className="mt-8 rounded-[34px] border border-gray-100 bg-white p-5 md:p-8 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="py-4 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {pick({ ru: "Возможность", en: "Feature", uz: "Imkoniyat" })}
                  </th>
                  <th className="py-4 pr-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Free
                  </th>
                  <th className="py-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature) => (
                  <tr key={feature.label} className="border-b border-gray-50">
                    <td className="py-4 pr-4 font-bold text-gray-700">{feature.label}</td>
                    <td className="py-4 pr-4 text-gray-500">
                      <span className="inline-flex items-center gap-2">
                        {feature.freeEnabled ? <Check className="w-4 h-4 text-emerald-500" /> : <X className="w-4 h-4 text-gray-300" />}
                        {feature.free}
                      </span>
                    </td>
                    <td className="py-4 text-gray-700 font-black">
                      <span className="inline-flex items-center gap-2">
                        {feature.premiumEnabled ? <Check className="w-4 h-4 text-amber-500" /> : <X className="w-4 h-4 text-gray-300" />}
                        {feature.premium}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 rounded-[30px] border border-gray-100 bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-gray-900">
              {isPremium
                ? pick({ ru: "У вас уже активен Premium", en: "You already have Premium", uz: "Sizda Premium allaqachon yoqilgan" })
                : pick({ ru: "Готовы перейти на Premium?", en: "Ready to upgrade to Premium?", uz: "Premiumga o'tishga tayyormisiz?" })}
            </h3>
            <p className="text-gray-500 font-medium mt-2">
              {pick({
                ru: "Подключение проходит через demo-оплату с формой карты и подтверждением.",
                en: "Upgrade goes through a demo card checkout flow with confirmation.",
                uz: "Ulanish karta formasi va tasdiqlash bilan demo to'lov orqali ishlaydi.",
              })}
            </p>
          </div>

          {user ? (
            <button
              onClick={handleTogglePlan}
              disabled={isSubmitting}
              className={`px-8 py-4 rounded-2xl text-white font-black uppercase text-[11px] tracking-widest transition-colors ${
                isPremium ? "bg-gray-900 hover:bg-black" : "bg-amber-500 hover:bg-amber-600"
              } disabled:opacity-60`}
            >
              {isSubmitting
                ? pick({ ru: "Обновление...", en: "Updating...", uz: "Yangilanmoqda..." })
                : isPremium
                  ? pick({ ru: "Переключить на Free", en: "Switch to Free", uz: "Free ga o'tish" })
                  : pick({ ru: "Перейти к оплате", en: "Proceed to checkout", uz: "To'lovga o'tish" })}
            </button>
          ) : (
            <Link
              href="/auth/login"
              className="inline-flex items-center px-8 py-4 rounded-2xl bg-gray-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest transition-colors"
            >
              {pick({ ru: "Войти, чтобы оформить", en: "Sign in to continue", uz: "Davom etish uchun kiring" })}
            </Link>
          )}
        </section>
      </div>

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[30px] border border-amber-100 bg-white shadow-2xl overflow-hidden">
            <div className="px-6 md:px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  {pick({ ru: "Demo checkout", en: "Demo checkout", uz: "Demo checkout" })}
                </p>
                <h3 className="text-2xl font-black text-gray-900 mt-1">
                  {pick({ ru: "Оплата Premium", en: "Premium payment", uz: "Premium to'lov" })}
                </h3>
              </div>
              <button
                onClick={closePaymentModal}
                disabled={isPaymentSubmitting || isSubmitting}
                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5 mx-auto" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="px-6 md:px-8 py-6 space-y-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-2">
                  <LockKeyhole className="w-4 h-4" />
                  {pick({
                    ru: "Это demo-оплата: деньги не списываются.",
                    en: "This is a demo payment: no real charge is made.",
                    uz: "Bu demo to'lov: haqiqiy pul yechilmaydi.",
                  })}
                </p>
                <p className="text-[11px] font-semibold text-amber-600 mt-2">
                  {pick({
                    ru: "Тест-карта: 4242 4242 4242 4242 (карта с 0000 в конце будет отклонена).",
                    en: "Test card: 4242 4242 4242 4242 (cards ending in 0000 are declined).",
                    uz: "Test karta: 4242 4242 4242 4242 (oxiri 0000 bo'lsa rad etiladi).",
                  })}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-3">
                  {pick({ ru: "Номер карты", en: "Card number", uz: "Karta raqami" })}
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={paymentForm.cardNumber}
                    onChange={(e) => {
                      setPaymentForm((prev) => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }));
                      setPaymentErrors((prev) => ({ ...prev, cardNumber: undefined }));
                    }}
                    placeholder="4242 4242 4242 4242"
                    className="w-full pl-11 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-amber-400 font-bold text-gray-900"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    disabled={isPaymentSubmitting || isSubmitting}
                  />
                </div>
                {paymentErrors.cardNumber ? <p className="text-xs font-bold text-red-500 ml-3">{paymentErrors.cardNumber}</p> : null}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-3">
                  {pick({ ru: "Держатель карты", en: "Cardholder name", uz: "Karta egasi" })}
                </label>
                <input
                  value={paymentForm.cardHolder}
                  onChange={(e) => {
                    setPaymentForm((prev) => ({ ...prev, cardHolder: e.target.value }));
                    setPaymentErrors((prev) => ({ ...prev, cardHolder: undefined }));
                  }}
                  placeholder="SHERZOD KARIMOV"
                  className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-amber-400 font-bold text-gray-900"
                  autoComplete="cc-name"
                  disabled={isPaymentSubmitting || isSubmitting}
                />
                {paymentErrors.cardHolder ? <p className="text-xs font-bold text-red-500 ml-3">{paymentErrors.cardHolder}</p> : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-3">
                    {pick({ ru: "Срок", en: "Expiry", uz: "Muddat" })}
                  </label>
                  <input
                    value={paymentForm.expiry}
                    onChange={(e) => {
                      setPaymentForm((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }));
                      setPaymentErrors((prev) => ({ ...prev, expiry: undefined }));
                    }}
                    placeholder="MM/YY"
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-amber-400 font-bold text-gray-900"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    disabled={isPaymentSubmitting || isSubmitting}
                  />
                  {paymentErrors.expiry ? <p className="text-xs font-bold text-red-500 ml-3">{paymentErrors.expiry}</p> : null}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-3">
                    CVC
                  </label>
                  <input
                    value={paymentForm.cvc}
                    onChange={(e) => {
                      setPaymentForm((prev) => ({ ...prev, cvc: onlyDigits(e.target.value).slice(0, 4) }));
                      setPaymentErrors((prev) => ({ ...prev, cvc: undefined }));
                    }}
                    placeholder="123"
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-amber-400 font-bold text-gray-900"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    disabled={isPaymentSubmitting || isSubmitting}
                  />
                  {paymentErrors.cvc ? <p className="text-xs font-bold text-red-500 ml-3">{paymentErrors.cvc}</p> : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={isPaymentSubmitting || isSubmitting}
                className="w-full mt-2 py-4 rounded-2xl bg-amber-500 text-white font-black uppercase text-[11px] tracking-widest hover:bg-amber-600 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {isPaymentSubmitting || isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {pick({ ru: "Обработка платежа...", en: "Processing payment...", uz: "To'lov qayta ishlanmoqda..." })}
                  </>
                ) : (
                  pick({ ru: "Оплатить и активировать Premium", en: "Pay and activate Premium", uz: "To'lash va Premiumni yoqish" })
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
        closeLabel={pick({ ru: "Понятно", en: "Got it", uz: "Tushunarli" })}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
