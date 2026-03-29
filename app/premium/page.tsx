"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User as SupabaseUser } from "@supabase/supabase-js";
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
  needsPremiumStateSync,
  PREMIUM_TRIAL_DAYS,
} from "@/lib/auth/premium";
import { useLanguage } from "@/components/providers/LanguageProvider";
import AlertModal, { type AlertTone } from "@/components/ui/AlertModal";
import { FREE_POST_LIMIT } from "@/lib/events/limits";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

const PREMIUM_PRICE_UZS = Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_UZS ?? 50000);
const CARD_NUMBER = process.env.NEXT_PUBLIC_DONATION_CARD_NUMBER ?? "";
const CARD_HOLDER = process.env.NEXT_PUBLIC_DONATION_CARD_HOLDER ?? "";
const CARD_BANK = process.env.NEXT_PUBLIC_DONATION_CARD_BANK ?? "";
const TRANSFER_URL_TEMPLATE = process.env.NEXT_PUBLIC_DONATION_CARD_TRANSFER_URL_TEMPLATE ?? "";

type CopyField = "card" | "holder" | null;
type UploadedAttachment = {
  url: string;
  name: string;
  path: string;
};

type PremiumOffer = "trial" | "paid";
type SubmitMode = "trial" | "paid" | "downgrade" | null;

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

  const showAlert = (title: string, message: string, tone: AlertTone = "info") => {
    setAlertModal({ isOpen: true, title, message, tone });
  };

  const loadSessionUser = useCallback(async () => {
    if (!supabase) {
      return null;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    let nextUser = session?.user ?? null;

    if (nextUser && needsPremiumStateSync(nextUser)) {
      const response = await fetch("/api/premium/status", {
        cache: "no-store",
      });

      if (response.ok) {
        await supabase.auth.refreshSession();
        const {
          data: { session: refreshedSession },
        } = await supabase.auth.getSession();
        nextUser = refreshedSession?.user ?? nextUser;
      }
    }

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

  const isPremium = hasPremiumAccess(user);
  const premiumAccessType = getPremiumAccessType(user);
  const trialUsed = hasUsedPremiumTrial(user);
  const isTrialActive = isPremium && premiumAccessType === "trial";
  const isPaidPremiumActive = isPremium && premiumAccessType !== "trial";
  const canStartTrial = Boolean(user) && !isPremium && !trialUsed;
  const premiumExpiresAt = getPremiumExpiresAt(user);
  const premiumEndsLabel =
    premiumExpiresAt
      ? new Date(premiumExpiresAt).toLocaleDateString(
          locale === "ru" ? "ru-RU" : locale === "uz" ? "uz-UZ" : "en-US",
          { day: "2-digit", month: "short", year: "numeric" },
        )
      : null;
  const premiumPlanLabel =
    isTrialActive
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
      premium: pick({ ru: "Выше обычных объявлений", en: "Above regular posts", uz: "Oddiy e'lonlardan yuqorida" }),
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
      premium: pick({ ru: "CSV и расширенные метрики", en: "CSV and advanced metrics", uz: "CSV va kengaytirilgan metrikalar" }),
      freeEnabled: false,
      premiumEnabled: true,
    },
  ];

  const highlights = [
    {
      title: pick({ ru: "Больше охвата", en: "More reach", uz: "Ko'proq qamrov" }),
      description: pick({
        ru: "Premium-события поднимаются выше обычных карточек и выделяются в каталоге.",
        en: "Premium events appear above standard cards and stand out in the catalog.",
        uz: "Premium tadbirlar oddiy kartalardan yuqorida turadi va katalogda ajralib ko'rinadi.",
      }),
    },
    {
      title: pick({ ru: "Слоты не сгорают зря", en: "No wasted slots", uz: "Slotlar bekorga ketmaydi" }),
      description: pick({
        ru: "На free-плане у вас только 5 публикационных слотов за всё время, и удаление объявления их не возвращает. Premium снимает этот потолок.",
        en: "On the free plan you only get 5 lifetime publication slots, and deleting a post does not return them. Premium removes that ceiling.",
        uz: "Free tarifda sizda jami 5 ta umrboqiy nashr sloti bo'ladi va e'lonni o'chirish ularni qaytarmaydi. Premium bu cheklovni olib tashlaydi.",
      }),
    },
    {
      title: pick({ ru: "Нормальная аналитика", en: "Useful analytics", uz: "Foydali analitika" }),
      description: pick({
        ru: "В кабинете появляются impact-метрики, attendance и экспорт данных.",
        en: "Your dashboard unlocks impact metrics, attendance tracking, and exports.",
        uz: "Kabinetda impact metrikalari, attendance va eksport paydo bo'ladi.",
      }),
    },
    {
      title: pick({ ru: "Подтверждение оплаты", en: "Payment confirmation", uz: "To'lov tasdig'i" }),
      description: pick({
        ru: "После подтверждения оплаты Premium активируется на 1 месяц и сразу открывает все преимущества тарифа.",
        en: "After the payment is confirmed, Premium is activated for 1 month and unlocks all plan benefits right away.",
        uz: "To'lov tasdiqlangach, Premium 1 oyga yoqiladi va tarifning barcha afzalliklarini darhol ochadi.",
      }),
    },
  ];

  const paymentSteps = [
    pick({
      ru: "Смотрите реквизиты карты и переводите точную сумму тарифа в своём банковском приложении.",
      en: "See the card details and transfer the exact plan price in your banking app.",
      uz: "Karta rekvizitlarini ko'ring va bankingiz ilovasida tarifning aniq summasini o'tkazing.",
    }),
    pick({
      ru: "Добавляете ID операции, время или другой ориентир, чтобы перевод можно было быстро найти.",
      en: "Add the operation ID, time, or another reference so the transfer can be found quickly.",
      uz: "O'tkazmani tez topish uchun operatsiya ID, vaqt yoki boshqa ma'lumot qo'shing.",
    }),
    pick({
      ru: "После подтверждения оплаты Premium включается на 1 месяц, а объявления поднимаются выше обычных.",
      en: "After the payment is confirmed, Premium is enabled for 1 month and your listings move above regular ones.",
      uz: "To'lov tasdiqlangach, Premium 1 oyga yoqiladi va e'lonlaringiz oddiylaridan yuqoriga ko'tariladi.",
    }),
  ];

  const trialSteps = [
    pick({
      ru: "Входите в аккаунт и запускаете пробную версию одной кнопкой.",
      en: "Sign in and start the trial with one button.",
      uz: "Akkauntga kirib, sinovni bitta tugma bilan ishga tushirasiz.",
    }),
    pick({
      ru: "Сразу получаете приоритет в каталоге, аналитику и все Premium-возможности.",
      en: "You instantly get catalog priority, analytics, and all Premium benefits.",
      uz: "Darhol katalogdagi ustuvorlik, analitika va barcha Premium imkoniyatlariga ega bo'lasiz.",
    }),
    pick({
      ru: "Через 7 дней trial закончится, и вы сможете перейти на платную версию без потери времени.",
      en: "After 7 days the trial ends, and you can switch to the paid version without losing momentum.",
      uz: "7 kundan keyin sinov tugaydi va siz pullik versiyaga o'tishingiz mumkin.",
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
        pick({ ru: "Ошибка копирования", en: "Copy error", uz: "Nusxalash xatosi" }),
        pick({
          ru: "Не удалось скопировать значение.",
          en: "Could not copy the value.",
          uz: "Qiymatni nusxalab bo'lmadi.",
        }),
        "error",
      );
    }
  };

  const handleDowngrade = async () => {
    try {
      setSubmitMode("downgrade");

      const response = await fetch("/api/premium/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "downgrade" }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(
          payload?.error ||
            pick({
              ru: "Не удалось отключить Premium.",
              en: "Could not disable Premium.",
              uz: "Premium ni o'chirib bo'lmadi.",
            }),
        );
      }

      if (supabase) {
        await supabase.auth.refreshSession();
      }
      await loadSessionUser();

      showAlert(
        pick({ ru: "Premium отключён", en: "Premium disabled", uz: "Premium o'chirildi" }),
        pick({
          ru: "Тариф переключён обратно на Free.",
          en: "Your plan has been switched back to Free.",
          uz: "Tarif yana Free ga o'tkazildi.",
        }),
        "success",
      );
    } catch (error) {
      showAlert(
        pick({ ru: "Ошибка тарифа", en: "Plan error", uz: "Tarif xatosi" }),
        error instanceof Error ? error.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" }),
        "error",
      );
    } finally {
      setSubmitMode(null);
    }
  };

  const handleStartTrial = async () => {
    if (!user) {
      router.push("/auth/login?next=/premium");
      return;
    }

    if (!supabase) {
      showAlert(
        pick({ ru: "Premium временно недоступен", en: "Premium is temporarily unavailable", uz: "Premium vaqtincha mavjud emas" }),
        supabaseUnavailableMessage,
        "error",
      );
      return;
    }

    if (!canStartTrial) {
      showAlert(
        pick({ ru: "Пробная версия недоступна", en: "Trial unavailable", uz: "Sinov mavjud emas" }),
        trialUsed
          ? pick({
              ru: "Пробную версию Premium можно включить только один раз для одного аккаунта.",
              en: "The Premium trial can only be started once per account.",
              uz: "Premium sinovini har bir akkaunt uchun faqat bir marta yoqish mumkin.",
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

      const payload = (await response.json().catch(() => null)) as
        | { expiresAt?: string; error?: string }
        | null;

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
        pick({ ru: "Пробная версия активирована", en: "Trial activated", uz: "Sinov yoqildi" }),
        pick({
          ru: `Пробная версия Premium уже активна и будет работать до ${trialEndsLabel}.`,
          en: `Your Premium trial is active and will work until ${trialEndsLabel}.`,
          uz: `Premium sinovi yoqildi va ${trialEndsLabel} gacha ishlaydi.`,
        }),
        "success",
      );
    } catch (error) {
      showAlert(
        pick({ ru: "Ошибка trial", en: "Trial error", uz: "Sinov xatosi" }),
        error instanceof Error ? error.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" }),
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
        pick({ ru: "Оплата недоступна", en: "Payment unavailable", uz: "To'lov mavjud emas" }),
        pick({
          ru: "Подключение Premium временно недоступно. Попробуйте позже.",
          en: "Premium activation is temporarily unavailable. Please try again later.",
          uz: "Premium ulash hozircha mavjud emas. Keyinroq yana urinib ko'ring.",
        }),
        "warning",
      );
      return;
    }

    if (!transferReference.trim()) {
      showAlert(
        pick({ ru: "Нужно подтверждение", en: "Reference required", uz: "Tasdiq kerak" }),
        pick({
          ru: "Добавьте, как найти перевод: ID операции, время или последние 4 цифры карты. Без этого Premium будет сложно подтвердить.",
          en: "Add how to find the transfer: operation ID, time, or last 4 card digits. Premium is hard to confirm without it.",
          uz: "O'tkazmani qanday topishni yozing: operatsiya ID, vaqt yoki kartaning oxirgi 4 raqami. Busiz Premium ni tasdiqlash qiyin.",
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

        const uploadPayload = (await uploadResponse.json().catch(() => null)) as
          | { file?: UploadedAttachment; error?: string }
          | null;

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

      const payload = (await response.json().catch(() => null)) as
        | { requestId?: string; error?: string }
        | null;

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

      router.push(`/premium/success?request=${encodeURIComponent(payload.requestId)}`);
    } catch (error) {
      showAlert(
        pick({ ru: "Ошибка отправки", en: "Submission error", uz: "Yuborish xatosi" }),
        error instanceof Error ? error.message : pick({ ru: "Неизвестная ошибка", en: "Unknown error", uz: "Noma'lum xatolik" }),
        "error",
      );
    } finally {
      setSubmitMode(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <Loader2 className="h-10 w-10 animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fffaf1_0%,_#ffffff_38%,_#f8fafc_100%)] px-4 py-10 md:py-14">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[40px] border border-amber-200/70 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_54%,_#fffbeb_100%)] shadow-[0_30px_90px_rgba(17,24,39,0.08)]">
          <div className="grid gap-8 p-7 md:p-10 2xl:grid-cols-[minmax(0,1.1fr)_380px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-100/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-700 sm:tracking-[0.2em]">
                <Crown className="h-3.5 w-3.5 shrink-0" />
                {pick({ ru: "Premium для организаторов", en: "Premium for organizers", uz: "Tashkilotchilar uchun Premium" })}
              </div>
              <h1 className="mt-5 max-w-3xl text-[clamp(1.75rem,5vw,3.4rem)] font-black uppercase italic leading-[0.95] tracking-[-0.04em] text-slate-950">
                {pick({
                  ru: "Выберите: попробовать Premium бесплатно или подключить полный месяц",
                  en: "Choose: try Premium for free or activate the full month",
                  uz: "Tanlang: Premium ni bepul sinab ko'ring yoki to'liq oyga yoqing",
                })}
              </h1>
              <p className="mt-5 max-w-3xl text-base font-semibold leading-8 text-slate-600">
                {pick({
                  ru: "Сначала можно включить пробную версию на 7 дней, а если нужен полный доступ без пауз, выбрать платный Premium на 1 месяц с приоритетом в каталоге, аналитикой и безлимитом на публикации.",
                  en: "You can start with a 7-day trial, and if you need the full access without interruptions, switch to the paid 1-month Premium with catalog priority, analytics, and unlimited publishing.",
                  uz: "Avval 7 kunlik sinovni yoqishingiz mumkin, keyin esa to'liq kirish kerak bo'lsa katalogdagi ustuvorlik, analitika va cheksiz nashr bilan 1 oylik Premium ni tanlaysiz.",
                })}
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-[24px] border border-white bg-white/90 px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {pick({ ru: "Цена", en: "Price", uz: "Narx" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{formatAmount(PREMIUM_PRICE_UZS)} UZS</p>
                </div>
                <div className="rounded-[24px] border border-white bg-white/90 px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {pick({ ru: "Пробный доступ", en: "Trial access", uz: "Sinov muddati" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {pick({ ru: `${PREMIUM_TRIAL_DAYS} дней`, en: `${PREMIUM_TRIAL_DAYS} days`, uz: `${PREMIUM_TRIAL_DAYS} kun` })}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white bg-white/90 px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {pick({ ru: "Слоты free", en: "Free slots", uz: "Free slotlar" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{isPremium ? "∞" : FREE_POST_LIMIT}</p>
                </div>
                <div className="rounded-[24px] border border-white bg-white/90 px-5 py-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {pick({ ru: "Срок", en: "Duration", uz: "Muddat" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">
                    {isPremium
                      ? (premiumEndsLabel ?? pick({ ru: "1 месяц", en: "1 month", uz: "1 oy" }))
                      : pick({ ru: "1 месяц", en: "1 month", uz: "1 oy" })}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 md:grid-cols-3">
                {highlights.map((item) => (
                  <article key={item.title} className="rounded-[28px] border border-white/90 bg-white/85 p-5 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">
                      {pick({ ru: "Зачем это нужно", en: "Why it matters", uz: "Nega bu kerak" })}
                    </p>
                    <h2 className="mt-3 text-xl font-black text-slate-950">{item.title}</h2>
                    <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{item.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <aside className="rounded-[34px] border border-white/80 bg-white/95 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {pick({ ru: "Текущий план", en: "Current plan", uz: "Joriy tarif" })}
                  </p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{premiumPlanLabel}</p>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    {isTrialActive
                      ? pick({
                          ru: premiumEndsLabel
                            ? `Пробная версия Premium активна до ${premiumEndsLabel}. Вы уже видите свои объявления выше и можете оценить аналитику.`
                            : "Пробная версия Premium уже активна.",
                          en: premiumEndsLabel
                            ? `Your Premium trial is active until ${premiumEndsLabel}. Your events are already prioritized and analytics are available.`
                            : "Your Premium trial is already active.",
                          uz: premiumEndsLabel
                            ? `Premium sinovi ${premiumEndsLabel} gacha faol. E'lonlaringiz ustuvor ko'rsatilmoqda va analitika yoqilgan.`
                            : "Premium sinovi allaqachon faol.",
                        })
                      : isPaidPremiumActive
                        ? pick({
                            ru: premiumEndsLabel
                              ? `Платный Premium активен до ${premiumEndsLabel}. Приоритет и аналитика уже включены для вашего аккаунта.`
                              : "Платный Premium уже активен для вашего аккаунта.",
                            en: premiumEndsLabel
                              ? `Paid Premium is active until ${premiumEndsLabel}. Priority and analytics are already enabled for your account.`
                              : "Paid Premium is already active for your account.",
                            uz: premiumEndsLabel
                              ? `Pullik Premium ${premiumEndsLabel} gacha faol. Ustuvorlik va analitika allaqachon yoqilgan.`
                              : "Pullik Premium allaqachon faol.",
                          })
                        : pick({
                            ru: "Вы можете сначала взять пробную версию на 7 дней или сразу подключить платный Premium на 1 месяц.",
                            en: "You can start with a 7-day trial or activate the paid 1-month Premium right away.",
                            uz: "Avval 7 kunlik sinovni tanlashingiz yoki darhol 1 oylik pullik Premium ni yoqishingiz mumkin.",
                          })}
                  </p>
                </div>
                <div className={`flex h-14 w-14 items-center justify-center rounded-[22px] ${isPremium ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  {isPremium ? <Crown className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
                </div>
              </div>

              {!isPaidPremiumActive ? (
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {pick({ ru: "Выберите формат", en: "Choose your option", uz: "Variantni tanlang" })}
                    </p>
                    <div className="mt-3 grid gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOffer("trial")}
                        className={`rounded-[26px] border p-4 text-left transition-colors ${
                          selectedOffer === "trial"
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-slate-200 bg-white hover:border-emerald-200"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                              {pick({ ru: "Пробная версия", en: "Trial", uz: "Sinov" })}
                            </p>
                            <h3 className="mt-2 text-xl font-black text-slate-950">
                              {pick({ ru: `${PREMIUM_TRIAL_DAYS} дней бесплатно`, en: `${PREMIUM_TRIAL_DAYS} days free`, uz: `${PREMIUM_TRIAL_DAYS} kun bepul` })}
                            </h3>
                            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                              {pick({
                                ru: "Полный Premium без оплаты, чтобы посмотреть приоритет в каталоге и аналитику на реальных событиях.",
                                en: "The full Premium experience without payment, so you can test priority and analytics on real events.",
                                uz: "Katalogdagi ustuvorlik va analitikani haqiqiy tadbirlarda tekshirish uchun to'liq Premium sinovi.",
                              })}
                            </p>
                          </div>
                          <span className="self-start rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-emerald-700 sm:tracking-[0.14em]">
                            {trialUsed
                              ? pick({ ru: "Уже использован", en: "Used already", uz: "Ishlatilgan" })
                              : pick({ ru: "Один раз", en: "One-time", uz: "Bir marta" })}
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedOffer("paid")}
                        className={`rounded-[26px] border p-4 text-left transition-colors ${
                          selectedOffer === "paid"
                            ? "border-amber-300 bg-amber-50"
                            : "border-slate-200 bg-white hover:border-amber-200"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">
                              {pick({ ru: "Платная версия", en: "Paid version", uz: "Pullik versiya" })}
                            </p>
                            <h3 className="mt-2 text-xl font-black text-slate-950">
                              {formatAmount(PREMIUM_PRICE_UZS)} UZS
                            </h3>
                            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                              {pick({
                                ru: "Полный месяц Premium с ручным подтверждением оплаты и приоритетом в ленте.",
                                en: "A full month of Premium with manual payment confirmation and feed priority.",
                                uz: "To'lovni tekshirish orqali 1 oylik Premium va lentadagi ustuvorlik.",
                              })}
                            </p>
                          </div>
                          <span className="self-start rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-amber-700 sm:tracking-[0.14em]">
                            {pick({ ru: "1 месяц", en: "1 month", uz: "1 oy" })}
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {selectedOffer === "trial" ? (
                    <div className="rounded-[28px] border border-emerald-200 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_100%)] p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">
                            {pick({ ru: "Что получите", en: "What you get", uz: "Nima olasiz" })}
                          </p>
                          <h3 className="mt-2 text-2xl font-black text-slate-950">
                            {pick({ ru: "Premium Trial", en: "Premium Trial", uz: "Premium Trial" })}
                          </h3>
                          <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">
                            {pick({
                              ru: "Пробный доступ открывает все Premium-возможности на 7 дней. Если понравится, позже можно перейти на платную версию.",
                              en: "The trial unlocks all Premium features for 7 days. If it works for you, switch to the paid version later.",
                              uz: "Sinov 7 kun davomida barcha Premium imkoniyatlarini ochadi. Ma'qul kelsa, keyin pullik versiyaga o'tishingiz mumkin.",
                            })}
                          </p>
                        </div>
                        <div className="rounded-[18px] bg-white px-4 py-3 text-right shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {pick({ ru: "Стоимость", en: "Price", uz: "Narx" })}
                          </p>
                          <p className="mt-1 text-2xl font-black text-slate-950">0 UZS</p>
                        </div>
                      </div>

                      <div className="mt-5 space-y-3">
                        {user ? (
                          <div className="rounded-[22px] border border-white bg-white/90 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {pick({ ru: "Аккаунт для запуска", en: "Account to activate", uz: "Faollashadigan akkaunt" })}
                            </p>
                            <p className="mt-2 text-sm font-black text-slate-900">
                              {user.email || pick({ ru: "Текущий аккаунт", en: "Current account", uz: "Joriy akkaunt" })}
                            </p>
                          </div>
                        ) : null}

                        {trialUsed && !isTrialActive ? (
                          <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold leading-7 text-slate-600">
                            {pick({
                              ru: "Пробная версия уже использована для этого аккаунта. Ниже можно перейти на платный Premium.",
                              en: "The trial has already been used on this account. You can switch to the paid Premium below.",
                              uz: "Bu akkauntda sinov allaqachon ishlatilgan. Quyida pullik Premium ga o'tishingiz mumkin.",
                            })}
                          </div>
                        ) : null}

                        {isTrialActive ? (
                          <div className="rounded-[22px] border border-emerald-200 bg-white px-4 py-4 text-sm font-semibold leading-7 text-emerald-800">
                            {pick({
                              ru: premiumEndsLabel
                                ? `Пробная версия уже активна до ${premiumEndsLabel}. Если захотите остаться на Premium дольше, переключитесь на платную версию.`
                                : "Пробная версия уже активна.",
                              en: premiumEndsLabel
                                ? `Your trial is active until ${premiumEndsLabel}. If you want to keep Premium longer, switch to the paid version.`
                                : "Your trial is already active.",
                              uz: premiumEndsLabel
                                ? `Sinov ${premiumEndsLabel} gacha faol. Premium ni uzoqroq saqlamoqchi bo'lsangiz, pullik versiyaga o'ting.`
                                : "Sinov allaqachon faol.",
                            })}
                          </div>
                        ) : null}

                        {user ? (
                          <button
                            onClick={handleStartTrial}
                            disabled={isSubmitting || !canStartTrial}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-emerald-500 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-200 disabled:text-emerald-700 sm:px-8 sm:tracking-[0.16em]"
                          >
                            {submitMode === "trial" ? (
                              <>
                                <Loader2 className="hidden h-4 w-4 animate-spin shrink-0 sm:block" />
                                {pick({ ru: "Запускаем...", en: "Starting...", uz: "Ishga tushmoqda..." })}
                              </>
                            ) : canStartTrial ? (
                              <>
                                <Sparkles className="hidden h-4 w-4 shrink-0 sm:block" />
                                {pick({ ru: "Запустить пробную версию", en: "Start trial", uz: "Sinovni yoqish" })}
                              </>
                            ) : (
                              pick({
                                ru: trialUsed ? "Пробная версия уже использована" : "Premium уже активен",
                                en: trialUsed ? "Trial already used" : "Premium already active",
                                uz: trialUsed ? "Sinov ishlatilgan" : "Premium faol",
                              })
                            )}
                          </button>
                        ) : (
                          <Link
                            href="/auth/login?next=/premium"
                            className="inline-flex w-full items-center justify-center rounded-[22px] bg-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-black sm:px-8 sm:tracking-[0.16em]"
                          >
                            {pick({ ru: "Войти и попробовать", en: "Sign in to try", uz: "Sinash uchun kiring" })}
                          </Link>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {!cardReady ? (
                        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold leading-7 text-amber-800">
                          {paidPremiumUnavailableMessage}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {pick({ ru: "Номер карты", en: "Card number", uz: "Karta raqami" })}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <p className="text-base font-black text-slate-900">{formatCardNumber(CARD_NUMBER)}</p>
                              <button
                                type="button"
                                onClick={() => handleCopy(CARD_NUMBER, "card")}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 sm:tracking-[0.14em]"
                              >
                                {copyField === "card" ? <Check className="hidden h-4 w-4 shrink-0 sm:block" /> : <Copy className="hidden h-4 w-4 shrink-0 sm:block" />}
                                {copyField === "card"
                                  ? pick({ ru: "Скопировано", en: "Copied", uz: "Nusxalandi" })
                                  : pick({ ru: "Копировать", en: "Copy", uz: "Nusxa" })}
                              </button>
                            </div>
                          </div>
                          <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {pick({ ru: "Владелец", en: "Card holder", uz: "Karta egasi" })}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <p className="text-base font-black text-slate-900">{CARD_HOLDER}</p>
                              <button
                                type="button"
                                onClick={() => handleCopy(CARD_HOLDER, "holder")}
                                className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 sm:tracking-[0.14em]"
                              >
                                {copyField === "holder" ? <Check className="hidden h-4 w-4 shrink-0 sm:block" /> : <Copy className="hidden h-4 w-4 shrink-0 sm:block" />}
                                {copyField === "holder"
                                  ? pick({ ru: "Скопировано", en: "Copied", uz: "Nusxalandi" })
                                  : pick({ ru: "Копировать", en: "Copy", uz: "Nusxa" })}
                              </button>
                            </div>
                          </div>
                          <div className="rounded-[24px] bg-slate-50 px-4 py-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                              {pick({ ru: "Банк", en: "Bank", uz: "Bank" })}
                            </p>
                            <p className="mt-2 text-base font-black text-slate-900">{CARD_BANK || "—"}</p>
                          </div>
                        </div>
                      )}

                      {cardReady ? (
                        <div>
                          {user ? (
                          <div className="space-y-4">
                            <div className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                {pick({ ru: "Аккаунт для активации", en: "Account to activate", uz: "Faollashadigan akkaunt" })}
                              </p>
                              <p className="mt-2 text-sm font-black text-slate-900">
                                {user.email || pick({ ru: "Текущий аккаунт", en: "Current account", uz: "Joriy akkaunt" })}
                              </p>
                            </div>
                            <div>
                              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                {pick({ ru: "Как найти ваш перевод", en: "How to find your transfer", uz: "O'tkazmani qanday topish" })}
                              </label>
                              <textarea
                                rows={3}
                                value={transferReference}
                                onChange={(event) => setTransferReference(event.target.value)}
                                placeholder={pick({
                                  ru: "Например: ID 22491 или 09:14, карта ****9081",
                                  en: "For example: ID 22491 or 09:14, card ****9081",
                                  uz: "Masalan: ID 22491 yoki 09:14, karta ****9081",
                                })}
                                className="mt-2 w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4 font-bold text-slate-900 outline-none transition-colors focus:border-amber-400 focus:bg-white"
                              />
                            </div>
                            <div>
                              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                {pick({ ru: "Фото чека или файл", en: "Receipt photo or file", uz: "Chek rasmi yoki fayl" })}
                              </label>
                              <label className="mt-2 flex cursor-pointer flex-col items-start gap-3 rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition-colors hover:border-amber-300 hover:bg-white sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
                                    <Paperclip className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900">
                                      {attachmentFile
                                        ? attachmentFile.name
                                        : pick({
                                            ru: "Прикрепить скрин или PDF",
                                            en: "Attach a screenshot or PDF",
                                            uz: "Skrin yoki PDF biriktirish",
                                          })}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                      {pick({
                                        ru: "Необязательно, но это ускорит подтверждение Premium.",
                                        en: "Optional, but it helps confirm Premium faster.",
                                        uz: "Majburiy emas, lekin Premium ni tezroq tasdiqlashga yordam beradi.",
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex self-start items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-700 sm:self-auto sm:tracking-[0.14em]">
                                  <FileText className="hidden h-4 w-4 shrink-0 sm:block" />
                                  {pick({ ru: "Выбрать", en: "Choose", uz: "Tanlash" })}
                                </span>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png,.webp,.pdf"
                                  className="hidden"
                                  onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                                />
                              </label>
                            </div>
                            <details className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                              <summary className="cursor-pointer list-none text-sm font-black text-slate-900">
                                {pick({
                                  ru: "Опционально: добавить контакты или комментарий",
                                  en: "Optional: add contacts or a comment",
                                  uz: "Ixtiyoriy: kontakt yoki izoh qo'shish",
                                })}
                              </summary>
                              <div className="mt-4 space-y-4">
                                <div>
                                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    {pick({ ru: "Имя плательщика", en: "Payer name", uz: "To'lovchi ismi" })}
                                  </label>
                                  <div className="relative mt-2">
                                    <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                      value={payerName}
                                      onChange={(event) => setPayerName(event.target.value)}
                                      className="w-full rounded-[22px] border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-amber-400"
                                    />
                                  </div>
                                </div>
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Email</label>
                                    <div className="relative mt-2">
                                      <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                      <input
                                        type="email"
                                        value={payerEmail}
                                        onChange={(event) => setPayerEmail(event.target.value)}
                                        className="w-full rounded-[22px] border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-amber-400"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                      {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
                                    </label>
                                    <div className="relative mt-2">
                                      <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                      <input
                                        value={contactPhone}
                                        onChange={(event) => setContactPhone(event.target.value)}
                                        className="w-full rounded-[22px] border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-amber-400"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    {pick({ ru: "Комментарий", en: "Comment", uz: "Izoh" })}
                                  </label>
                                  <div className="relative mt-2">
                                    <MessageSquare className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
                                    <textarea
                                      rows={3}
                                      value={note}
                                      onChange={(event) => setNote(event.target.value)}
                                      placeholder={pick({
                                        ru: "Например: название организации или короткая пометка по переводу.",
                                        en: "For example: organization name or a short note about the transfer.",
                                        uz: "Masalan: tashkilot nomi yoki o'tkazma bo'yicha qisqa izoh.",
                                      })}
                                      className="w-full rounded-[22px] border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-amber-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            </details>
                            <div className="space-y-3">
                              {transferUrl ? (
                                <a
                                  href={transferUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-slate-200 bg-white px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-slate-800 transition-colors hover:border-amber-300 hover:text-amber-600 sm:px-8 sm:tracking-[0.16em]"
                                >
                                  <ExternalLink className="hidden h-4 w-4 shrink-0 sm:block" />
                                  {pick({ ru: "Открыть банк", en: "Open bank app", uz: "Bank ilovasini ochish" })}
                                </a>
                              ) : null}
                              <button
                                onClick={handleManualRequest}
                                disabled={isSubmitting || !cardReady}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-amber-500 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-200 disabled:text-amber-700 sm:px-8 sm:tracking-[0.16em]"
                              >
                                {submitMode === "paid" ? (
                                  <>
                                    <Loader2 className="hidden h-4 w-4 animate-spin shrink-0 sm:block" />
                                    {pick({ ru: "Отправляем...", en: "Submitting...", uz: "Yuborilmoqda..." })}
                                  </>
                                ) : (
                                  <>
                                    <ShieldCheck className="hidden h-4 w-4 shrink-0 sm:block" />
                                    {pick({ ru: "Отправить платный Premium на проверку", en: "Submit paid Premium", uz: "Pullik Premium ni yuborish" })}
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <Link
                            href="/auth/login?next=/premium"
                            className="inline-flex w-full items-center justify-center rounded-[22px] bg-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-black sm:px-8 sm:tracking-[0.16em]"
                          >
                            {pick({ ru: "Войти, чтобы оформить", en: "Sign in to continue", uz: "Davom etish uchun kiring" })}
                          </Link>
                        )}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold leading-7 text-amber-800">
                    {pick({
                      ru: premiumEndsLabel
                        ? `Платный Premium уже активен до ${premiumEndsLabel}. Ниже можно отключить его вручную, если нужно.`
                        : "Платный Premium уже активен для этого аккаунта.",
                      en: premiumEndsLabel
                        ? `Paid Premium is already active until ${premiumEndsLabel}. You can disable it manually below if needed.`
                        : "Paid Premium is already active for this account.",
                      uz: premiumEndsLabel
                        ? `Pullik Premium ${premiumEndsLabel} gacha faol. Kerak bo'lsa, quyida qo'lda o'chirishingiz mumkin.`
                        : "Pullik Premium bu akkaunt uchun allaqachon faol.",
                    })}
                  </div>
                  <button
                    onClick={handleDowngrade}
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-slate-900 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-black disabled:opacity-60 sm:px-8 sm:tracking-[0.16em]"
                  >
                    {submitMode === "downgrade" ? (
                      <>
                        <Loader2 className="hidden h-4 w-4 animate-spin shrink-0 sm:block" />
                        {pick({ ru: "Обработка...", en: "Processing...", uz: "Qayta ishlanmoqda..." })}
                      </>
                    ) : (
                      pick({ ru: "Отключить Premium", en: "Disable Premium", uz: "Premium ni o'chirish" })
                    )}
                  </button>
                </div>
              )}
            </aside>
          </div>
        </section>

        <section className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-[32px] border border-slate-100 bg-white p-7 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Free</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">Starter</h2>
                <p className="mt-3 text-base font-semibold leading-8 text-slate-600">
                  {pick({
                    ru: "Подходит для старта, первых событий и проверки спроса без лишних затрат.",
                    en: "Fits an early-stage flow: first events, first traction, and no extra cost.",
                    uz: "Boshlanish bosqichi, ilk tadbirlar va talabni tekshirish uchun mos.",
                  })}
                </p>
                <div className="mt-5 space-y-3">
                  {features.map((feature) => (
                    <div key={`free-${feature.label}`} className="flex items-start gap-3 rounded-[20px] bg-slate-50 px-4 py-3">
                      {feature.freeEnabled ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <div>
                        <p className="text-sm font-black text-slate-900">{feature.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{feature.free}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[32px] border border-amber-200 bg-[linear-gradient(135deg,_#fff7ed_0%,_#ffffff_78%)] p-7 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Premium</p>
                    <h2 className="mt-3 flex items-center gap-2 text-3xl font-black text-slate-950">
                      Pro Organizer <Sparkles className="h-6 w-6 text-amber-500" />
                    </h2>
                  </div>
                  <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                    {pick({ ru: "Trial + платная версия", en: "Trial + paid", uz: "Sinov + pullik" })}
                  </div>
                </div>
                <p className="mt-3 text-base font-semibold leading-8 text-slate-600">
                  {pick({
                    ru: "Для организаторов, которым нужно сначала быстро попробовать Premium, а затем при необходимости перейти на полный платный месяц.",
                    en: "Built for organizers who want to try Premium quickly first and then switch to the full paid month if needed.",
                    uz: "Avval Premium ni tez sinab ko'rib, keyin kerak bo'lsa to'liq pullik oyga o'tmoqchi bo'lgan tashkilotchilar uchun.",
                  })}
                </p>
                <div className="mt-5 space-y-3">
                  {features.map((feature) => (
                    <div key={`premium-${feature.label}`} className="flex items-start gap-3 rounded-[20px] border border-amber-100 bg-white/80 px-4 py-3">
                      {feature.premiumEnabled ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                      )}
                      <div>
                        <p className="text-sm font-black text-slate-900">{feature.label}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{feature.premium}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <section className="rounded-[34px] border border-slate-100 bg-white p-5 shadow-sm md:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {pick({ ru: "Сравнение", en: "Comparison", uz: "Taqqoslash" })}
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">
                {pick({
                  ru: "Где Free заканчивается и начинается Premium",
                  en: "Where Free ends and Premium begins",
                  uz: "Free qayerda tugab, Premium qayerda boshlanadi",
                })}
              </h3>

              <div className="mt-6 space-y-3">
                {features.map((feature) => (
                  <div
                    key={feature.label}
                    className="grid gap-4 rounded-[26px] border border-slate-100 bg-slate-50/70 p-5 md:grid-cols-[minmax(0,1.15fr)_minmax(180px,1fr)_minmax(180px,1fr)]"
                  >
                    <div>
                      <p className="text-base font-black text-slate-950">{feature.label}</p>
                    </div>
                    <div className="rounded-[20px] bg-white px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Free</p>
                      <p className="mt-2 inline-flex items-start gap-2 text-sm font-semibold leading-6 text-slate-600">
                        {feature.freeEnabled ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                        <span>{feature.free}</span>
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-amber-100 bg-amber-50/70 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-600">Premium</p>
                      <p className="mt-2 inline-flex items-start gap-2 text-sm font-semibold leading-6 text-slate-700">
                        {feature.premiumEnabled ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
                        <span>{feature.premium}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {pick({ ru: "Как это работает", en: "How it works", uz: "Bu qanday ishlaydi" })}
              </p>
              <h3 className="mt-3 text-2xl font-black text-slate-950">
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
              <div className="mt-5 space-y-3">
                {activeSteps.map((step, index) => (
                  <div key={step} className="flex gap-3 rounded-[22px] bg-slate-50 px-4 py-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm font-semibold leading-7 text-slate-600">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-emerald-200/80 bg-[linear-gradient(180deg,_#ecfdf5_0%,_#ffffff_100%)] p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
                {pick({ ru: "Важно", en: "Important", uz: "Muhim" })}
              </p>
              <h3 className="mt-3 text-2xl font-black text-slate-950">
                {selectedOffer === "trial"
                  ? pick({
                      ru: "Пробная версия включается сразу",
                      en: "The trial starts instantly",
                      uz: "Sinov darhol yoqiladi",
                    })
                  : pick({
                      ru: "После подтверждения оплаты Premium станет активен",
                      en: "Premium becomes active after payment confirmation",
                      uz: "To'lov tasdiqlangach Premium faollashadi",
                    })}
              </h3>
              <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                {selectedOffer === "trial"
                  ? pick({
                      ru: "Trial даёт те же Premium-функции, что и платная версия, но только на 7 дней и только один раз для одного аккаунта.",
                      en: "The trial gives the same Premium features as the paid version, but only for 7 days and only once per account.",
                      uz: "Sinov pullik versiyadagi Premium funksiyalarini beradi, lekin faqat 7 kun va bitta akkaunt uchun bir marta.",
                    })
                  : pick({
                      ru: "После подтверждения оплаты вы получите приоритет в каталоге, расширенную аналитику и безлимит на публикации.",
                      en: "After payment confirmation, you will get catalog priority, advanced analytics, and unlimited publishing.",
                      uz: "To'lov tasdiqlangach, siz katalogdagi ustuvorlik, kengaytirilgan analitika va cheksiz nashr imkoniyatiga ega bo'lasiz.",
                    })}
              </p>
            </section>
          </div>
        </section>
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
