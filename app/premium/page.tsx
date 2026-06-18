"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from "@supabase/supabase-js";
import {
  Check,
  Copy,
  Crown,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import {
  getPremiumAccessType,
  getPremiumExpiresAt,
  hasPremiumAccess,
  hasUsedPremiumTrial,
  PREMIUM_TRIAL_DAYS,
} from "@/lib/auth/premium";
import { syncPremiumSessionUser } from "@/lib/auth/premium-session";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { FREE_POST_LIMIT } from "@/lib/events/limits";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

const PREMIUM_PRICE_UZS = Number(
  process.env.NEXT_PUBLIC_PREMIUM_PRICE_UZS ?? 50000,
);
const CARD_NUMBER = process.env.NEXT_PUBLIC_DONATION_CARD_NUMBER ?? "";
const CARD_HOLDER = process.env.NEXT_PUBLIC_DONATION_CARD_HOLDER ?? "";
const CARD_BANK = process.env.NEXT_PUBLIC_DONATION_CARD_BANK ?? "";
const TRANSFER_URL_TEMPLATE =
  process.env.NEXT_PUBLIC_DONATION_CARD_TRANSFER_URL_TEMPLATE ?? "";

type CopyField = "card" | "holder" | null;
type UploadedAttachment = {
  url: string;
  name: string;
  path: string;
};

type PremiumOffer = "trial" | "paid";
type SubmitMode = "trial" | "paid" | null;

function formatAmount(value: number) {
  return value.toLocaleString("ru-RU");
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function fillTransferTemplate(
  template: string,
  options: {
    amount: number;
    card: string;
    email: string;
    orderId: string;
    origin: string;
  },
) {
  if (!template) return "";

  const replacements: Record<string, string> = {
    "{amount}": String(options.amount),
    "{currency}": "UZS",
    "{orderId}": options.orderId,
    "{email}": options.email,
    "{returnUrl}": `${options.origin}/premium/success`,
    "{cancelUrl}": `${options.origin}/premium`,
    "{origin}": options.origin,
    "{provider}": "manual-premium",
    "{card}": options.card.replace(/\s+/g, ""),
  };

  return Object.entries(replacements).reduce((result, [token, value]) => {
    return result.split(token).join(encodeURIComponent(value));
  }, template);
}

export default function PremiumPage() {
  const { pick, locale } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitMode, setSubmitMode] = useState<SubmitMode>(null);
  const [selectedOffer, setSelectedOffer] = useState<PremiumOffer>("trial");
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [note, setNote] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [copyField, setCopyField] = useState<CopyField>(null);
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
  const supabaseUnavailableMessage = pick({
    ru: "Сервис временно недоступен. Попробуйте позже.",
    en: "The service is temporarily unavailable. Please try again later.",
    uz: "Xizmat vaqtincha mavjud emas. Keyinroq urinib ko'ring.",
  });

  const showAlert = (
    title: string,
    message: string,
    tone: AlertTone = "info",
  ) => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  const loadSessionUser = useCallback(async () => {
    if (!supabase) {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const nextUser = await syncPremiumSessionUser(
      supabase,
      session?.user ?? null,
    );

    setUser(nextUser);
    return nextUser;
  }, [supabase]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const nextUser = await loadSessionUser();
      if (!mounted) return;

      setPayerName(nextUser?.user_metadata?.full_name?.toString() || "");
      setPayerEmail(nextUser?.email || "");
      setContactPhone(nextUser?.user_metadata?.phone?.toString() || "");
      setLoading(false);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [loadSessionUser, supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        const nextUser = session?.user ?? null;
        setUser(nextUser);
        setPayerName(nextUser?.user_metadata?.full_name?.toString() || "");
        setPayerEmail(nextUser?.email || "");
        setContactPhone(nextUser?.user_metadata?.phone?.toString() || "");
      },
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const isPremium = hasPremiumAccess(user);
  const premiumAccessType = getPremiumAccessType(user);
  const trialUsed = hasUsedPremiumTrial(user);
  const isTrialActive = isPremium && premiumAccessType === "trial";
  const isPaidPremiumActive = isPremium && premiumAccessType !== "trial";
  const canStartTrial = Boolean(user) && !isPremium && !trialUsed;
  const premiumExpiresAt = getPremiumExpiresAt(user);
  const premiumEndsLabel = premiumExpiresAt
    ? new Date(premiumExpiresAt).toLocaleDateString(
        locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
        { day: "2-digit", month: "short", year: "numeric" },
      )
    : null;
  const premiumPlanLabel = isTrialActive
    ? pick({ ru: "Пробная версия", en: "Trial", uz: "Sinov" })
    : isPremium
      ? "Premium"
      : "Free";
  const isSubmitting = submitMode !== null;
  const cardReady = Boolean(CARD_NUMBER.trim() && CARD_HOLDER.trim());
  const paidPremiumUnavailableMessage = pick({
    ru: "Платный Premium временно недоступен, потому что реквизиты для перевода ещё не настроены.",
    en: "The paid Premium is temporarily unavailable because the transfer details are not configured yet.",
    uz: "Pullik Premium hozircha mavjud emas, chunki o'tkazma rekvizitlari hali sozlanmagan.",
  });

  useEffect(() => {
    if (isPremium) {
      setSelectedOffer("paid");
      return;
    }

    if (!canStartTrial && selectedOffer === "trial") {
      setSelectedOffer("paid");
    }
  }, [canStartTrial, isPremium, selectedOffer]);

  const transferUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return fillTransferTemplate(TRANSFER_URL_TEMPLATE, {
      amount: PREMIUM_PRICE_UZS,
      card: CARD_NUMBER,
      email: payerEmail,
      orderId: `manual-premium-${Date.now()}`,
      origin: window.location.origin,
    });
  }, [payerEmail]);

  const features = [
    {
      label: pick({
        ru: "Публикационные слоты",
        en: "Publication slots",
        uz: "Nashr slotlari",
      }),
      free: pick({
        ru: `${FREE_POST_LIMIT} за всё время`,
        en: `${FREE_POST_LIMIT} total`,
        uz: `${FREE_POST_LIMIT} jami`,
      }),
      premium: pick({ ru: "Без лимита", en: "Unlimited", uz: "Cheksiz" }),
      freeEnabled: true,
      premiumEnabled: true,
    },
    {
      label: pick({
        ru: "Impact-аналитика",
        en: "Impact analytics",
        uz: "Impact analitika",
      }),
      free: pick({ ru: "Базово", en: "Basic", uz: "Asosiy" }),
      premium: pick({ ru: "Расширено", en: "Advanced", uz: "Kengaytirilgan" }),
      freeEnabled: false,
      premiumEnabled: true,
    },
    {
      label: pick({
        ru: "Приоритет в ленте",
        en: "Feed priority",
        uz: "Lentadagi ustuvorlik",
      }),
      free: "—",
      premium: pick({
        ru: "Выше обычных объявлений",
        en: "Above regular posts",
        uz: "Oddiy e'lonlardan yuqorida",
      }),
      freeEnabled: false,
      premiumEnabled: true,
    },
    {
      label: pick({
        ru: "Экспорт и отчёты",
        en: "Exports and reports",
        uz: "Eksport va hisobotlar",
      }),
      free: "—",
      premium: pick({
        ru: "CSV и расширенные метрики",
        en: "CSV and advanced metrics",
        uz: "CSV va kengaytirilgan metrikalar",
      }),
      freeEnabled: false,
      premiumEnabled: true,
    },
  ];

  const paymentSteps = [
    pick({
      ru: "Переведите точную сумму тарифа на карту в своём банковском приложении.",
      en: "Transfer the exact plan price to the card in your banking app.",
      uz: "Bankingiz ilovasida tarifning aniq summasini kartaga o'tkazing.",
    }),
    pick({
      ru: "Добавьте ID операции, время или ориентир, чтобы перевод можно было найти.",
      en: "Add the operation ID, time, or reference so the transfer can be found.",
      uz: "O'tkazmani topish uchun operatsiya ID, vaqt yoki ma'lumot qo'shing.",
    }),
    pick({
      ru: "После подтверждения Premium включается на 1 месяц, а объявления поднимаются выше.",
      en: "After confirmation, Premium is enabled for 1 month and listings move higher.",
      uz: "Tasdiqlangach, Premium 1 oyga yoqiladi va e'lonlar yuqoriga ko'tariladi.",
    }),
  ];

  const trialSteps = [
    pick({
      ru: "Запускаете пробную версию одной кнопкой.",
      en: "Start the trial with one button.",
      uz: "Sinovni bitta tugma bilan ishga tushirasiz.",
    }),
    pick({
      ru: "Сразу получаете приоритет, аналитику и все Premium-возможности.",
      en: "Instantly get priority, analytics, and all Premium features.",
      uz: "Darhol ustuvorlik, analitika va barcha Premium imkoniyatlariga ega bo'lasiz.",
    }),
    pick({
      ru: `Через ${PREMIUM_TRIAL_DAYS} дней trial закончится, и можно перейти на платную версию.`,
      en: `After ${PREMIUM_TRIAL_DAYS} days the trial ends, and you can switch to paid.`,
      uz: `${PREMIUM_TRIAL_DAYS} kundan keyin sinov tugaydi va pullik versiyaga o'tishingiz mumkin.`,
    }),
  ];

  const activeSteps = selectedOffer === "trial" ? trialSteps : paymentSteps;

  const handleCopy = async (value: string, field: Exclude<CopyField, null>) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyField(field);
      window.setTimeout(() => setCopyField(null), 1500);
    } catch {
      showAlert(
        pick({
          ru: "Ошибка копирования",
          en: "Copy error",
          uz: "Nusxalash xatosi",
        }),
        pick({
          ru: "Не удалось скопировать значение.",
          en: "Could not copy the value.",
          uz: "Qiymatni nusxalab bo'lmadi.",
        }),
        "error",
      );
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      router.push("/auth/login?next=/premium");
      return;
    }

    if (!supabase) {
      showAlert(
        pick({
          ru: "Premium временно недоступен",
          en: "Premium is temporarily unavailable",
          uz: "Premium vaqtincha mavjud emas",
        }),
        supabaseUnavailableMessage,
        "error",
      );
      return;
    }

    if (!canStartTrial) {
      showAlert(
        pick({
          ru: "Пробная версия недоступна",
          en: "Trial unavailable",
          uz: "Sinov mavjud emas",
        }),
        trialUsed
          ? pick({
              ru: "Пробную версию Premium можно включить только один раз.",
              en: "The Premium trial can only be started once per account.",
              uz: "Premium sinovini faqat bir marta yoqish mumkin.",
            })
          : pick({
              ru: "Для этого аккаунта уже активен Premium.",
              en: "Premium is already active for this account.",
              uz: "Bu akkaunt uchun Premium allaqachon faol.",
            }),
        "warning",
      );
      return;
    }

    try {
      setSubmitMode("trial");

      const response = await fetch("/api/premium/trial", {
        method: "POST",
      });

      const payload = (await response.json().catch(() => null)) as {
        expiresAt?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.expiresAt) {
        throw new Error(
          payload?.error ||
            pick({
              ru: "Не удалось включить пробную версию Premium.",
              en: "Could not activate the Premium trial.",
              uz: "Premium sinovini yoqib bo'lmadi.",
            }),
        );
      }

      await supabase.auth.refreshSession();
      await loadSessionUser();

      const trialEndsLabel = new Date(payload.expiresAt).toLocaleDateString(
        locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
        { day: "2-digit", month: "short", year: "numeric" },
      );

      showAlert(
        pick({
          ru: "Пробная версия активирована",
          en: "Trial activated",
          uz: "Sinov yoqildi",
        }),
        pick({
          ru: `Пробная версия Premium активна до ${trialEndsLabel}.`,
          en: `Your Premium trial is active until ${trialEndsLabel}.`,
          uz: `Premium sinovi ${trialEndsLabel} gacha yoqildi.`,
        }),
        "success",
      );
    } catch (error) {
      showAlert(
        pick({ ru: "Ошибка trial", en: "Trial error", uz: "Sinov xatosi" }),
        error instanceof Error
          ? error.message
          : pick({
              ru: "Неизвестная ошибка",
              en: "Unknown error",
              uz: "Noma'lum xatolik",
            }),
        "error",
      );
    } finally {
      setSubmitMode(null);
    }
  };

  const handleManualRequest = async () => {
    if (!user) {
      router.push("/auth/login?next=/premium");
      return;
    }

    if (!cardReady) {
      showAlert(
        pick({
          ru: "Оплата недоступна",
          en: "Payment unavailable",
          uz: "To'lov mavjud emas",
        }),
        pick({
          ru: "Подключение Premium временно недоступно.",
          en: "Premium activation is temporarily unavailable.",
          uz: "Premium ulash hozircha mavjud emas.",
        }),
        "warning",
      );
      return;
    }

    if (!transferReference.trim()) {
      showAlert(
        pick({
          ru: "Нужно подтверждение",
          en: "Reference required",
          uz: "Tasdiq kerak",
        }),
        pick({
          ru: "Добавьте, как найти перевод: ID операции, время или последние 4 цифры карты.",
          en: "Add how to find the transfer: operation ID, time, or last 4 card digits.",
          uz: "O'tkazmani qanday topishni yozing: operatsiya ID, vaqt yoki kartaning oxirgi 4 raqami.",
        }),
        "warning",
      );
      return;
    }

    try {
      setSubmitMode("paid");
      let attachment: UploadedAttachment | null = null;

      if (attachmentFile) {
        const formData = new FormData();
        formData.append("kind", "premium");
        formData.append("file", attachmentFile);

        const uploadResponse = await fetch("/api/manual-payments/upload", {
          method: "POST",
          body: formData,
        });

        const uploadPayload = (await uploadResponse
          .json()
          .catch(() => null)) as {
          file?: UploadedAttachment;
          error?: string;
        } | null;

        if (!uploadResponse.ok || !uploadPayload?.file) {
          throw new Error(
            uploadPayload?.error ||
              pick({
                ru: "Не удалось загрузить вложение.",
                en: "Could not upload the attachment.",
                uz: "Biriktirma yuklanmadi.",
              }),
          );
        }

        attachment = uploadPayload.file;
      }

      const response = await fetch("/api/manual-payments/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "premium",
          amount: PREMIUM_PRICE_UZS,
          payerName: payerName.trim() || undefined,
          payerEmail: payerEmail.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          transferReference: transferReference.trim(),
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentPath: attachment?.path,
          note: note.trim() || undefined,
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        requestId?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.requestId) {
        throw new Error(
          payload?.error ||
            pick({
              ru: "Не удалось отправить Premium на проверку.",
              en: "Could not submit Premium for review.",
              uz: "Premium ni tekshiruvga yuborib bo'lmadi.",
            }),
        );
      }

      router.push(
        `/premium/success?request=${encodeURIComponent(payload.requestId)}`,
      );
    } catch (error) {
      showAlert(
        pick({
          ru: "Ошибка отправки",
          en: "Submission error",
          uz: "Yuborish xatosi",
        }),
        error instanceof Error
          ? error.message
          : pick({
              ru: "Неизвестная ошибка",
              en: "Unknown error",
              uz: "Noma'lum xatolik",
            }),
        "error",
      );
    } finally {
      setSubmitMode(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12 md:py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700 mb-4">
            <Crown className="w-3.5 h-3.5" />
            {pick({
              ru: "Для организаторов",
              en: "For organizers",
              uz: "Tashkilotchilar uchun",
            })}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            {pick({
              ru: "Попробуйте Premium бесплатно или подключите полный месяц",
              en: "Try Premium for free or activate the full month",
              uz: "Premium ni bepul sinab ko'ring yoki to'liq oyga yoqing",
            })}
          </h1>
          <p className="mt-3 text-slate-500 max-w-xl mx-auto">
            {pick({
              ru: "Пробный доступ на 7 дней или платный Premium на 1 месяц с приоритетом в каталоге и безлимитом на публикации.",
              en: "A 7-day trial or a paid 1-month Premium with catalog priority and unlimited publishing.",
              uz: "7 kunlik sinov yoki katalogdagi ustuvorlik va cheksiz nashr bilan 1 oylik Premium.",
            })}
          </p>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            {formatAmount(PREMIUM_PRICE_UZS)} UZS /{" "}
            {pick({ ru: "мес", en: "mo", uz: "oy" })}
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Left Column: Features & Info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Comparison Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border-b border-slate-100 text-xs font-medium text-slate-500">
                <div>
                  {pick({ ru: "Функция", en: "Feature", uz: "Imkoniyat" })}
                </div>
                <div className="text-center">Free</div>
                <div className="text-center">Premium</div>
              </div>
              <div className="divide-y divide-slate-100">
                {features.map((feature) => (
                  <div
                    key={feature.label}
                    className="grid grid-cols-3 gap-4 p-4 items-center text-sm"
                  >
                    <div className="font-medium text-slate-900">
                      {feature.label}
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-slate-500">
                      {feature.freeEnabled ? (
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span>{feature.free}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 text-slate-700 font-medium">
                      {feature.premiumEnabled ? (
                        <Check className="w-4 h-4 text-amber-500 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                      <span>{feature.premium}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4">
                {selectedOffer === "trial"
                  ? pick({
                      ru: "Как запускается пробная версия",
                      en: "How the trial starts",
                      uz: "Sinov qanday ishga tushadi",
                    })
                  : pick({
                      ru: "Как подключается платный Premium",
                      en: "How paid Premium works",
                      uz: "Pullik Premium qanday ulanadi",
                    })}
              </h3>
              <ol className="space-y-4">
                {activeSteps.map((step, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-600">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                      {index + 1}
                    </div>
                    <p className="pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right Column: Action Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:sticky lg:top-8 space-y-6">
              {/* Current Status */}
              <div className="flex items-center justify-between pb-6 border-b border-slate-100">
                <div>
                  <p className="text-xs text-slate-500">
                    {pick({
                      ru: "Текущий план",
                      en: "Current plan",
                      uz: "Joriy tarif",
                    })}
                  </p>
                  <p className="text-xl font-bold text-slate-900 mt-1">
                    {premiumPlanLabel}
                  </p>
                </div>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${isPremium ? "bg-amber-50 text-amber-500" : "bg-slate-50 text-slate-400"}`}
                >
                  {isPremium ? (
                    <Crown className="h-5 w-5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                </div>
              </div>

              {isPaidPremiumActive ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                  {pick({
                    ru: premiumEndsLabel
                      ? `Платный Premium активен до ${premiumEndsLabel}.`
                      : "Платный Premium активен.",
                    en: premiumEndsLabel
                      ? `Paid Premium is active until ${premiumEndsLabel}.`
                      : "Paid Premium is active.",
                    uz: premiumEndsLabel
                      ? `Pullik Premium ${premiumEndsLabel} gacha faol.`
                      : "Pullik Premium faol.",
                  })}
                </div>
              ) : (
                <>
                  {/* Offer Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedOffer("trial")}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        selectedOffer === "trial"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-medium text-emerald-600">
                        {pick({
                          ru: "Пробная версия",
                          en: "Trial",
                          uz: "Sinov",
                        })}
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {PREMIUM_TRIAL_DAYS}{" "}
                        {pick({ ru: "дней", en: "days", uz: "kun" })}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedOffer("paid")}
                      className={`rounded-xl border p-3 text-left transition-colors ${
                        selectedOffer === "paid"
                          ? "border-amber-500 bg-amber-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-xs font-medium text-amber-600">
                        {pick({
                          ru: "Платная версия",
                          en: "Paid",
                          uz: "Pullik",
                        })}
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {formatAmount(PREMIUM_PRICE_UZS)} UZS
                      </p>
                    </button>
                  </div>

                  {/* Trial Form */}
                  {selectedOffer === "trial" && (
                    <div className="space-y-4">
                      {isTrialActive ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
                          {pick({
                            ru: premiumEndsLabel
                              ? `Пробная версия активна до ${premiumEndsLabel}.`
                              : "Пробная версия активна.",
                            en: premiumEndsLabel
                              ? `Trial is active until ${premiumEndsLabel}.`
                              : "Trial is active.",
                            uz: premiumEndsLabel
                              ? `Sinov ${premiumEndsLabel} gacha faol.`
                              : "Sinov faol.",
                          })}
                        </div>
                      ) : trialUsed ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600">
                          {pick({
                            ru: "Пробная версия уже использована.",
                            en: "Trial already used.",
                            uz: "Sinov allaqachon ishlatilgan.",
                          })}
                        </div>
                      ) : null}

                      {user ? (
                        <button
                          onClick={handleStartTrial}
                          disabled={isSubmitting || !canStartTrial}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          {submitMode === "trial" ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {canStartTrial
                            ? pick({
                                ru: "Запустить пробную версию",
                                en: "Start trial",
                                uz: "Sinovni yoqish",
                              })
                            : pick({
                                ru: "Недоступно",
                                en: "Unavailable",
                                uz: "Mavjud emas",
                              })}
                        </button>
                      ) : (
                        <Link
                          href="/auth/login?next=/premium"
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                          {pick({
                            ru: "Войти, чтобы попробовать",
                            en: "Sign in to try",
                            uz: "Sinash uchun kiring",
                          })}
                        </Link>
                      )}
                    </div>
                  )}

                  {/* Paid Form */}
                  {selectedOffer === "paid" && (
                    <div className="space-y-4">
                      {!cardReady ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                          {paidPremiumUnavailableMessage}
                        </div>
                      ) : (
                        <>
                          {/* Card Details */}
                          <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">
                                {pick({ ru: "Карта", en: "Card", uz: "Karta" })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {formatCardNumber(CARD_NUMBER)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(CARD_NUMBER, "card")
                                  }
                                  className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  {copyField === "card" ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">
                                {pick({
                                  ru: "Владелец",
                                  en: "Holder",
                                  uz: "Egasi",
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {CARD_HOLDER}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleCopy(CARD_HOLDER, "holder")
                                  }
                                  className="text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                  {copyField === "holder" ? (
                                    <Check className="w-4 h-4 text-emerald-500" />
                                  ) : (
                                    <Copy className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500">
                                {pick({ ru: "Банк", en: "Bank", uz: "Bank" })}
                              </span>
                              <span className="font-medium text-slate-900">
                                {CARD_BANK || "—"}
                              </span>
                            </div>
                          </div>

                          {user ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  {pick({
                                    ru: "Как найти ваш перевод",
                                    en: "How to find your transfer",
                                    uz: "O'tkazmani qanday topish",
                                  })}
                                </label>
                                <textarea
                                  rows={2}
                                  value={transferReference}
                                  onChange={(event) =>
                                    setTransferReference(event.target.value)
                                  }
                                  placeholder={pick({
                                    ru: "ID операции, время или последние 4 цифры",
                                    en: "Operation ID, time, or last 4 digits",
                                    uz: "Operatsiya ID, vaqt yoki oxirgi 4 raqam",
                                  })}
                                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                  {pick({
                                    ru: "Чек или скриншот",
                                    en: "Receipt or screenshot",
                                    uz: "Chek yoki skrinshot",
                                  })}
                                </label>
                                <label className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-3 cursor-pointer hover:border-slate-400 transition-colors">
                                  <Paperclip className="w-5 h-5 text-slate-400" />
                                  <div className="flex-1 text-sm text-slate-500">
                                    {attachmentFile ? (
                                      <span className="text-slate-900 font-medium">
                                        {attachmentFile.name}
                                      </span>
                                    ) : (
                                      pick({
                                        ru: "Прикрепить файл",
                                        en: "Attach file",
                                        uz: "Fayl biriktirish",
                                      })
                                    )}
                                  </div>
                                  <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                                    className="hidden"
                                    onChange={(event) =>
                                      setAttachmentFile(
                                        event.target.files?.[0] ?? null,
                                      )
                                    }
                                  />
                                </label>
                              </div>

                              <details className="group">
                                <summary className="cursor-pointer text-sm font-medium text-slate-500 hover:text-slate-700 list-none flex items-center gap-1">
                                  {pick({
                                    ru: "Контакты и комментарий",
                                    en: "Contacts and comment",
                                    uz: "Kontaktlar va izoh",
                                  })}
                                </summary>
                                <div className="mt-3 space-y-3 pt-3 border-t border-slate-100">
                                  <input
                                    value={payerName}
                                    onChange={(e) =>
                                      setPayerName(e.target.value)
                                    }
                                    placeholder={pick({
                                      ru: "Имя",
                                      en: "Name",
                                      uz: "Ism",
                                    })}
                                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm outline-none focus:border-emerald-500"
                                  />
                                  <div className="grid grid-cols-2 gap-3">
                                    <input
                                      type="email"
                                      value={payerEmail}
                                      onChange={(e) =>
                                        setPayerEmail(e.target.value)
                                      }
                                      placeholder="Email"
                                      className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm outline-none focus:border-emerald-500"
                                    />
                                    <input
                                      value={contactPhone}
                                      onChange={(e) =>
                                        setContactPhone(e.target.value)
                                      }
                                      placeholder={pick({
                                        ru: "Телефон",
                                        en: "Phone",
                                        uz: "Telefon",
                                      })}
                                      className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder={pick({
                                      ru: "Комментарий",
                                      en: "Comment",
                                      uz: "Izoh",
                                    })}
                                    rows={2}
                                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-sm outline-none focus:border-emerald-500"
                                  />
                                </div>
                              </details>

                              {transferUrl && (
                                <a
                                  href={transferUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  {pick({
                                    ru: "Открыть банк",
                                    en: "Open bank app",
                                    uz: "Bank ilovasini ochish",
                                  })}
                                </a>
                              )}

                              <button
                                onClick={handleManualRequest}
                                disabled={isSubmitting || !cardReady}
                                className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-500 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                              >
                                {submitMode === "paid" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ShieldCheck className="h-4 w-4" />
                                )}
                                {pick({
                                  ru: "Отправить на проверку",
                                  en: "Submit for review",
                                  uz: "Tekshiruvga yuborish",
                                })}
                              </button>
                            </div>
                          ) : (
                            <Link
                              href="/auth/login?next=/premium"
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                            >
                              {pick({
                                ru: "Войти для оплаты",
                                en: "Sign in to pay",
                                uz: "To'lov uchun kiring",
                              })}
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
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
