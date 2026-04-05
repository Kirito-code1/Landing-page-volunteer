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
  ExternalLink,
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
      void loadSummary();
    }, 30000);

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
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_18%,_#dcfce7_0%,_transparent_34%),radial-gradient(circle_at_85%_10%,_#dbeafe_0%,_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_52%,_#f1f5f9_100%)] px-4 py-10 md:py-16">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.2fr_0.8fr] xl:gap-8">
        <section className="overflow-hidden rounded-[34px] border border-white bg-white/90 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,_#052e2b_0%,_#0f766e_48%,_#1d4ed8_100%)] px-6 py-7 text-white md:px-10 md:py-9">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.22em]">
              <HeartHandshake className="h-3.5 w-3.5 shrink-0" />
              {pick({ ru: "Пожертвование", en: "Donation", uz: "Xayriya" })}
            </div>
            <h1 className="mt-5 text-[clamp(2rem,8vw,4.4rem)] font-black uppercase italic leading-[0.95] tracking-tight">
              {pick({
                ru: "Поддержите проект переводом на карту",
                en: "Support the project with a card transfer",
                uz: "Loyihani kartaga o'tkazma bilan qo'llab-quvvatlang",
              })}
            </h1>
            <p className="mt-4 max-w-2xl text-base font-semibold leading-8 text-white/80">
              {pick({
                ru: "Выберите сумму, переведите её на карту и отправьте данные перевода, чтобы мы смогли быстро подтвердить пожертвование.",
                en: "Choose an amount, transfer it to the card, and send the transfer details so we can confirm your donation quickly.",
                uz: "Summani tanlang, uni kartaga o'tkazing va xayriyani tez tasdiqlashimiz uchun o'tkazma ma'lumotini yuboring.",
              })}
            </p>
          </div>

          <div className="px-6 py-6 md:px-10 md:py-8">
            {!cardReady ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold leading-7 text-amber-800">
                {pick({
                  ru: "Пожертвования временно недоступны. Попробуйте позже.",
                  en: "Donations are temporarily unavailable. Please try again later.",
                  uz: "Xayriyalar hozircha mavjud emas. Keyinroq yana urinib ko'ring.",
                })}
              </div>
            ) : null}

            <div className="mb-8 flex flex-wrap items-center gap-2">
              {[
                { key: "amount", label: pick({ ru: "Сумма", en: "Amount", uz: "Summa" }) },
                { key: "confirm", label: pick({ ru: "Перевод", en: "Transfer", uz: "O'tkazma" }) },
              ].map((item, index) => {
                const active = item.key === step || (step === "processing" && index <= 1);

                return (
                  <div key={item.key} className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                        active ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span
                      className={`text-[11px] font-black uppercase tracking-[0.12em] sm:text-xs sm:tracking-[0.18em] ${
                        active ? "text-slate-900" : "text-slate-400"
                      }`}
                    >
                      {item.label}
                    </span>
                    {index < 1 ? <div className="h-px w-5 bg-slate-200" /> : null}
                  </div>
                );
              })}
            </div>

            {step === "amount" ? (
              <div>
                <h2 className="text-2xl font-black text-slate-950">
                  {pick({ ru: "Выберите сумму", en: "Choose an amount", uz: "Summani tanlang" })}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
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
                      className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                        amount === value && !customAmount
                          ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <p className="text-lg font-black leading-none text-slate-950">{formatAmount(value)}</p>
                      <p className="mt-2 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">UZS</p>
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
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
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-black text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                  />
                </div>

                {error ? <p className="mt-4 text-sm font-bold text-red-500">{error}</p> : null}

                <button
                  type="button"
                  onClick={() => {
                    if (cardReady && validateBeforeDetails()) {
                      setStep("confirm");
                    }
                  }}
                  disabled={!cardReady || !selectedAmount || selectedAmount < 1000}
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm sm:tracking-[0.18em]"
                >
                  {cardReady
                    ? pick({ ru: "Далее", en: "Next", uz: "Keyingi" })
                    : pick({ ru: "Недоступно", en: "Unavailable", uz: "Mavjud emas" })}
                  <ArrowRight className="hidden h-4 w-4 shrink-0 sm:block" />
                </button>
              </div>
            ) : null}

            {step === "confirm" ? (
              <div>
                <div className="mb-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep("amount")}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4 text-slate-600" />
                  </button>
                  <h2 className="text-2xl font-black text-slate-950">
                    {pick({ ru: "Перевод и подтверждение", en: "Transfer and confirmation", uz: "O'tkazma va tasdiq" })}
                  </h2>
                </div>

                {!cardReady ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold leading-7 text-amber-800">
                    {paymentUnavailableMessage}
                  </div>
                ) : (
                  <>
                    <div className="rounded-3xl bg-[linear-gradient(145deg,_#111827_0%,_#1f2937_46%,_#0f766e_100%)] p-7 text-white">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                        {pick({ ru: "Сумма пожертвования", en: "Donation amount", uz: "Xayriya summasi" })}
                      </p>
                      <p className="mt-2 text-4xl font-black">{formatAmount(selectedAmount)} UZS</p>

                      <div className="mt-5 grid gap-4 border-t border-white/15 pt-5 md:grid-cols-3">
                        <div className="md:col-span-2">
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                            {pick({ ru: "Номер карты", en: "Card number", uz: "Karta raqami" })}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <p className="text-lg font-black">{formatCardNumber(CARD_NUMBER)}</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(CARD_NUMBER, "card")}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white sm:tracking-[0.14em]"
                            >
                              {copyField === "card" ? <Check className="hidden h-4 w-4 shrink-0 sm:block" /> : <Copy className="hidden h-4 w-4 shrink-0 sm:block" />}
                              {copyField === "card"
                                ? pick({ ru: "Скопировано", en: "Copied", uz: "Nusxalandi" })
                                : pick({ ru: "Копировать", en: "Copy", uz: "Nusxa" })}
                            </button>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                            {pick({ ru: "Банк", en: "Bank", uz: "Bank" })}
                          </p>
                          <p className="mt-2 text-lg font-black">{CARD_BANK || "—"}</p>
                        </div>
                        <div className="md:col-span-3">
                          <p className="text-xs font-black uppercase tracking-[0.22em] text-white/70">
                            {pick({ ru: "Владелец", en: "Card holder", uz: "Karta egasi" })}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <p className="text-lg font-black">{CARD_HOLDER}</p>
                            <button
                              type="button"
                              onClick={() => handleCopy(CARD_HOLDER, "holder")}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-[10px] font-black uppercase tracking-[0.08em] text-white sm:tracking-[0.14em]"
                            >
                              {copyField === "holder" ? <Check className="hidden h-4 w-4 shrink-0 sm:block" /> : <Copy className="hidden h-4 w-4 shrink-0 sm:block" />}
                              {copyField === "holder"
                                ? pick({ ru: "Скопировано", en: "Copied", uz: "Nusxalandi" })
                                : pick({ ru: "Копировать", en: "Copy", uz: "Nusxa" })}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-semibold leading-7 text-emerald-800">
                      {pick({
                        ru: "Скопируйте карту, переведите сумму, укажите данные перевода и отправьте заявку. После проверки статус обновится на странице результата.",
                        en: "Copy the card, send the transfer, add the transfer details, and submit the request. The result page will update after review.",
                        uz: "Kartani nusxalang, summani o'tkazing, o'tkazma ma'lumotini kiriting va so'rov yuboring. Tekshiruvdan keyin natija sahifada yangilanadi.",
                      })}
                    </div>

                    <div className="mt-5">
                      <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {pick({ ru: "Как найти ваш перевод", en: "How to find your transfer", uz: "O'tkazmani qanday topish" })}
                      </label>
                      <div className="relative mt-2">
                        <ShieldCheck className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
                        <textarea
                          rows={3}
                          value={transferReference}
                          onChange={(event) => setTransferReference(event.target.value)}
                          placeholder={pick({
                            ru: "Например: ID 17492 или 14:42, карта ****9081",
                            en: "For example: ID 17492 or 14:42, card ****9081",
                            uz: "Masalan: ID 17492 yoki 14:42, karta ****9081",
                          })}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        {pick({ ru: "Фото чека или файл", en: "Receipt photo or file", uz: "Chek rasmi yoki fayl" })}
                      </label>
                      <label className="mt-2 flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 transition-colors hover:border-emerald-400 hover:bg-white sm:flex-row sm:items-center sm:justify-between">
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
                                ru: "Необязательно, но помогает быстрее подтвердить перевод.",
                                en: "Optional, but helps confirm the transfer faster.",
                                uz: "Majburiy emas, lekin o'tkazmani tezroq tasdiqlashga yordam beradi.",
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

                    <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <summary className="cursor-pointer list-none text-sm font-black text-slate-900">
                        {pick({
                          ru: "Опционально: оставить контакт",
                          en: "Optional: leave contact details",
                          uz: "Ixtiyoriy: kontakt qoldirish",
                        })}
                      </summary>
                      <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                        {pick({
                          ru: "Если хочешь, можешь оставить имя, email, телефон или комментарий. Но это уже не обязательно.",
                          en: "If you want, you can leave your name, email, phone, or a comment. It is no longer required.",
                          uz: "Istasangiz ism, email, telefon yoki izoh qoldirishingiz mumkin. Bu endi majburiy emas.",
                        })}
                      </p>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            {pick({ ru: "Имя", en: "Name", uz: "Ism" })}
                          </label>
                          <div className="relative mt-2">
                            <UserRound className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                              value={donorName}
                              onChange={(event) => setDonorName(event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                              Email
                            </label>
                            <div className="relative mt-2">
                              <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                              {pick({ ru: "Телефон", en: "Phone", uz: "Telefon" })}
                            </label>
                            <div className="relative mt-2">
                              <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                              <input
                                value={contactPhone}
                                onChange={(event) => setContactPhone(event.target.value)}
                                className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                            {pick({ ru: "Комментарий", en: "Comment", uz: "Izoh" })}
                          </label>
                          <div className="relative mt-2">
                            <MessageSquare className="absolute left-4 top-5 h-4 w-4 text-slate-400" />
                            <textarea
                              rows={3}
                              value={note}
                              onChange={(event) => setNote(event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white py-4 pl-11 pr-4 font-bold text-slate-900 outline-none transition-colors focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    </details>

                    {error ? <p className="mt-4 text-sm font-bold text-red-500">{error}</p> : null}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      {transferUrl ? (
                        <a
                          href={transferUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-slate-800 transition-colors hover:border-emerald-300 hover:text-emerald-600 sm:text-sm sm:tracking-[0.18em]"
                        >
                          <ExternalLink className="hidden h-4 w-4 shrink-0 sm:block" />
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
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-4 text-[11px] font-black uppercase tracking-[0.08em] text-white transition-colors hover:bg-emerald-700 sm:col-span-1 sm:text-sm sm:tracking-[0.18em]"
                      >
                        <ShieldCheck className="hidden h-4 w-4 shrink-0 sm:block" />
                        {pick({
                          ru: "Я перевёл, отправить на проверку",
                          en: "I transferred it, send for review",
                          uz: "O'tkazdim, tekshiruvga yuborish",
                        })}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {step === "processing" ? (
              <div className="py-14 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-600" />
                <h2 className="mt-6 text-2xl font-black text-slate-950">
                  {pick({
                    ru: "Отправляем заявку на проверку",
                    en: "Sending the verification request",
                    uz: "Tekshiruv so'rovi yuborilmoqda",
                  })}
                </h2>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  {pick({
                    ru: "Сейчас сайт сохранит данные перевода и откроет страницу статуса, где будет виден итог проверки.",
                    en: "The site is saving the transfer details and will open the status page with the review result.",
                    uz: "Hozir sayt o'tkazma ma'lumotlarini saqlaydi va tekshiruv natijasi ko'rinadigan status sahifasini ochadi.",
                  })}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              {pick({ ru: "Влияние суммы", en: "Impact", uz: "Ta'sir" })}
            </p>
            <h3 className="mt-3 text-3xl font-black text-slate-950">{formatAmount(selectedAmount || 1000)} UZS</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
              {selectedAmount >= 500000
                ? pick({
                    ru: "Покрывает адресную помощь для семьи или крупный набор вещей для одной инициативы.",
                    en: "Can cover targeted support for a family or a large set of supplies for one initiative.",
                    uz: "Bir oilaga manzilli yordam yoki bir tashabbus uchun katta jihozlar to'plamini qoplashi mumkin.",
                  })
                : selectedAmount >= 100000
                  ? pick({
                      ru: "Помогает закрыть базовые продуктовые, медицинские или организационные расходы.",
                      en: "Helps cover essential food, medical, or operational expenses.",
                      uz: "Asosiy oziq-ovqat, tibbiy yoki tashkiliy xarajatlarni yopishga yordam beradi.",
                    })
                  : pick({
                      ru: "Поддерживает ежедневные срочные потребности и небольшие локальные инициативы.",
                      en: "Supports urgent daily needs and smaller local initiatives.",
                      uz: "Shoshilinch kundalik ehtiyojlar va kichik mahalliy tashabbuslarni qo'llab-quvvatlaydi.",
                    })}
            </p>
          </section>

          <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              {pick({ ru: "Месячная цель", en: "Monthly goal", uz: "Oylik maqsad" })}
            </p>
            {summaryLoading ? (
              <div className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                {pick({ ru: "Обновляем прогресс сборов...", en: "Updating donation progress...", uz: "Xayriya progressi yangilanmoqda..." })}
              </div>
            ) : summary ? (
              <>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                  {pick({
                    ru: `Подтверждённые донаты за ${formatMonthLabel(summary.monthLabel, summaryLocale)}.`,
                    en: `Confirmed donations for ${formatMonthLabel(summary.monthLabel, summaryLocale)}.`,
                    uz: `${formatMonthLabel(summary.monthLabel, summaryLocale)} uchun tasdiqlangan xayriyalar.`,
                  })}
                </p>
                <div className="mb-3 mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <p className="text-3xl font-black text-slate-950">{summary.progressPercent}%</p>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">
                    {formatAmount(summary.collectedAmountUzs)} / {formatAmount(summary.goalAmountUzs)}
                  </p>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,_#10b981_0%,_#0ea5e9_100%)] transition-all duration-700"
                    style={{ width: `${summary.progressPercent}%` }}
                  />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {pick({ ru: "Ещё нужно", en: "Still needed", uz: "Yana kerak" })}
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">
                      {formatAmount(summary.remainingAmountUzs)} UZS
                    </p>
                  </div>
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {pick({ ru: "Подтверждено переводов", en: "Approved transfers", uz: "Tasdiqlangan o'tkazmalar" })}
                    </p>
                    <p className="mt-2 text-xl font-black text-slate-950">{summary.approvedPaymentsCount}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="mt-4 text-sm font-bold text-amber-600">{summaryError}</p>
            )}
          </section>

          <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              {pick({ ru: "На что собираем", en: "What we are funding", uz: "Nima uchun yig'moqdamiz" })}
            </p>
            <h3 className="mt-3 text-2xl font-black text-slate-950">{campaign.title}</h3>
            <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{campaign.description}</p>
            <div className="mt-5 space-y-3">
              {campaign.bullets.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-[22px] bg-slate-50 px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[30px] border border-white bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-400">
              {pick({ ru: "Как это работает ", en: "How it works", uz: "Bu qanday ishlaydi" })}
            </p>
            <div className="mt-5 space-y-3">
              {[
                pick({
                  ru: "Вы выбираете сумму и переводите её на карту в своём банковском приложении.",
                  en: "You choose an amount and transfer it to the card in your banking app.",
                  uz: "Siz summani tanlaysiz va uni bank ilovangiz orqali kartaga o'tkazasiz.",
                }),
                pick({
                  ru: "После перевода отправляете данные платежа и, при желании, прикладываете чек.",
                  en: "After the transfer, you send the payment details and can attach a receipt if you want.",
                  uz: "O'tkazmadan keyin to'lov ma'lumotini yuborasiz va xohlasangiz chekni biriktirasiz.",
                }),
                pick({
                  ru: "После проверки вы видите итог на странице статуса, а если вы вошли в аккаунт, результат придёт ещё и в уведомления.",
                  en: "After the review, you see the result on the status page, and if you are signed in, you also get a notification.",
                  uz: "Tekshiruvdan keyin natijani status sahifasida ko'rasiz, akkauntga kirgan bo'lsangiz bildirishnoma ham olasiz.",
                }),
              ].map((item, index) => (
                <div key={item} className="flex gap-3 rounded-[22px] bg-slate-50 px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">
                    {index + 1}
                  </div>
                  <p className="text-sm font-semibold leading-7 text-slate-600">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-start gap-3 rounded-[26px] border border-emerald-200 bg-emerald-50 p-5">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
            <p className="text-sm font-bold leading-7 text-emerald-800">
              {pick({
                ru: "После подтверждения администратором сумма автоматически попадает в месячный прогресс, а статус заявки меняется на странице результата.",
                en: "After the administrator confirms the transfer, the amount is automatically added to the monthly progress and the result page is updated.",
                uz: "Administrator tasdiqlagach, summa avtomatik ravishda oylik progressga qo'shiladi va natija status sahifasida yangilanadi.",
              })}
            </p>
          </section>
        </aside>
      </div>

      <section className="mx-auto mt-8 max-w-6xl rounded-[34px] border border-white bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">
              <Camera className="h-3.5 w-3.5" />
              {pick({ ru: "Фотоотчёты и прозрачность", en: "Photo reports and transparency", uz: "Foto hisobotlar va shaffoflik" })}
            </div>
            <h2 className="mt-4 text-3xl font-black text-slate-950 md:text-4xl">
              {pick({
                ru: "Показываем не только сбор, но и результат",
                en: "Showing not only fundraising, but also results",
                uz: "Faqat yig'imni emas, natijani ham ko'rsatamiz",
              })}
            </h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
              {pick({
                ru: "Здесь публикуются реальные отчёты после подтверждённых закупок и выдач: сумма, краткий результат и фотографии.",
                en: "This area shows real reports after confirmed purchases and distributions: amount, short outcome, and photos.",
                uz: "Bu yerda tasdiqlangan xarid va tarqatishlardan keyingi haqiqiy hisobotlar chiqadi: summa, qisqa natija va fotosuratlar.",
              })}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {pick({ ru: "Отчётов опубликовано", en: "Reports published", uz: "Nashr qilingan hisobotlar" })}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{reportsSummary.totalReports}</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {pick({ ru: "Показано расходов", en: "Reported spending", uz: "Ko'rsatilgan xarajatlar" })}
              </p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatAmount(reportsSummary.totalReportedAmountUzs)} UZS</p>
            </div>
            <div className="rounded-[22px] bg-slate-50 px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                {pick({ ru: "Последний отчёт", en: "Latest report", uz: "So'nggi hisobot" })}
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {reportsSummary.latestReportDate ? formatReportDate(reportsSummary.latestReportDate, locale) : "—"}
              </p>
            </div>
          </div>
        </div>

        {reportsLoading ? (
          <div className="mt-6 flex items-center gap-3 rounded-[24px] bg-slate-50 px-5 py-5 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            {pick({ ru: "Загружаем фотоотчёты...", en: "Loading reports...", uz: "Foto hisobotlar yuklanmoqda..." })}
          </div>
        ) : reportsError ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-5 text-sm font-semibold leading-7 text-amber-800">
            {reportsError}
          </div>
        ) : reports.length > 0 ? (
          <div className="mt-6 grid gap-6 2xl:grid-cols-2">
            {reports.map((report) => (
              <article
                key={report.id}
                className="overflow-hidden rounded-[30px] border border-slate-100 bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)]"
              >
                <div className="grid gap-3 p-3 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative min-h-[250px] overflow-hidden rounded-[24px]">
                    <Image
                      src={report.photos[0].url}
                      alt={report.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1280px) 100vw, 40vw"
                    />
                  </div>
                  <div className="grid gap-3">
                    {report.photos.slice(1, 3).map((photo, index) => (
                      <div key={`${photo.url}-${index}`} className="relative min-h-[119px] overflow-hidden rounded-[20px]">
                        <Image
                          src={photo.url}
                          alt={`${report.title} ${index + 2}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1280px) 100vw, 20vw"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      {formatReportDate(report.reportDate, locale)}
                    </span>
                    {report.location ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {report.location}
                      </span>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-2xl font-black text-slate-950">{report.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">{report.summary}</p>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 sm:col-span-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {pick({ ru: "Сумма отчёта", en: "Reported amount", uz: "Hisobot summasi" })}
                      </p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{formatAmount(report.amountUzs)} UZS</p>
                    </div>
                    {report.metrics.slice(0, 2).map((metric) => (
                      <div key={`${report.id}-${metric.label}`} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {metric.label}
                        </p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-[26px] border border-dashed border-slate-300 bg-slate-50 px-5 py-6">
            <p className="text-lg font-black text-slate-950">
              {pick({
                ru: "Первые реальные отчёты появятся здесь после публикации",
                en: "The first real reports will appear here after publication",
                uz: "Birinchi haqiqiy hisobotlar e'lon qilingandan keyin shu yerda paydo bo'ladi",
              })}
            </p>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-600">
              {pick({
                ru: "Когда команда загрузит фотографии и итог по подтверждённой помощи, этот блок начнёт показывать реальные кейсы.",
                en: "Once the team uploads photos and the outcome of confirmed help, this section will start showing real cases.",
                uz: "Jamoa tasdiqlangan yordam bo'yicha foto va natijani yuklagach, bu blok haqiqiy кейсlarni ko'rsatadi.",
              })}
            </p>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-3xl text-sm font-semibold leading-7 text-slate-600">
            {pick({
              ru: "После каждого подтверждённого кейса здесь публикуются реальные фотографии и итоги. Это помогает донорам видеть не обещания, а фактический результат.",
              en: "After each confirmed case, this area publishes real photos and outcomes. It helps donors see actual results instead of promises.",
              uz: "Har bir tasdiqlangan кейсdan keyin bu yerda haqiqiy foto va natijalar chiqadi. Bu donorларга va'dalar emas, amaldagi natijani ko'rsatadi.",
            })}
          </p>
          <Link
            href="/donate/reports"
            className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-slate-950 px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-emerald-600"
          >
            {pick({ ru: "Открыть все отчёты", en: "Open all reports", uz: "Barcha hisobotlarni ochish" })}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
