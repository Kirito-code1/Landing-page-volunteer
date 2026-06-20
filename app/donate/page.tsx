"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  Copy,
  FileText,
  HeartHandshake,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";
import type { DonationReportRecord, DonationReportsSummary } from "@/lib/donations/reports";

type Step = "amount" | "confirm" | "processing";
type CopyField = "card" | "holder" | null;
type UploadedAttachment = {
  url: string;
  name: string;
  path: string;
};

type DonationSummary = {
  monthLabel: string;
  goalAmountUzs: number;
  collectedAmountUzs: number;
  remainingAmountUzs: number;
  progressPercent: number;
  approvedPaymentsCount: number;
};

type DonationReportsResponse = {
  reports: DonationReportRecord[];
  summary: DonationReportsSummary;
  error?: string;
};

const AMOUNTS = [10000, 50000, 100000, 250000, 500000, 1000000];
const CARD_NUMBER = process.env.NEXT_PUBLIC_DONATION_CARD_NUMBER ?? "";
const CARD_HOLDER = process.env.NEXT_PUBLIC_DONATION_CARD_HOLDER ?? "";
const CARD_BANK = process.env.NEXT_PUBLIC_DONATION_CARD_BANK ?? "";
const TRANSFER_URL_TEMPLATE = process.env.NEXT_PUBLIC_DONATION_CARD_TRANSFER_URL_TEMPLATE ?? "";

const DONATION_CAMPAIGN = {
  ru: {
    title: "Весенний резерв помощи",
    description:
      "Сейчас собираем средства на продуктовые наборы, базовые гигиенические пакеты и транспорт для выездов волонтёров по срочным заявкам.",
    bullets: [
      "Продуктовые наборы для семей в сложной ситуации",
      "Гигиенические и медицинские расходники",
      "Транспорт и логистика для выездных команд",
    ],
  },
  en: {
    title: "Spring support reserve",
    description:
      "We are currently raising funds for food kits, basic hygiene packs, and volunteer transport for urgent field requests.",
    bullets: [
      "Food kits for families in need",
      "Hygiene and basic medical supplies",
      "Transport and logistics for volunteer teams",
    ],
  },
  uz: {
    title: "Bahorgi yordam zaxirasi",
    description:
      "Hozir oziq-ovqat to'plamlari, asosiy gigiyena paketlari va shoshilinch so'rovlar uchun volontyorlar transportiga mablag' yig'moqdamiz.",
    bullets: [
      "Qiyin vaziyatdagi oilalar uchun oziq-ovqat to'plamlari",
      "Gigiyena va asosiy tibbiy sarf materiallari",
      "Volontyor jamoalari uchun transport va logistika",
    ],
  },
} as const;

function formatAmount(value: number) {
  return value.toLocaleString("ru-RU");
}

function formatMonthLabel(value: string, locale: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return value;
  }

  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

function formatReportDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(
    locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU",
    { day: "2-digit", month: "long", year: "numeric" },
  );
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
    "{returnUrl}": `${options.origin}/donate/success`,
    "{cancelUrl}": `${options.origin}/donate`,
    "{origin}": options.origin,
    "{provider}": "manual-card",
    "{card}": options.card.replace(/\s+/g, ""),
  };

  return Object.entries(replacements).reduce((result, [token, value]) => {
    return result.split(token).join(encodeURIComponent(value));
  }, template);
}

export default function DonatePage() {
  const { locale, pick } = useLanguage();
  const router = useRouter();
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState<number>(0);
  const [customAmount, setCustomAmount] = useState("");
  const [donorName, setDonorName] = useState("");
  const [email, setEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [transferReference, setTransferReference] = useState("");
  const [note, setNote] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyField, setCopyField] = useState<CopyField>(null);
  const [summary, setSummary] = useState<DonationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [reports, setReports] = useState<DonationReportRecord[]>([]);
  const [reportsSummary, setReportsSummary] = useState<DonationReportsSummary>({
    totalReports: 0,
    totalReportedAmountUzs: 0,
    latestReportDate: null,
  });
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<string | null>(null);

  const selectedAmount = useMemo(() => {
    const cleaned = customAmount.replace(/\D/g, "");
    return cleaned ? Number(cleaned) : amount;
  }, [amount, customAmount]);

  const cardReady = Boolean(CARD_NUMBER.trim() && CARD_HOLDER.trim());
  const transferUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return fillTransferTemplate(TRANSFER_URL_TEMPLATE, {
      amount: selectedAmount || 1000,
      card: CARD_NUMBER,
      email,
      orderId: `manual-donation-${Date.now()}`,
      origin: window.location.origin,
    });
  }, [email, selectedAmount]);
  const summaryLocale = locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU";
  const campaign = DONATION_CAMPAIGN[locale];
  const paymentUnavailableMessage = pick({
    ru: "Пожертвования временно недоступны. Для перевода ещё не настроены реквизиты карты.",
    en: "Donations are temporarily unavailable because the transfer card details are not configured yet.",
    uz: "Xayriyalar hozircha mavjud emas, chunki karta rekvizitlari hali sozlanmagan.",
  });

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      try {
        setSummaryLoading(true);
        const response = await fetch("/api/donations/summary", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | (DonationSummary & { error?: string })
          | null;

        if (!response.ok || !payload) {
          throw new Error(
            payload?.error ||
              pick({
                ru: "Не удалось загрузить прогресс пожертвований.",
                en: "Could not load donation progress.",
                uz: "Xayriya progressini yuklab bo'lmadi.",
              }),
          );
        }

        if (cancelled) return;
        setSummary({
          monthLabel: payload.monthLabel,
          goalAmountUzs: payload.goalAmountUzs,
          collectedAmountUzs: payload.collectedAmountUzs,
          remainingAmountUzs: payload.remainingAmountUzs,
          progressPercent: payload.progressPercent,
          approvedPaymentsCount: payload.approvedPaymentsCount,
        });
        setSummaryError(null);
      } catch (loadError) {
        if (cancelled) return;
        setSummary(null);
        setSummaryError(
          loadError instanceof Error
            ? loadError.message
            : pick({
                ru: "Не удалось загрузить прогресс пожертвований.",
                en: "Could not load donation progress.",
                uz: "Xayriya progressini yuklab bo'lmadi.",
              }),
        );
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    };

    void loadSummary();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadSummary();
      }
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [pick]);

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        setReportsLoading(true);
        const response = await fetch("/api/donations/reports?limit=2", {
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as DonationReportsResponse | null;
        if (!response.ok || !payload) {
          throw new Error(
            payload?.error ||
              pick({
                ru: "Не удалось загрузить фотоотчёты.",
                en: "Could not load donation reports.",
                uz: "Foto hisobotlarni yuklab bo'lmadi.",
              }),
          );
        }

        if (cancelled) {
          return;
        }

        setReports(payload.reports ?? []);
        setReportsSummary(
          payload.summary ?? {
            totalReports: 0,
            totalReportedAmountUzs: 0,
            latestReportDate: null,
          },
        );
        setReportsError(null);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setReports([]);
        setReportsSummary({
          totalReports: 0,
          totalReportedAmountUzs: 0,
          latestReportDate: null,
        });
        setReportsError(
          loadError instanceof Error
            ? loadError.message
            : pick({
                ru: "Не удалось загрузить фотоотчёты.",
                en: "Could not load donation reports.",
                uz: "Foto hisobotlarni yuklab bo'lmadi.",
              }),
        );
      } finally {
        if (!cancelled) {
          setReportsLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [pick]);

  const handleCustomChange = (value: string) => {
    setCustomAmount(value.replace(/\D/g, ""));
    setAmount(0);
    setError(null);
  };

  const validateBeforeDetails = () => {
    if (!selectedAmount || selectedAmount < 1000) {
      setError(
        pick({
          ru: "Минимальная сумма пожертвования: 1 000 сум.",
          en: "The minimum donation is 1,000 UZS.",
          uz: "Minimal xayriya summasi: 1 000 so'm.",
        }),
      );
      return false;
    }

    setError(null);
    return true;
  };

  const validateBeforeConfirm = () => {
    if (!validateBeforeDetails()) {
      return false;
    }

    if (!transferReference.trim()) {
      setError(
        pick({
          ru: "Укажите, как найти ваш перевод: ID операции, время или последние 4 цифры карты.",
          en: "Explain how to find your transfer: operation ID, time, or last 4 card digits.",
          uz: "O'tkazmani qanday topishni yozing: operatsiya ID, vaqt yoki kartaning oxirgi 4 raqami.",
        }),
      );
      return false;
    }

    if (!cardReady) {
      setError(
        pick({
          ru: "Пожертвования временно недоступны. Попробуйте позже.",
          en: "Donations are temporarily unavailable. Please try again later.",
          uz: "Xayriyalar hozircha mavjud emas. Keyinroq yana urinib ko'ring.",
        }),
      );
      return false;
    }

    setError(null);
    return true;
  };

  const uploadAttachment = async () => {
    if (!attachmentFile) {
      return null;
    }

    const formData = new FormData();
    formData.append("kind", "donation");
    formData.append("file", attachmentFile);

    const response = await fetch("/api/manual-payments/upload", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | { file?: UploadedAttachment; error?: string }
      | null;

    if (!response.ok || !payload?.file) {
      throw new Error(
        payload?.error ||
          pick({
            ru: "Не удалось загрузить вложение.",
            en: "Could not upload the attachment.",
            uz: "Biriktirma yuklanmadi.",
          }),
      );
    }

    return payload.file;
  };

  const handleCopy = async (value: string, field: Exclude<CopyField, null>) => {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyField(field);
      window.setTimeout(() => setCopyField(null), 1500);
    } catch {
      setError(
        pick({
          ru: "Не удалось скопировать значение.",
          en: "Could not copy the value.",
          uz: "Qiymatni nusxalab bo'lmadi.",
        }),
      );
    }
  };

  const submitManualRequest = async () => {
    if (!validateBeforeConfirm()) {
      return;
    }

    try {
      setStep("processing");
      setError(null);
      const attachment = await uploadAttachment();

      const response = await fetch("/api/manual-payments/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "donation",
          amount: selectedAmount,
          payerName: donorName.trim() || undefined,
          payerEmail: email.trim() || undefined,
          contactPhone: contactPhone.trim() || undefined,
          transferReference: transferReference.trim(),
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentPath: attachment?.path,
          note: note.trim() || undefined,
          locale,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { requestId?: string; error?: string }
        | null;

      if (!response.ok || !payload?.requestId) {
        throw new Error(
          payload?.error ||
            pick({
              ru: "Не удалось отправить заявку на проверку.",
              en: "Could not submit the verification request.",
              uz: "Tekshiruv so'rovini yuborib bo'lmadi.",
            }),
        );
      }

      router.push(`/donate/success?request=${encodeURIComponent(payload.requestId)}`);
    } catch (submitError) {
      setStep("confirm");
      setError(
        submitError instanceof Error
          ? submitError.message
          : pick({
              ru: "Не удалось отправить данные о переводе.",
              en: "Could not submit transfer details.",
              uz: "O'tkazma ma'lumotlarini yuborib bo'lmadi.",
            }),
      );
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 md:py-16">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:gap-8">
        
        {/* Left Column: Form */}
        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-8 md:px-10 md:py-10">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 mb-4">
              <HeartHandshake className="h-4 w-4" />
              {pick({ ru: "Пожертвование", en: "Donation", uz: "Xayriya" })}
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              {pick({
                ru: "Поддержите проект переводом",
                en: "Support the project with a transfer",
                uz: "Loyihani o'tkazma bilan qo'llab-quvvatlang",
              })}
            </h1>
            <p className="mt-3 text-slate-500 max-w-xl">
              {pick({
                ru: "Выберите сумму, переведите её на карту и отправьте данные, чтобы мы подтвердили пожертвование.",
                en: "Choose an amount, transfer it to the card, and send the details so we can confirm your donation.",
                uz: "Summani tanlang, kartaga o'tkazing va xayriyani tasdiqlashimiz uchun ma'lumotni yuboring.",
              })}
            </p>
          </div>

          <div className="px-6 py-6 md:px-10 md:py-8">
            {!cardReady ? (
              <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                {pick({
                  ru: "Пожертвования временно недоступны. Попробуйте позже.",
                  en: "Donations are temporarily unavailable. Please try again later.",
                  uz: "Xayriyalar hozircha mavjud emas. Keyinroq yana urinib ko'ring.",
                })}
              </div>
            ) : null}

            {/* Steps Indicator */}
            <div className="mb-8 flex items-center gap-3">
              {[
                { key: "amount", label: pick({ ru: "Сумма", en: "Amount", uz: "Summa" }) },
                { key: "confirm", label: pick({ ru: "Перевод", en: "Transfer", uz: "O'tkazma" }) },
              ].map((item, index) => {
                const active = item.key === step || (step === "processing" && index <= 1);

                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                        active ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className={`text-sm font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>
                      {item.label}
                    </span>
                    {index < 1 ? <div className="h-px w-8 bg-slate-200" /> : null}
                  </div>
                );
              })}
            </div>

            {step === "amount" ? (
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {pick({ ru: "Выберите сумму", en: "Choose an amount", uz: "Summani tanlang" })}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {pick({ ru: "Минимум: 1 000 сум", en: "Minimum: 1,000 UZS", uz: "Minimal: 1 000 so'm" })}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAmount(value);
                        setCustomAmount("");
                        setError(null);
                      }}
                      className={`rounded-xl border px-4 py-4 text-left transition-colors ${
                        amount === value && !customAmount
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-lg font-bold text-slate-900">{formatAmount(value)}</p>
                      <p className="mt-1 text-xs text-slate-500">UZS</p>
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {pick({ ru: "Своя сумма", en: "Custom amount", uz: "O'z summangiz" })}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customAmount ? formatAmount(Number(customAmount)) : ""}
                    onChange={(event) => handleCustomChange(event.target.value)}
                    placeholder={pick({
                      ru: "Например: 75 000",
                      en: "Example: 75,000",
                      uz: "Masalan: 75 000",
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => {
                    if (cardReady && validateBeforeDetails()) {
                      setStep("confirm");
                    }
                  }}
                  disabled={!cardReady || !selectedAmount || selectedAmount < 1000}
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {cardReady
                    ? pick({ ru: "Далее", en: "Next", uz: "Keyingi" })
                    : pick({ ru: "Недоступно", en: "Unavailable", uz: "Mavjud emas" })}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}

            {step === "confirm" ? (
              <div>
                <div className="mb-6 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("amount")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <h2 className="text-xl font-bold text-slate-900">
                    {pick({ ru: "Перевод и подтверждение", en: "Transfer and confirmation", uz: "O'tkazma va tasdiq" })}
                  </h2>
                </div>

                {!cardReady ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                    {paymentUnavailableMessage}
                  </div>
                ) : (
                  <>
                    {/* Card Details */}
                    <div className="bg-slate-900 rounded-xl p-6 text-white">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">
                        {pick({ ru: "Сумма пожертвования", en: "Donation amount", uz: "Xayriya summasi" })}
                      </p>
                      <p className="mt-2 text-3xl font-bold">{formatAmount(selectedAmount)} UZS</p>

                      <div className="mt-5 pt-5 border-t border-slate-700 space-y-4">
                        <div>
                          <p className="text-xs text-slate-400 uppercase tracking-wider">
                            {pick({ ru: "Номер карты", en: "Card number", uz: "Karta raqami" })}
                          </p>
                          <div className="mt-2 flex items-center gap-3">
                            <p className="text-lg font-semibold tracking-wider">{formatCardNumber(CARD_NUMBER)}</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(CARD_NUMBER, "card")}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2.5 text-xs text-slate-300 hover:text-white transition-colors"
                            >
                              {copyField === "card" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                              {copyField === "card"
                                ? pick({ ru: "Скопировано", en: "Copied", uz: "Nusxalandi" })
                                : pick({ ru: "Копировать", en: "Copy", uz: "Nusxa" })}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">
                              {pick({ ru: "Владелец", en: "Card holder", uz: "Karta egasi" })}
                            </p>
                            <div className="mt-2 flex items-center gap-3">
                              <p className="text-base font-medium">{CARD_HOLDER}</p>
                              <button
                                type="button"
                                onClick={() => handleCopy(CARD_HOLDER, "holder")}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-2.5 text-xs text-slate-300 hover:text-white transition-colors"
                              >
                                {copyField === "holder" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                {copyField === "holder"
                                  ? pick({ ru: "Скопировано", en: "Copied", uz: "Nusxalandi" })
                                  : pick({ ru: "Копировать", en: "Copy", uz: "Nusxa" })}
                              </button>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider">
                              {pick({ ru: "Банк", en: "Bank", uz: "Bank" })}
                            </p>
                            <p className="mt-2 text-base font-medium">{CARD_BANK || "—"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
                      {pick({
                        ru: "Переведите сумму на карту, укажите данные перевода и отправьте заявку.",
                        en: "Transfer the amount to the card, add the transfer details, and submit the request.",
                        uz: "Summani kartaga o'tkazing, o'tkazma ma'lumotini kiriting va so'rov yuboring.",
                      })}
                    </div>

                    <div className="mt-5">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {pick({ ru: "Как найти ваш перевод", en: "How to find your transfer", uz: "O'tkazmani qanday topish" })}
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <textarea
                          rows={3}
                          value={transferReference}
                          onChange={(event) => setTransferReference(event.target.value)}
                          placeholder={pick({
                            ru: "Например: ID 17492 или 14:42, карта ****9081",
                            en: "For example: ID 17492 or 14:42, card ****9081",
                            uz: "Masalan: ID 17492 yoki 14:42, karta ****9081",
                          })}
                          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        {pick({ ru: "Фото чека или файл", en: "Receipt photo or file", uz: "Chek rasmi yoki fayl" })}
                      </label>
                      <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 transition-colors hover:border-emerald-400">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
                          <Paperclip className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">
                            {attachmentFile
                              ? attachmentFile.name
                              : pick({
                                  ru: "Прикрепить скрин или PDF",
                                  en: "Attach a screenshot or PDF",
                                  uz: "Skrin yoki PDF biriktirish",
                                })}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {pick({
                              ru: "Необязательно, но ускоряет подтверждение",
                              en: "Optional, but speeds up confirmation",
                              uz: "Majburiy emas, lekin tasdiqlashni tezlashtiradi",
                            })}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                          <FileText className="h-3.5 w-3.5" />
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

                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-slate-700 hover:text-slate-900">
                        {pick({
                          ru: "Опционально: оставить контакт",
                          en: "Optional: leave contact details",
                          uz: "Ixtiyoriy: kontakt qoldirish",
                        })}
                      </summary>
                      <div className="mt-4 space-y-4 pt-4 border-t border-slate-100">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            {pick({ ru: "Имя", en: "Name", uz: "Ism" })}
                          </label>
                          <div className="relative">
                            <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              value={donorName}
                              onChange={(event) => setDonorName(event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                              {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
                            </label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                value={contactPhone}
                                onChange={(event) => setContactPhone(event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            {pick({ ru: "Комментарий", en: "Comment", uz: "Izoh" })}
                          </label>
                          <div className="relative">
                            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <textarea
                              rows={2}
                              value={note}
                              onChange={(event) => setNote(event.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </details>

                    {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {transferUrl ? (
                        <a
                          href={transferUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                          {pick({
                            ru: "Открыть банк",
                            en: "Open bank app",
                            uz: "Bank ilovasini ochish",
                          })}
                        </a>
                      ) : null}
                      <button
                        type="button"
                        onClick={submitManualRequest}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 sm:col-span-1"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        {pick({
                          ru: "Я перевёл, отправить",
                          en: "I transferred it, submit",
                          uz: "O'tkazdim, yuborish",
                        })}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {step === "processing" ? (
              <div className="py-16 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
                <h2 className="mt-6 text-xl font-bold text-slate-900">
                  {pick({
                    ru: "Отправляем заявку...",
                    en: "Sending the request...",
                    uz: "So'rov yuborilmoqda...",
                  })}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {pick({
                    ru: "Сохраняем данные перевода для проверки.",
                    en: "Saving transfer details for review.",
                    uz: "Tekshirish uchun o'tkazma ma'lumotlari saqlanmoqda.",
                  })}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        {/* Right Column: Sidebar */}
        <aside className="space-y-6">
          
          {/* Campaign Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-slate-900">{campaign.title}</h3>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{campaign.description}</p>
            <ul className="mt-5 space-y-3">
              {campaign.bullets.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-slate-600">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Monthly Goal */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">
              {pick({ ru: "Месячная цель", en: "Monthly goal", uz: "Oylik maqsad" })}
            </h3>
            {summaryLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                {pick({ ru: "Загрузка...", en: "Loading...", uz: "Yuklanmoqda..." })}
              </div>
            ) : summary ? (
              <>
                <p className="text-sm text-slate-500 mb-3">
                  {pick({
                    ru: `Прогресс за ${formatMonthLabel(summary.monthLabel, summaryLocale)}`,
                    en: `Progress for ${formatMonthLabel(summary.monthLabel, summaryLocale)}`,
                    uz: `${formatMonthLabel(summary.monthLabel, summaryLocale)} progressi`,
                  })}
                </p>
                <div className="flex items-end justify-between mb-2">
                  <p className="text-3xl font-bold text-slate-900">{summary.progressPercent}%</p>
                  <p className="text-xs text-slate-500">
                    {formatAmount(summary.collectedAmountUzs)} / {formatAmount(summary.goalAmountUzs)} UZS
                  </p>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${summary.progressPercent}%` }}
                  />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      {pick({ ru: "Ещё нужно", en: "Still needed", uz: "Yana kerak" })}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {formatAmount(summary.remainingAmountUzs)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">
                      {pick({ ru: "Переводов", en: "Transfers", uz: "O'tkazmalar" })}
                    </p>
                    <p className="mt-1 text-base font-semibold text-slate-900">{summary.approvedPaymentsCount}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-amber-600">{summaryError}</p>
            )}
          </div>

          <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">
              {pick({
                ru: "После проверки сумма автоматически попадёт в прогресс.",
                en: "After review, the amount will be automatically added to the progress.",
                uz: "Tekshiruvdan so'ng summa avtomatik progressga qo'shiladi.",
              })}
            </p>
          </div>
        </aside>
      </div>

      {/* Bottom Column: Reports */}
      <section className="mx-auto mt-8 max-w-6xl bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            {pick({
              ru: "Фотоотчёты",
              en: "Photo reports",
              uz: "Foto hisobotlar",
            })}
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            {pick({
              ru: "Публикуем реальные отчёты после подтверждённых закупок и выдач.",
              en: "We publish real reports after confirmed purchases and distributions.",
              uz: "Tasdiqlangan xarid va tarqatishlardan keyin haqiqiy hisobotlarni nashr qilamiz.",
            })}
          </p>
        </div>

        {reportsLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            {pick({ ru: "Загружаем отчёты...", en: "Loading reports...", uz: "Hisobotlar yuklanmoqda..." })}
          </div>
        ) : reportsError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
            {reportsError}
          </div>
        ) : reports.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {reports.map((report) => (
              <article
                key={report.id}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="grid gap-1.5 p-1.5 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative min-h-[200px] overflow-hidden rounded-lg">
                    <Image
                      src={report.photos[0].url}
                      alt={report.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 40vw"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    {report.photos.slice(1, 3).map((photo, index) => (
                      <div key={`${photo.url}-${index}`} className="relative min-h-[97px] overflow-hidden rounded-lg">
                        <Image
                          src={photo.url}
                          alt={`${report.title} ${index + 2}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 20vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{formatReportDate(report.reportDate, locale)}</span>
                    {report.location ? (
                      <>
                        <span>·</span>
                        <span>{report.location}</span>
                      </>
                    ) : null}
                  </div>

                  <h3 className="mt-2 text-lg font-bold text-slate-900">{report.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{report.summary}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">
                        {pick({ ru: "Сумма", en: "Amount", uz: "Summa" })}
                      </p>
                      <p className="mt-1 text-base font-semibold text-slate-900">{formatAmount(report.amountUzs)} UZS</p>
                    </div>
                    {report.metrics.slice(0, 2).map((metric) => (
                      <div key={`${report.id}-${metric.label}`}>
                        <p className="text-xs text-slate-500">{metric.label}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-slate-300 rounded-xl px-5 py-8 text-center">
            <p className="text-sm font-medium text-slate-900">
              {pick({
                ru: "Первые отчёты появятся здесь после публикации",
                en: "The first reports will appear here after publication",
                uz: "Birinchi hisobotlar e'lon qilingandan keyin shu yerda paydo bo'ladi",
              })}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {pick({
                ru: "Когда команда загрузит итоги по подтверждённой помощи.",
                en: "Once the team uploads the outcomes of confirmed help.",
                uz: "Jamoa tasdiqlangan yordam bo'yicha natijalarni yuklaganda.",
              })}
            </p>
          </div>
        )}

        {reports.length > 0 ? (
          <div className="mt-8 text-center">
            <Link
              href="/donate/reports"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              {pick({ ru: "Открыть все отчёты", en: "Open all reports", uz: "Barcha hisobotlarni ochish" })}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}